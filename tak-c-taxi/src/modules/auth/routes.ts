import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { requestOtp, verifyOtp, OtpRateLimitError } from "./otp.js";
import { exchangeGoogleCode, GoogleAuthNotConfiguredError } from "./google.js";
import { verifyAdminTotp } from "./totp.js";
import { signMfaTicket, verifyMfaTicket } from "./jwt.js";
import { createSession, rotateSession, revokeByRefreshToken, ReuseDetectedError, type SessionMeta } from "./sessions.js";
import { requireAuth } from "./guard.js";

const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, "Expected E.164 format, e.g. +963900000000");
const otpCodeSchema = z.string().regex(/^\d{6}$/, "Expected a 6-digit code");

const REFRESH_COOKIE = "refresh_token";

function sessionMeta(request: { headers: { "user-agent"?: string }; ip: string }): SessionMeta {
  return { userAgent: request.headers["user-agent"], ipAddress: request.ip };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/otp/request", async (request, reply) => {
    const body = z.object({ phone: phoneSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    try {
      await requestOtp(body.data.phone, request.log);
    } catch (err) {
      if (err instanceof OtpRateLimitError) return reply.code(429).send({ error: err.message });
      throw err;
    }
    return reply.code(204).send();
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const body = z.object({ phone: phoneSchema, code: otpCodeSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const ok = await verifyOtp(body.data.phone, body.data.code);
    if (!ok) return reply.code(401).send({ error: "Invalid or expired code" });

    const user = await prisma.user.upsert({
      where: { phone: body.data.phone },
      update: {},
      create: { phone: body.data.phone, status: "PENDING" },
    });

    const tokens = await createSession("user", user.id, undefined, sessionMeta(request));
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/",
      expires: tokens.refreshExpiresAt,
    });
    return reply.send({ accessToken: tokens.accessToken, user: { id: user.id, status: user.status } });
  });

  app.post("/auth/google", async (request, reply) => {
    const body = z.object({ code: z.string().min(1), redirectUri: z.string().url() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    let identity;
    try {
      identity = await exchangeGoogleCode(body.data.code, body.data.redirectUri);
    } catch (err) {
      if (err instanceof GoogleAuthNotConfiguredError) return reply.code(503).send({ error: err.message });
      request.log.warn(err, "google token exchange failed");
      return reply.code(401).send({ error: "Google sign-in failed" });
    }

    // Admin identity is anchored on email (admin_users has no phone/googleSub
    // column — §3) and mandatory MFA (§10) always gates the actual session.
    const admin = await prisma.adminUser.findUnique({ where: { email: identity.email } });
    if (admin) {
      if (!admin.mfaSecret) {
        return reply.code(403).send({ error: "MFA is not configured for this admin account yet." });
      }
      const ticket = await signMfaTicket(admin.id);
      return reply.send({ mfaRequired: true, ticket });
    }

    // Regular users are phone-anchored (§5: OTP is the primary path). Google
    // only ever logs in an account that already exists by googleSub — it
    // can't originate a new, phone-less account.
    const user = await prisma.user.findUnique({ where: { googleSub: identity.googleSub } });
    if (!user) {
      return reply.code(404).send({
        error: "no_account",
        message: "No account is linked to this Google identity yet. Verify your phone number first.",
      });
    }

    const tokens = await createSession("user", user.id, undefined, sessionMeta(request));
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/",
      expires: tokens.refreshExpiresAt,
    });
    return reply.send({ accessToken: tokens.accessToken, user: { id: user.id, status: user.status } });
  });

  app.post("/auth/admin/mfa/verify", async (request, reply) => {
    const body = z.object({ ticket: z.string().min(1), code: otpCodeSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    let actorId: string;
    try {
      ({ actorId } = await verifyMfaTicket(body.data.ticket));
    } catch {
      return reply.code(401).send({ error: "Invalid or expired MFA ticket" });
    }

    const admin = await prisma.adminUser.findUnique({ where: { id: actorId } });
    if (!admin?.mfaSecret || !verifyAdminTotp(admin.mfaSecret, body.data.code)) {
      return reply.code(401).send({ error: "Invalid code" });
    }

    await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const tokens = await createSession("admin", admin.id, admin.role, sessionMeta(request));
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/",
      expires: tokens.refreshExpiresAt,
    });
    return reply.send({ accessToken: tokens.accessToken, admin: { id: admin.id, role: admin.role } });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE];
    if (!refreshToken) return reply.code(401).send({ error: "No refresh token" });

    try {
      const tokens = await rotateSession(refreshToken, sessionMeta(request));
      reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/",
        expires: tokens.refreshExpiresAt,
      });
      return reply.send({ accessToken: tokens.accessToken });
    } catch (err) {
      reply.clearCookie(REFRESH_COOKIE, { path: "/" });
      if (err instanceof ReuseDetectedError) {
        request.log.warn({ err }, "refresh token reuse detected");
        return reply.code(401).send({ error: "reuse_detected" });
      }
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const refreshToken = request.cookies[REFRESH_COOKIE];
    if (refreshToken) await revokeByRefreshToken(refreshToken);
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    if (actor.actorType === "admin") {
      const admin = await prisma.adminUser.findUnique({ where: { id: actor.actorId } });
      if (!admin) return reply.code(404).send({ error: "Not found" });
      return reply.send({ actorType: "admin", id: admin.id, email: admin.email, role: admin.role });
    }

    const user = await prisma.user.findUnique({ where: { id: actor.actorId }, include: { driver: true } });
    if (!user) return reply.code(404).send({ error: "Not found" });
    return reply.send({
      actorType: "user",
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      driver: user.driver ? { status: user.driver.status, isOnline: user.driver.isOnline } : null,
    });
  });
}
