import type { FastifyInstance } from "fastify";
import { buildServer } from "../../src/server.js";
import { prisma } from "../../src/db/client.js";
import { redis, redisSubscriber } from "../../src/modules/realtime/redis.js";

export async function buildTestApp(): Promise<FastifyInstance> {
  const app = await buildServer();
  await app.ready();
  return app;
}

/**
 * node:test runs each test file in its own process and does NOT force-exit
 * on open handles — importing almost anything in this codebase transitively
 * opens a live Postgres pool and two live Redis connections (ioredis
 * connects eagerly, see realtime/redis.ts), so every file's `after()` must
 * close them or the process hangs after its assertions already passed.
 */
export async function closeAll(app?: FastifyInstance): Promise<void> {
  if (app) await app.close();
  await prisma.$disconnect();
  redis.disconnect();
  redisSubscriber.disconnect();
}

/** Real ephemeral-port listener — needed for the WebSocket tests (Fastify's inject() doesn't upgrade connections). */
export async function listenTestApp(app: FastifyInstance): Promise<{ port: number; wsUrl: (path: string) => string }> {
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("expected a real TCP address from app.listen");
  const port = address.port;
  return { port, wsUrl: (path: string) => `ws://127.0.0.1:${port}${path}` };
}
