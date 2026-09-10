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
