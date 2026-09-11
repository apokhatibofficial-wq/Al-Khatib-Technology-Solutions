import { createRequire } from "node:module";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { redis } from "./modules/realtime/redis.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerGeoRoutes } from "./modules/geo/routes.js";
import { registerPricingRoutes } from "./modules/pricing/routes.js";
import { registerRideRoutes } from "./modules/rides/routes.js";
import { registerRealtimeRoutes } from "./modules/realtime/websocket.js";
import { registerAdminRoutes } from "./modules/admin/routes.js";
import { registerNotificationRoutes } from "./modules/notifications/routes.js";

/**
 * pino-pretty is a devDependency, deliberately absent from the pruned
 * production Docker image (see Dockerfile's "runtime-deps" stage) — found
 * by actually booting that pruned layout with NODE_ENV=development during
 * phase 9's deployment-infra work: Fastify crashed hard on startup
 * ("unable to determine transport target for pino-pretty") instead of just
 * logging less prettily. A misconfigured deploy that leaves NODE_ENV unset
 * (env.ts's schema defaults it to "development") would hit the exact same
 * crash. Resolvability is checked explicitly so that scenario degrades to
 * plain JSON logs instead of refusing to start.
 */
function resolvePrettyTransport(): { target: string; options: Record<string, unknown> } | undefined {
  try {
    createRequire(import.meta.url).resolve("pino-pretty");
    return { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } };
  } catch {
    return undefined;
  }
}

export async function buildServer() {
  const prettyTransport = env.NODE_ENV === "development" ? resolvePrettyTransport() : undefined;

  const app = Fastify({
    logger: prettyTransport ? { transport: prettyTransport } : true,
  });

  await app.register(cookie);
  await app.register(websocket);

  // §10's "إساءة استخدام API" threat row: "حدود معدل لكل مستخدم وIP" — a
  // per-IP floor across the whole API (backed by Redis, already a hard
  // dependency, so limits hold across more than one server instance).
  // Not specified numerically by the doc — a documented default, generous
  // enough for a driver polling location every 2-8s (§6) without ever
  // being the bottleneck. /auth/otp/* has its own, tighter, email-keyed
  // limit (otp.ts) — this is the general floor everything else sits on.
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    redis,
  });

  // Real liveness + dependency-connectivity check — no mocked/hardcoded "ok".
  app.get("/health", async (_request, reply) => {
    try {
      await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
      return reply.send({ status: "ok", db: "up", redis: "up", time: new Date().toISOString() });
    } catch (err) {
      app.log.error(err, "health check: a dependency is unreachable");
      return reply.code(503).send({ status: "error" });
    }
  });

  await registerAuthRoutes(app);
  await registerGeoRoutes(app);
  await registerPricingRoutes(app);
  await registerRideRoutes(app);
  await registerRealtimeRoutes(app);
  await registerAdminRoutes(app);
  await registerNotificationRoutes(app);

  return app;
}
