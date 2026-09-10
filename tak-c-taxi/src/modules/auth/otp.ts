import { randomInt, createHmac } from "node:crypto";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";

const CODE_TTL_MS = 5 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

type Logger = { info: (obj: unknown, msg?: string) => void };

function hashCode(phone: string, code: string): string {
  // Domain-separated HMAC, keyed on the access-token secret (no separate
  // OTP secret exists in the architecture doc's env list — see .env.example).
  return createHmac("sha256", env.JWT_ACCESS_SECRET).update(`otp:${phone}:${code}`).digest("hex");
}

/**
 * No real SMS vendor is wired yet (the doc names only a generic
 * OTP_PROVIDER_KEY, no specific provider). In development this logs the
 * code instead of sending it. In production env.ts already refuses to boot
 * without OTP_PROVIDER_KEY set, so reaching here in prod is a real gap to
 * fill in, not something to paper over with a fake "sent" response.
 */
async function sendOtpCode(phone: string, code: string, log: Logger): Promise<void> {
  if (!env.OTP_PROVIDER_KEY) {
    log.info({ phone, code }, "[dev] OTP code (no SMS provider configured — logging instead of sending)");
    return;
  }
  throw new Error(
    "OTP_PROVIDER_KEY is set but no SMS provider integration is implemented yet — wire the actual vendor API call in sendOtpCode().",
  );
}

export class OtpRateLimitError extends Error {}

export async function requestOtp(phone: string, log: Logger): Promise<void> {
  const now = new Date();
  const recent = await prisma.otpRequest.findMany({
    where: { phone, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    take: MAX_REQUESTS_PER_HOUR,
  });

  if (recent.length > 0 && now.getTime() - recent[0]!.createdAt.getTime() < REQUEST_COOLDOWN_MS) {
    throw new OtpRateLimitError("Please wait before requesting another code.");
  }
  if (recent.length >= MAX_REQUESTS_PER_HOUR) {
    throw new OtpRateLimitError("Too many codes requested for this number. Try again later.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpRequest.create({
    data: {
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });

  await sendOtpCode(phone, code, log);
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const pending = await prisma.otpRequest.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) return false;
  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const matches = pending.codeHash === hashCode(phone, code);

  await prisma.otpRequest.update({
    where: { id: pending.id },
    data: matches ? { consumedAt: new Date() } : { attempts: { increment: 1 } },
  });

  return matches;
}
