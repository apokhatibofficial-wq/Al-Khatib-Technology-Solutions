import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildTestApp, closeAll } from "../helpers/app.js";
import {
  resetDb,
  createTestCity,
  createPricingVersion,
  createRiderUser,
  createDriverWithUser,
  createAdmin,
  createRide,
} from "../helpers/fixtures.js";
import { requestOtp, verifyOtp, OtpRateLimitError } from "../../src/modules/auth/otp.js";
import { createSession } from "../../src/modules/auth/sessions.js";
import { prisma } from "../../src/db/client.js";

let app: FastifyInstance;

before(async () => {
  await resetDb();
  app = await buildTestApp();
});

after(async () => {
  await closeAll(app);
});

// ---- OTP flow, exercised at the module level (real DB rows, real HMAC
// compare) — see test/helpers' note on why: request.log capture would work
// too, but calling the real functions directly with a capturing Logger is
// simpler and no less real; the HTTP route is a thin wrapper over these.
test("otp: request then verify with the right code succeeds", async () => {
  const phone = "+963900000001";
  let capturedCode: string | undefined;
  await requestOtp(phone, { info: (obj: unknown) => (capturedCode = (obj as { code: string }).code) });
  assert.ok(capturedCode, "expected requestOtp to log a code in dev mode");

  const ok = await verifyOtp(phone, capturedCode!);
  assert.equal(ok, true);
});

test("otp: wrong code fails and does not consume the pending request", async () => {
  const phone = "+963900000002";
  let capturedCode: string | undefined;
  await requestOtp(phone, { info: (obj: unknown) => (capturedCode = (obj as { code: string }).code) });

  const wrongCode = capturedCode === "000000" ? "111111" : "000000";
  const first = await verifyOtp(phone, wrongCode);
  assert.equal(first, false);

  const second = await verifyOtp(phone, capturedCode!);
  assert.equal(second, true, "the real code should still work after one wrong attempt");
});

test("otp: a code cannot be replayed after successful verification", async () => {
  const phone = "+963900000003";
  let capturedCode: string | undefined;
  await requestOtp(phone, { info: (obj: unknown) => (capturedCode = (obj as { code: string }).code) });
  assert.equal(await verifyOtp(phone, capturedCode!), true);
  assert.equal(await verifyOtp(phone, capturedCode!), false, "the same code must not verify twice");
});

test("otp: requesting a second code before the cooldown elapses is rate-limited", async () => {
  const phone = "+963900000004";
  await requestOtp(phone, { info: () => {} });
  await assert.rejects(() => requestOtp(phone, { info: () => {} }), OtpRateLimitError);
});

// ---- HTTP-level auth guard ------------------------------------------------

test("guard: protected route rejects a missing token", async () => {
  const res = await app.inject({ method: "GET", url: "/rides/does-not-matter" });
  assert.equal(res.statusCode, 401);
});

test("guard: protected route rejects a garbage token", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/rides/does-not-matter",
    headers: { authorization: "Bearer not-a-real-jwt" },
  });
  assert.equal(res.statusCode, 401);
});

test("guard: a rider token is rejected by driver-only routes", async () => {
  const city = await createTestCity();
  const rider = await createRiderUser(city);
  const tokens = await createSession("user", rider.id, undefined, {});

  const res = await app.inject({
    method: "POST",
    url: "/driver/online",
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    payload: {},
  });
  assert.equal(res.statusCode, 403);
});

// ---- IDOR: GET /rides/:id ---------------------------------------------

