import Fastify from "fastify";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { redis } from "./modules/realtime/redis.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerGeoRoutes } from "./modules/geo/routes.js";
import { registerPricingRoutes } from "./modules/pricing/routes.js";
import { registerRideRoutes } from "./modules/rides/routes.js";
import { registerRealtimeRoutes } from "./modules/realtime/websocket.js";
import { registerAdminRoutes } from "./modules/admin/routes.js";

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

  return app;
}
