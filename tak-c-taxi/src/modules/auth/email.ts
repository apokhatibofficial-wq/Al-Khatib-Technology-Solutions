import { env } from "../../config/env.js";

// Real transactional email via Resend's REST API (https://resend.com/docs/api-reference/emails/send-email)
// — a plain fetch call, no SDK, matching this project's existing style for
// small external HTTP APIs (geo/osrm.ts, geo/nominatim.ts). Picked over an
// SMS gateway (the architecture doc's original §5 plan) because a
// Syria-reachable SMS provider is a real operational blocker; a
// transactional email API is not — see the phase-9-follow-up note in
// prisma/schema.prisma's User.email field. Resend specifically: a single
// API key, a free tier with no card required, and DNS-based domain
// verification is optional for its own onboarding@resend.dev sender (only
// needed once sending from the project's own domain).
const RESEND_API_URL = "https://api.resend.com/emails";

export class EmailSendError extends Error {}

export async function sendOtpEmail(toEmail: string, code: string): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.EMAIL_PROVIDER_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM_ADDRESS,
      to: [toEmail],
      subject: `${code} — Tak-C.taxi verification code`,
      text: `Your Tak-C.taxi verification code is ${code}. It expires in 5 minutes. If you didn't request this, ignore this email.`,
      html: `<p>Your Tak-C.taxi verification code is <strong>${code}</strong>.</p><p>It expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailSendError(`Resend API returned ${res.status}: ${body}`);
  }
}
