import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../../config/env.js";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface GoogleIdentity {
  googleSub: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
}

export class GoogleAuthNotConfiguredError extends Error {}

interface GoogleTokenResponse {
  id_token: string;
  error?: string;
  error_description?: string;
}

/**
 * §5: "OAuth Google بتبديل الرمز على السيرفر لا في المتصفح" — the client
 * only ever hands us Google's one-time authorization code; the token
 * exchange (which needs the client secret) happens here, server-to-server.
 */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleIdentity> {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    throw new GoogleAuthNotConfiguredError("Google OAuth is not configured on this server yet.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const body = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !body.id_token) {
    throw new Error(`Google token exchange failed: ${body.error_description ?? body.error ?? res.statusText}`);
  }

  const { payload } = await jwtVerify(body.id_token, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_OAUTH_CLIENT_ID,
  });

  if (typeof payload.sub !== "string" || typeof payload["email"] !== "string") {
    throw new Error("Google id_token missing sub/email");
  }

  return {
    googleSub: payload.sub,
    email: payload["email"],
    emailVerified: payload["email_verified"] === true,
    fullName: typeof payload["name"] === "string" ? payload["name"] : undefined,
  };
}
