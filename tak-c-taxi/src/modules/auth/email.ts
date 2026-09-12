import { env } from "../../config/env.js";

// A base64 data: URI was tried first (see git history) and dropped — Gmail
// does not reliably render inline base64 images in received HTML mail
// (confirmed by an actual failed real-world send, not just a guess: the
// email arrived with no logo). A real <img src> the recipient's mail
// client fetches over HTTPS is the only approach that reliably works.
//
// No real asset hosting exists for this project yet (see README.md's "Is
// this ready to deploy?"), so this uses jsDelivr's free GitHub CDN
// (https://www.jsdelivr.com/?docs=gh) rather than GitHub's own raw-content
// URL — pinned to a specific commit SHA (not the branch name, which
// contains a "/" jsDelivr's @version syntax can't parse), which jsDelivr
// treats as immutable and caches at the edge forever (verified: a real
// curl came back `cache-control: public, max-age=31536000, immutable`).
// Stable even after this branch is merged/deleted, since the commit stays
// reachable in the repo's history either way. Still worth moving to a
// real asset host on the project's own domain eventually, but this is a
// genuine CDN, not a workaround — no urgency to replace it before launch.
const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/apokhatibofficial-wq/Al-Khatib-Technology-Solutions@06ab075f1c904e3b93de0caca4cceea7d4cab442/tak-c-taxi/assets/logo.png";
const BRAND_YELLOW = "#FFE600"; // sampled directly from the logo's taxi headlights

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
      html: `<div style="margin: 0; padding: 40px 16px; background: #f3f3f5; font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;">
        <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #ececef; box-shadow: 0 2px 12px rgba(0,0,0,0.04);">
          <div style="height: 6px; background: ${BRAND_YELLOW};"></div>
          <div dir="rtl" style="padding: 36px 32px 32px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="${LOGO_URL}" alt="Tak-C.taxi" width="190" style="max-width: 190px; height: auto; display: inline-block;" />
            </div>
            <p style="font-size: 17px; color: #1a1a1a; margin: 0 0 6px;">السلام عليكم 👋</p>
            <p style="font-size: 17px; color: #1a1a1a; margin: 0 0 20px;">هادا كودك يا غالي:</p>
            <div style="background: #fffdf0; border: 2px solid ${BRAND_YELLOW}; border-radius: 14px; padding: 20px; text-align: center; margin: 0 0 20px;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
            </div>
            <p style="font-size: 14px; color: #555; margin: 0 0 24px;">بينتهي بعد 5 دقايق، خليك سريع ⏱️</p>
            <hr style="border: none; border-top: 1px solid #ececef; margin: 0 0 16px;" />
            <p style="font-size: 12px; color: #999; margin: 0;">ما طلبت هالكود؟ تجاهل الإيميل، ما في داعي تعمل أي شي.</p>
          </div>
        </div>
        <p style="text-align: center; font-size: 12px; color: #aaa; margin: 20px 0 0;">Tak-C.taxi</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailSendError(`Resend API returned ${res.status}: ${body}`);
  }
}
