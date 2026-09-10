import type { FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    actor?: AccessTokenPayload;
  }
}

// §5: "والتحقق دائمًا على السيرفر" — role/identity is verified here, from a
// signed token, on every protected request. Role-scoped guards (admin,
// driver) belong to whichever phase adds their first protected route —
// this file only builds what GET /me actually needs right now.
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
