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

export async function buildServer() {
  const app = Fastify({
    logger:
      env.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            },
          }
        : true,
  });

  await app.register(cookie);
  await app.register(websocket);

  // §10's "إساءة استخدام API" threat row: "حدود معدل لكل مستخدم وIP" — a
  // per-IP floor across the whole API (backed by Redis, already a hard
  // dependency, so limits hold across more than one server instance).
  // Not specified numerically by the doc — a documented default, generous
  // enough for a driver polling location every 2-8s (§6) without ever
  // being the bottleneck. /auth/otp/* has its own, tighter, phone-keyed
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
