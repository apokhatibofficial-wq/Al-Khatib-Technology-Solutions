import { randomInt, createHmac } from "node:crypto";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { sendOtpEmail } from "./email.js";

const CODE_TTL_MS = 5 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

type Logger = { info: (obj: unknown, msg?: string) => void };

function hashCode(email: string, code: string): string {
  // Domain-separated HMAC, keyed on the access-token secret (no separate
  // OTP secret exists in the architecture doc's env list — see .env.example).
  return createHmac("sha256", env.JWT_ACCESS_SECRET).update(`otp:${email}:${code}`).digest("hex");
}

/**
 * Real email delivery via Resend (see email.ts). In development, without
 * EMAIL_PROVIDER_KEY configured, logs the code instead of sending it. In
 * production env.ts already refuses to boot without EMAIL_PROVIDER_KEY set,
 * so reaching the "not configured" branch in prod can't happen.
 */
async function sendOtpCode(email: string, code: string, log: Logger): Promise<void> {
  if (!env.EMAIL_PROVIDER_KEY) {
    log.info({ email, code }, "[dev] OTP code (no email provider configured — logging instead of sending)");
    return;
  }
  await sendOtpEmail(email, code);
}

export class OtpRateLimitError extends Error {}

export async function requestOtp(email: string, log: Logger): Promise<void> {
  const now = new Date();
  const recent = await prisma.otpRequest.findMany({
    where: { email, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    take: MAX_REQUESTS_PER_HOUR,
  });

  if (recent.length > 0 && now.getTime() - recent[0]!.createdAt.getTime() < REQUEST_COOLDOWN_MS) {
    throw new OtpRateLimitError("Please wait before requesting another code.");
  }
  if (recent.length >= MAX_REQUESTS_PER_HOUR) {
    throw new OtpRateLimitError("Too many codes requested for this address. Try again later.");
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.otpRequest.create({
    data: {
      email,
      codeHash: hashCode(email, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });

  await sendOtpCode(email, code, log);
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const pending = await prisma.otpRequest.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) return false;
  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) return false;

  const matches = pending.codeHash === hashCode(email, code);

  await prisma.otpRequest.update({
    where: { id: pending.id },
    data: matches ? { consumedAt: new Date() } : { attempts: { increment: 1 } },
  });

  return matches;
}
