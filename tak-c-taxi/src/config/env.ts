import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is not set. Copy .env.example to .env and configure a Postgres connection string."),

  // Auth (phase 2). Separate secrets per token type so a leaked access
  // token can't be used to mint refresh tokens or vice versa (§5).
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),

  // OTP delivery. No real SMS vendor is wired yet — see src/modules/auth/otp.ts.
  // Optional in development (falls back to logging the code); required in production.
  OTP_PROVIDER_KEY: z.string().optional(),

  // Google OAuth (§5, secondary auth path). Optional until that flow is exercised.
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  // Geo (phase 3, §2). Self-hosted OSRM (routing) + Nominatim (geocoding) —
  // not Google Maps, per §2's explicit export/sanctions-risk reasoning.
  // Optional in development (routes return 503 until configured); required
  // in production.
  ROUTING_ENGINE_URL: z.string().optional(),
  GEOCODER_URL: z.string().optional(),

  // Real-time (phase 5, §1/§6). Live driver locations (GEOADD/GEOSEARCH)
  // and the ride/driver/city pub-sub channels both live here — unlike the
  // optional vars above, there's no degraded mode: driver matching
  // (assignment.ts) hard-depends on this from phase 5 onward, so it's
  // required in every environment, not just production.
  REDIS_URL: z.string().min(1, "REDIS_URL is not set — driver matching and realtime both depend on it."),

  // Notifications (phase 8, §2/§11). Standard Web Push, VAPID-authenticated
  // — this is a PWA with no native app (§11: no Play/App Store), so Chrome's
  // push service is reached the same way every other browser's is, over the
  // standard Push API; there's no separate Firebase Admin SDK integration
  // to build. VAPID_SUBJECT isn't in the doc's §13 list, but the Web Push
  // protocol itself requires one (a contact URI) — see notifications/push.ts.
  // FCM_SERVER_KEY stays in .env.example (§13 names it) but unused: it's
  // Firebase's proprietary API for a native app, which this project doesn't
  // have and isn't building.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === "production" && !env.OTP_PROVIDER_KEY) {
  throw new Error(
    "OTP_PROVIDER_KEY is required in production — refusing to start with OTP delivery silently disabled.",
  );
}
if (env.NODE_ENV === "production" && (!env.ROUTING_ENGINE_URL || !env.GEOCODER_URL)) {
  throw new Error(
    "ROUTING_ENGINE_URL and GEOCODER_URL are required in production — fares must come from a real route, never an estimate.",
  );
}
if (env.NODE_ENV === "production" && (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT)) {
  throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are required in production for push delivery.");
}
