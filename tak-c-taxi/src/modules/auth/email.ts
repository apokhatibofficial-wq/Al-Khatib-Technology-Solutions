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
      subject: `🚕 كودك: ${code}`,
      text: `هاي! 👋\n\nكود الدخول لتطبيق Tak-C.taxi هو: ${code}\n\nبينتهي بعد 5 دقايق، خليك سريع ⏱️\n\nما طلبت هالكود؟ تجاهل الإيميل، ما في داعي تعمل أي شي.`,
      html: `<div dir="rtl" style="font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <p style="font-size: 16px;">هاي! 👋</p>
        <p style="font-size: 16px;">كود الدخول لتطبيق <strong>Tak-C.taxi</strong> هو:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #555;">بينتهي بعد 5 دقايق، خليك سريع ⏱️</p>
        <p style="font-size: 13px; color: #888;">ما طلبت هالكود؟ تجاهل الإيميل، ما في داعي تعمل أي شي.</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailSendError(`Resend API returned ${res.status}: ${body}`);
  }
}
