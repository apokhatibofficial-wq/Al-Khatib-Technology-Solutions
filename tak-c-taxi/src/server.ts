import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";
import { registerAuthRoutes } from "./modules/auth/routes.js";
import { registerGeoRoutes } from "./modules/geo/routes.js";
import { registerPricingRoutes } from "./modules/pricing/routes.js";
import { registerRideRoutes } from "./modules/rides/routes.js";

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

  // Real liveness + DB-connectivity check — no mocked/hardcoded "ok".
  app.get("/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", db: "up", time: new Date().toISOString() });
    } catch (err) {
      app.log.error(err, "health check: database unreachable");
      return reply.code(503).send({ status: "error", db: "down" });
    }
  });

  await registerAuthRoutes(app);
  await registerGeoRoutes(app);
  await registerPricingRoutes(app);
  await registerRideRoutes(app);

  return app;
}
