import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { requestOtp, verifyOtp, OtpRateLimitError } from "./otp.js";
import { exchangeGoogleCode, GoogleAuthNotConfiguredError } from "./google.js";
import { verifyAdminTotp } from "./totp.js";
import { signMfaTicket, verifyMfaTicket } from "./jwt.js";
import { createSession, rotateSession, revokeByRefreshToken, ReuseDetectedError, type SessionMeta } from "./sessions.js";
import { requireAuth } from "./guard.js";

const emailSchema = z
  .string()
  .email("Expected a valid email address")
  .transform((s) => s.trim().toLowerCase());
const otpCodeSchema = z.string().regex(/^\d{6}$/, "Expected a 6-digit code");
// Collected on the registration form up front (phase-9 follow-up) — the
// client holds these from the request step and resends them with the code
// at verify time, which is the only point identity (the email) is actually
// confirmed.
const registrationFieldsSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  gender: z.enum(["male", "female"]),
});

const REFRESH_COOKIE = "refresh_token";

function sessionMeta(request: { headers: { "user-agent"?: string }; ip: string }): SessionMeta {
  return { userAgent: request.headers["user-agent"], ipAddress: request.ip };
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/otp/request", async (request, reply) => {
    const body = z.object({ email: emailSchema }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    try {
      await requestOtp(body.data.email, request.log);
    } catch (err) {
      if (err instanceof OtpRateLimitError) return reply.code(429).send({ error: err.message });
      throw err;
    }
    return reply.code(204).send();
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const body = z
      .object({ email: emailSchema, code: otpCodeSchema })
      .merge(registrationFieldsSchema)
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const ok = await verifyOtp(body.data.email, body.data.code);
    if (!ok) return reply.code(401).send({ error: "Invalid or expired code" });

    const { fullName, phone, gender } = body.data;
    const user = await prisma.user.upsert({
      where: { email: body.data.email },
      update: { fullName, phone, gender },
      create: { email: body.data.email, fullName, phone, gender, status: "PENDING" },
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

    const email = identity.email.trim().toLowerCase();

    // Admin identity is anchored on email (admin_users has no googleSub
    // column — §3) and mandatory MFA (§10) always gates the actual session.
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (admin) {
      if (!admin.mfaSecret) {
        return reply.code(403).send({ error: "MFA is not configured for this admin account yet." });
      }
      const ticket = await signMfaTicket(admin.id);
      return reply.send({ mfaRequired: true, ticket });
    }

    if (!identity.emailVerified) {
      return reply.code(401).send({ error: "Google did not report this email address as verified." });
    }

    // Regular users are email-anchored (§5, switched from phone — see
    // prisma/schema.prisma's User.email note). Google's own verified email
    // is enough to find-or-create the account directly here — unlike the
    // old phone-anchored design, Google sign-in no longer needs a prior OTP
    // signup to "link" against; it can originate the account itself.
    const user = await prisma.user.upsert({
      where: { email },
      update: { googleSub: identity.googleSub },
      create: { email, googleSub: identity.googleSub, fullName: identity.fullName, status: "PENDING" },
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
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      photoFileId: user.photoFileId,
      status: user.status,
      driver: user.driver ? { status: user.driver.status, isOnline: user.driver.isOnline } : null,
    });
  });

  // Profile editing — the same fields the registration form collects, plus
  // photoFileId (set after a separate POST /uploads call, not uploaded
  // inline here). Admin identity has no editable profile of this shape.
  app.patch("/me", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    if (actor.actorType !== "user") return reply.code(403).send({ error: "Not a user account" });

    const body = z
      .object({
        fullName: z.string().trim().min(1).optional(),
        phone: z.string().trim().min(1).optional(),
        gender: z.enum(["male", "female"]).optional(),
        photoFileId: z.string().min(1).nullable().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    if (body.data.photoFileId) {
      const file = await prisma.uploadedFile.findUnique({ where: { id: body.data.photoFileId } });
      if (!file) return reply.code(400).send({ error: "Unknown photoFileId — upload it via POST /uploads first" });
    }

    const user = await prisma.user.update({ where: { id: actor.actorId }, data: body.data });
    return reply.send({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      gender: user.gender,
      photoFileId: user.photoFileId,
    });
  });
}