test("IDOR: the ride's own rider can view it", async () => {
  const city = await createTestCity();
  const pricing = await createPricingVersion(city);
  const rider = await createRiderUser(city);
  const rideId = await createRide({ userId: rider.id, pricingVersionId: pricing.id, state: "REQUESTED" });
  const tokens = await createSession("user", rider.id, undefined, {});

  const res = await app.inject({
    method: "GET",
    url: `/rides/${rideId}`,
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().id, rideId);
});

test("IDOR: a different rider cannot view someone else's ride (404, not 403 — no existence leak)", async () => {
  const city = await createTestCity();
  const pricing = await createPricingVersion(city);
  const owner = await createRiderUser(city);
  const stranger = await createRiderUser(city);
  const rideId = await createRide({ userId: owner.id, pricingVersionId: pricing.id, state: "REQUESTED" });
  const strangerTokens = await createSession("user", stranger.id, undefined, {});

  const res = await app.inject({
    method: "GET",
    url: `/rides/${rideId}`,
    headers: { authorization: `Bearer ${strangerTokens.accessToken}` },
  });
  assert.equal(res.statusCode, 404);
});

test("IDOR: the assigned driver can view the ride; an unrelated driver cannot", async () => {
  const city = await createTestCity();
  const pricing = await createPricingVersion(city);
  const rider = await createRiderUser(city);
  const { driver: assignedDriver, user: assignedDriverUser } = await createDriverWithUser(city);
  const { user: otherDriverUser } = await createDriverWithUser(city);
  const rideId = await createRide({
    userId: rider.id,
    driverId: assignedDriver.id,
    pricingVersionId: pricing.id,
    state: "DRIVER_ARRIVING",
  });

  const assignedTokens = await createSession("user", assignedDriverUser.id, undefined, {});
  const okRes = await app.inject({
    method: "GET",
    url: `/rides/${rideId}`,
    headers: { authorization: `Bearer ${assignedTokens.accessToken}` },
  });
  assert.equal(okRes.statusCode, 200);

  const otherTokens = await createSession("user", otherDriverUser.id, undefined, {});
  const blockedRes = await app.inject({
    method: "GET",
    url: `/rides/${rideId}`,
    headers: { authorization: `Bearer ${otherTokens.accessToken}` },
  });
  assert.equal(blockedRes.statusCode, 404);
});

test("IDOR: an admin can view any ride", async () => {
  const city = await createTestCity();
  const pricing = await createPricingVersion(city);
  const rider = await createRiderUser(city);
  const rideId = await createRide({ userId: rider.id, pricingVersionId: pricing.id, state: "REQUESTED" });
  const admin = await createAdmin("SUPPORT");
  const adminTokens = await createSession("admin", admin.id, admin.role, {});

  const res = await app.inject({
    method: "GET",
    url: `/rides/${rideId}`,
    headers: { authorization: `Bearer ${adminTokens.accessToken}` },
  });
  assert.equal(res.statusCode, 200);
});

// ---- Admin role gating (requireAdminRole re-checks the DB fresh) --------

test("admin role gate: an OPS admin is rejected from the SUPER_ADMIN-only audit log", async () => {
  const opsAdmin = await createAdmin("OPS");
  const tokens = await createSession("admin", opsAdmin.id, opsAdmin.role, {});

  const res = await app.inject({
    method: "GET",
    url: "/admin/audit",
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(res.statusCode, 403);
});

test("admin role gate: a SUPER_ADMIN passes the same check", async () => {
  const superAdmin = await createAdmin("SUPER_ADMIN");
  const tokens = await createSession("admin", superAdmin.id, superAdmin.role, {});

  const res = await app.inject({
    method: "GET",
    url: "/admin/audit",
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(res.statusCode, 200);
});

test("admin role gate: a demoted admin loses access on the very next request, without waiting for token expiry", async () => {
  const admin = await createAdmin("SUPER_ADMIN");
  const tokens = await createSession("admin", admin.id, admin.role, {});

  const before_ = await app.inject({
    method: "GET",
    url: "/admin/audit",
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(before_.statusCode, 200);

  // Demote in the DB — the still-valid, still-unexpired access token's `role`
  // claim now disagrees with reality; requireAdminRole must not trust the claim.
  await prisma.adminUser.update({ where: { id: admin.id }, data: { role: "READONLY" } });

  const afterDemotion = await app.inject({
    method: "GET",
    url: "/admin/audit",
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  assert.equal(afterDemotion.statusCode, 403);
});
