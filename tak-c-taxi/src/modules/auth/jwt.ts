import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";
import type { AdminRole } from "../../generated/prisma/enums.js";

const ACCESS_TTL = "10m"; // §5: short-lived access token, held in memory only.
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — not specified by the doc, a documented default.

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export type ActorType = "user" | "admin";

export interface AccessTokenPayload {
  actorType: ActorType;
  actorId: string;
  role?: AdminRole;
}

export interface RefreshTokenPayload {
  actorType: ActorType;
  actorId: string;
  familyId: string;
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as unknown as AccessTokenPayload;
}

/** jti = the backing Session row's id, so a rotated/revoked token is instantly rejectable. */
export async function signRefreshToken(payload: RefreshTokenPayload, jti: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(refreshSecret);
  return { token, expiresAt };
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload & { jti: string }> {
  const { payload } = await jwtVerify(token, refreshSecret);
  if (!payload.jti) throw new Error("refresh token missing jti");
  return { ...(payload as unknown as RefreshTokenPayload), jti: payload.jti };
}

/**
 * Short-lived ticket bridging Google's first factor to the mandatory admin
 * TOTP step (§10: "MFA إلزامي للأدمن"). Deliberately never accepted by
 * verifyAccessToken — it carries a distinct `purpose` claim and is only
 * ever read by the /auth/admin/mfa/verify route.
 */
export async function signMfaTicket(actorId: string): Promise<string> {
  return new SignJWT({ purpose: "admin_mfa", actorId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(accessSecret);
}

export async function verifyMfaTicket(ticket: string): Promise<{ actorId: string }> {
  const { payload } = await jwtVerify(ticket, accessSecret);
  if (payload["purpose"] !== "admin_mfa" || typeof payload["actorId"] !== "string") {
    throw new Error("Invalid MFA ticket");
  }
  return { actorId: payload["actorId"] };
}
