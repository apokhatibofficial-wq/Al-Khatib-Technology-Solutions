import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../auth/guard.js";

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  // Public: the PWA needs this to call pushManager.subscribe({ applicationServerKey: ... }).
  app.get("/push/vapid-public-key", async (_request, reply) => {
    if (!env.VAPID_PUBLIC_KEY) return reply.code(503).send({ error: "Push is not configured on this server yet." });
    return reply.send({ publicKey: env.VAPID_PUBLIC_KEY });
  });

  app.post("/push-subscriptions", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    if (actor.actorType !== "user") return reply.code(403).send({ error: "Only passenger/driver accounts hold push subscriptions" });

    const body = z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        platform: z.string().min(1),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: body.data.endpoint },
      update: { userId: actor.actorId, p256dh: body.data.p256dh, auth: body.data.auth, platform: body.data.platform },
      create: { userId: actor.actorId, ...body.data },
    });
    return reply.code(201).send({ id: sub.id });
  });

  app.delete("/push-subscriptions", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    const body = z.object({ endpoint: z.string().url() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    // Ownership check via the where clause itself (not a separate lookup) —
    // deleting someone else's subscription by guessing their endpoint
    // should look identical to "there was nothing to delete".
    await prisma.pushSubscription.deleteMany({ where: { endpoint: body.data.endpoint, userId: actor.actorId } });
    return reply.code(204).send();
  });
}
