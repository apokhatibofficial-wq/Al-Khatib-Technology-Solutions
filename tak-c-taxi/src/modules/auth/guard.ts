import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../db/client.js";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt.js";
import type { Driver } from "../../generated/prisma/client.js";

declare module "fastify" {
  interface FastifyRequest {
    actor?: AccessTokenPayload;
    driver?: Driver;
  }
}

// §5: "والتحقق دائمًا على السيرفر" — role/identity is verified here, from a
// signed token, on every protected request.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "Missing bearer token" });
    return;
  }
  try {
    request.actor = await verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    await reply.code(401).send({ error: "Invalid or expired access token" });
  }
}

/**
 * Phase 4's first driver-only routes. Re-checks Driver.status from the DB
 * on every call rather than trusting a claim baked into the (10-minute)
 * access token — a driver SUSPENDED mid-session must lose access well
 * within that window, not just at next login. "إخفاء زر... ليس ترصيحًا".
 */
export async function requireDriver(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (request.actor?.actorType !== "user") {
    await reply.code(403).send({ error: "Driver access required" });
    return;
  }

  const driver = await prisma.driver.findUnique({ where: { userId: request.actor.actorId } });
  if (!driver || driver.status !== "APPROVED") {
    await reply.code(403).send({ error: "No approved driver profile for this account" });
    return;
  }
  request.driver = driver;
}
