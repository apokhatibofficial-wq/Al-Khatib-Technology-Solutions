import { randomUUID } from "node:crypto";
import { prisma } from "../../db/client.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type ActorType,
  type AccessTokenPayload,
} from "./jwt.js";
import type { AdminRole } from "../../generated/prisma/enums.js";

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export class ReuseDetectedError extends Error {}

async function issuePair(
  actorType: ActorType,
  actorId: string,
  role: AdminRole | undefined,
  familyId: string,
  meta: SessionMeta,
): Promise<TokenPair> {
  const session = await prisma.session.create({
    data: {
      familyId,
      userId: actorType === "user" ? actorId : null,
      adminUserId: actorType === "admin" ? actorId : null,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      // Placeholder — overwritten immediately below once we know the real
      // refresh TTL. Session.expiresAt must be NOT NULL, and jose computes
      // the JWT's own exp from "now" at sign time, so we sign first... but
      // we need the session's id (jti) before we can sign. Create with a
      // short-lived placeholder, then correct it.
      expiresAt: new Date(),
    },
  });

  const accessPayload: AccessTokenPayload = { actorType, actorId, ...(role ? { role } : {}) };
  const [accessToken, refresh] = await Promise.all([
    signAccessToken(accessPayload),
    signRefreshToken({ actorType, actorId, familyId }, session.id),
  ]);

  await prisma.session.update({ where: { id: session.id }, data: { expiresAt: refresh.expiresAt } });

  return { accessToken, refreshToken: refresh.token, refreshExpiresAt: refresh.expiresAt };
}

export async function createSession(
  actorType: ActorType,
  actorId: string,
  role: AdminRole | undefined,
  meta: SessionMeta,
): Promise<TokenPair> {
  return issuePair(actorType, actorId, role, randomUUID(), meta);
}

/**
 * Rotates a refresh token. If the presented token's session was *already*
 * revoked (i.e. it was already rotated once, or logged out), that's a
 * replay of a retired token — treat the whole rotation chain as
 * compromised and kill every session in it (§5/§10 reuse detection).
 */
export async function rotateSession(refreshToken: string, meta: SessionMeta): Promise<TokenPair> {
  const payload = await verifyRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({ where: { id: payload.jti } });

  if (!session) throw new Error("Unknown session");

  if (session.revokedAt) {
    await revokeFamily(session.familyId);
    throw new ReuseDetectedError("Refresh token reuse detected; all sessions in this chain were revoked.");
  }
  if (session.expiresAt < new Date()) throw new Error("Session expired");

  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });

  const role =
    payload.actorType === "admin"
      ? (await prisma.adminUser.findUnique({ where: { id: payload.actorId } }))?.role
      : undefined;

  return issuePair(payload.actorType, payload.actorId, role, session.familyId, meta);
}

export async function revokeFamily(familyId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeByRefreshToken(refreshToken: string): Promise<void> {
  const payload = await verifyRefreshToken(refreshToken).catch(() => null);
  if (!payload) return;
  await revokeFamily(payload.familyId);
}
