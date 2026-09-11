import { env } from "../../config/env.js";
import { LOGO_DATA_URI } from "./logo.js";

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
      text: `السلام عليكم 👋\n\nهادا كودك يا غالي: ${code}\n\nبينتهي بعد 5 دقايق، خليك سريع ⏱️\n\nما طلبت هالكود؟ تجاهل الإيميل، ما في داعي تعمل أي شي.`,
      html: `<div style="margin: 0; padding: 32px 16px; background: #f3f3f5; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;">
        <div dir="rtl" style="max-width: 420px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px 28px; border: 1px solid #ececef;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${LOGO_DATA_URI}" alt="Tak-C.taxi" width="180" style="max-width: 180px; height: auto;" />
          </div>
          <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 8px;">السلام عليكم 👋</p>
          <p style="font-size: 16px; color: #1a1a1a; margin: 0 0 16px;">هادا كودك يا غالي:</p>
          <div style="background: #f4f4f5; border-radius: 12px; padding: 18px; text-align: center; margin: 0 0 16px;">
            <span style="font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #1a1a1a;">${code}</span>
          </div>
          <p style="font-size: 14px; color: #555; margin: 0 0 20px;">بينتهي بعد 5 دقايق، خليك سريع ⏱️</p>
          <hr style="border: none; border-top: 1px solid #ececef; margin: 0 0 16px;" />
          <p style="font-size: 12px; color: #999; margin: 0;">ما طلبت هالكود؟ تجاهل الإيميل، ما في داعي تعمل أي شي.</p>
        </div>
      </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailSendError(`Resend API returned ${res.status}: ${body}`);
  }
}
