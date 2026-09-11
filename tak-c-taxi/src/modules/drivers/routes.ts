import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { requireAuth } from "../auth/guard.js";

const applySchema = z.object({
  age: z.number().int().min(18).max(100),
  vehicle: z.object({
    type: z.string().min(1),
    model: z.string().min(1),
    color: z.string().min(1),
    plate: z.string().min(1),
  }),
});

/**
 * The self-service half of admin/routes.ts's approve/reject/suspend —
 * without this, a Driver row (status PENDING) never exists for an admin to
 * act on in the first place. Same PENDING default the schema already
 * specifies; admin/routes.ts's driverStatusChange only ever moves a driver
 * *out* of PENDING, never creates one.
 */
export async function registerDriverRoutes(app: FastifyInstance): Promise<void> {
  app.post("/driver/apply", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    if (actor.actorType !== "user") return reply.code(403).send({ error: "Only rider accounts can apply to drive" });

    const body = applySchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const existing = await prisma.driver.findUnique({ where: { userId: actor.actorId } });
    if (existing) return reply.code(409).send({ error: `A driver profile already exists (status: ${existing.status})` });

    const plateTaken = await prisma.vehicle.findUnique({ where: { plate: body.data.vehicle.plate } });
    if (plateTaken) return reply.code(409).send({ error: "This plate number is already registered" });

    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.driver.create({
        data: { userId: actor.actorId, age: body.data.age },
      });
      await tx.vehicle.create({
        data: { driverId: created.id, ...body.data.vehicle },
      });
      return created;
    });

    return reply.code(201).send({ id: driver.id, status: driver.status });
  });

  // Lets the driver app decide what to show on load: the apply form (no
  // profile yet), a "pending review" screen, or the real driver home —
  // without this it would have no way to distinguish those states.
  app.get("/driver/me", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    if (actor.actorType !== "user") return reply.code(403).send({ error: "Not a rider account" });

    const driver = await prisma.driver.findUnique({
      where: { userId: actor.actorId },
      include: { vehicles: true },
    });
    if (!driver) return reply.code(404).send({ error: "No driver profile" });

    return reply.send({
      id: driver.id,
      status: driver.status,
      isOnline: driver.isOnline,
      ratingAvg: driver.ratingAvg,
      ratingCount: driver.ratingCount,
      vehicle: driver.vehicles[0] ?? null,
    });
  });
}
