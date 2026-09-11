import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "../../db/client.js";
import { requireAuth, requireDriver } from "../auth/guard.js";
import { transitionRide, InvalidTransitionError, ACTIVE_RIDE_STATES } from "./state-machine.js";
import { startSearching, acceptOffer, declineOffer, OfferNotAcceptableError } from "./assignment.js";
import { withIdempotency } from "./idempotency.js";
import { setDriverLocation, clearDriverLocation } from "../realtime/geo.js";
import { broadcastDriverLocation } from "../realtime/broadcast.js";
import { checkLocationPlausibility } from "../realtime/plausibility.js";
import { issueInvoice } from "../pricing/invoice.js";

const pointSchema = z.object({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) });

function idempotencyKey(request: FastifyRequest): string | undefined {
  const header = request.headers["idempotency-key"];
  return typeof header === "string" ? header : undefined;
}

/**
 * The ride's rider, its assigned driver, an admin, or a driver holding a
 * live (unresponded) offer for it may view it (§10 IDOR control). That
 * last case matters before DRIVER_ACCEPTED sets ride.driverId at all — a
 * driver deciding whether to accept an offer still needs to see what
 * they're being asked to accept.
 */
async function loadRideForActor(rideId: string, actor: NonNullable<FastifyRequest["actor"]>) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return null;

  if (actor.actorType === "admin") return ride;
  if (ride.userId === actor.actorId) return ride;
  if (ride.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: ride.driverId } });
    if (driver?.userId === actor.actorId) return ride;
  }

  const offer = await prisma.rideOffer.findFirst({
    where: { rideId, respondedAt: null, driver: { userId: actor.actorId } },
  });
  if (offer) return ride;

  return null;
}

export async function registerRideRoutes(app: FastifyInstance): Promise<void> {
  // ---- Rider actions ------------------------------------------------------

  app.post("/rides", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    const body = z.object({ quote_id: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const { status, body: respBody } = await withIdempotency(actor.actorId, "POST /rides", idempotencyKey(request), async () => {
      // §4: "عند إنشاء الرحلة يُعاد التحقق من العرض (صلاحيته وموقعه)" —
      // re-validated here, not trusted from the client.
      const quote = await prisma.quote.findUnique({ where: { id: body.data.quote_id } });
      if (!quote || quote.consumedAt || quote.expiresAt < new Date()) {
        return { status: 410, body: { error: "Quote is invalid, already used, or expired. Request a new one." } };
      }

      const claimed = await prisma.quote.updateMany({
        where: { id: quote.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count === 0) {
        return { status: 410, body: { error: "Quote was already used." } };
      }

      const rideId = createId();
      await prisma.$executeRaw`
        INSERT INTO "Ride" (
          id, "userId", state, pickup, dest, "pickupLabel", "destLabel",
          "plannedDistanceM", "plannedDurationS", "routePolyline",
          "quotedFareCents", "pricingVersionId", "requestedAt"
        )
        SELECT ${rideId}, ${actor.actorId}, 'REQUESTED', q.pickup, q.dest, q."pickupLabel", q."destLabel",
               q."distanceM", q."durationS", q."routePolyline", q."fareCents", q."pricingVersionId", now()
        FROM "Quote" q WHERE q.id = ${quote.id}
      `;

      const pickup = { lat: 0, lng: 0 }; // overwritten below from the quote's real point
      const pt = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
        SELECT ST_Y(pickup::geometry) as lat, ST_X(pickup::geometry) as lng FROM "Ride" WHERE id = ${rideId}
      `;
      Object.assign(pickup, pt[0]);

      void startSearching(rideId, pickup).catch((err) => request.log.error(err, "assignment search failed"));

      return { status: 201, body: { id: rideId, state: "REQUESTED" } };
    });

    return reply.code(status).send(respBody);
  });

  app.get("/rides/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ride = await loadRideForActor(id, request.actor!);
    if (!ride) return reply.code(404).send({ error: "Not found" });
    const invoice = ride.state === "TRIP_COMPLETED" ? await prisma.invoice.findUnique({ where: { rideId: id } }) : null;
    return reply.send({ ...ride, invoice });
  });

  app.post("/rides/:id/cancel", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    const { id } = request.params as { id: string };
    const body = z.object({ reason: z.string().optional() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const { status, body: respBody } = await withIdempotency(actor.actorId, "POST /rides/:id/cancel", idempotencyKey(request), async () => {
      const ride = await prisma.ride.findUnique({ where: { id } });
      if (!ride) return { status: 404, body: { error: "Not found" } };

      let cancelledBy: "USER" | "DRIVER" | null = null;
      if (ride.userId === actor.actorId) cancelledBy = "USER";
      else if (ride.driverId) {
        const driver = await prisma.driver.findUnique({ where: { id: ride.driverId } });
        if (driver?.userId === actor.actorId) cancelledBy = "DRIVER";
      }
      if (!cancelledBy) return { status: 403, body: { error: "Not your ride" } };

      try {
        await transitionRide(id, cancelledBy === "USER" ? "CANCELLED_BY_USER" : "CANCELLED_BY_DRIVER", {
          actorId: actor.actorId,
        });
      } catch (err) {
        if (err instanceof InvalidTransitionError) return { status: 409, body: { error: err.message } };
        throw err;
      }
      await prisma.ride.update({ where: { id }, data: { cancelReason: body.data.reason, cancelledBy } });
      return { status: 200, body: { id, cancelledBy } };
    });

    return reply.code(status).send(respBody);
  });

  app.post("/rides/:id/rating", { preHandler: requireAuth }, async (request, reply) => {
    const actor = request.actor!;
    const { id } = request.params as { id: string };
    const body = z.object({ stars: z.number().int().min(1).max(5), comment: z.string().optional() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride || ride.userId !== actor.actorId) return reply.code(404).send({ error: "Not found" });
    if (ride.state !== "TRIP_COMPLETED" || !ride.driverId) {
      return reply.code(409).send({ error: "Ride is not completed yet" });
    }

    const existing = await prisma.rating.findUnique({ where: { rideId: id } });
    if (existing) return reply.code(409).send({ error: "Already rated" });

    await prisma.$transaction(async (tx) => {
      await tx.rating.create({
        data: { rideId: id, userId: actor.actorId, driverId: ride.driverId!, stars: body.data.stars, comment: body.data.comment },
      });
      const driver = await tx.driver.findUniqueOrThrow({ where: { id: ride.driverId! } });
      const newCount = driver.ratingCount + 1;
      const newAvg = (driver.ratingAvg * driver.ratingCount + body.data.stars) / newCount;
      await tx.driver.update({ where: { id: driver.id }, data: { ratingAvg: newAvg, ratingCount: newCount } });
    });

    return reply.code(201).send({ ok: true });
  });

  // ---- Driver actions -------------------------------------------------------

  app.post("/driver/online", { preHandler: requireDriver }, async (request, reply) => {
    const body = z.object({ online: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    await prisma.driver.update({
      where: { id: request.driver!.id },
      data: { isOnline: body.data.online, lastSeenAt: new Date() },
    });
    if (!body.data.online) {
      await clearDriverLocation(request.driver!.id);
    }
    return reply.send({ online: body.data.online });
  });

  const locationPointSchema = pointSchema.extend({
    accuracyM: z.number().positive(),
    deviceTs: z.coerce.date(),
    speedMps: z.number().nonnegative().optional(),
    heading: z.number().min(0).max(360).optional(),
  });

  app.post("/driver/location", { preHandler: requireDriver }, async (request, reply) => {
    const body = z.object({ points: z.array(locationPointSchema).min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const activeRide = await prisma.ride.findFirst({
      where: { driverId: request.driver!.id, state: { in: [...ACTIVE_RIDE_STATES] } },
      orderBy: { requestedAt: "desc" },
      select: { id: true },
    });

    // §10 threat table ("تزييف الموقع"): reject impossible speeds/jumps,
    // log anomalies for human review — never silently trust raw client
    // GPS. Points are walked in order (not just latest-vs-Redis) so a
    // batch catching up after a gap is checked leg by leg, not as one
    // big implied jump from whatever Redis had before the whole batch.
    let lastAccepted: (typeof body.data.points)[number] | undefined;
    for (const p of body.data.points) {
      const check = await checkLocationPlausibility(request.driver!.id, p, p.accuracyM, p.deviceTs);
      if (!check.plausible) {
        request.log.warn({ driverId: request.driver!.id, point: p, reason: check.reason }, "rejected implausible driver location");
        continue;
      }

      await setDriverLocation(request.driver!.id, p, p.accuracyM);
      lastAccepted = p;

      // §4's "batched" send exists for exactly this: catching up
      // RideLocation's historical trail after a connectivity gap, not
      // just reporting where the driver is right now. Only persisted
      // while there's an active ride to attach the breadcrumbs to.
      if (activeRide) {
        await prisma.$executeRaw`
          INSERT INTO "RideLocation" ("rideId", "driverId", point, "accuracyM", "speedMps", heading, "deviceTs", "serverTs")
          VALUES (${activeRide.id}, ${request.driver!.id},
                  ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326), ${p.accuracyM}, ${p.speedMps ?? null}, ${p.heading ?? null}, ${p.deviceTs}, now())
        `;
      }
    }

    if (lastAccepted) {
      await broadcastDriverLocation(request.driver!.id, lastAccepted, lastAccepted.accuracyM);
    }

    return reply.code(204).send();
  });

  app.post("/rides/:id/accept", { preHandler: requireDriver }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await acceptOffer(id, request.driver!.id);
    } catch (err) {
      if (err instanceof OfferNotAcceptableError) return reply.code(409).send({ error: err.message });
      throw err;
    }
    return reply.send({ id, state: "DRIVER_ARRIVING" });
  });

  app.post("/rides/:id/decline", { preHandler: requireDriver }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride) return reply.code(404).send({ error: "Not found" });
    const pt = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
      SELECT ST_Y(pickup::geometry) as lat, ST_X(pickup::geometry) as lng FROM "Ride" WHERE id = ${id}
    `;
    await declineOffer(id, request.driver!.id, pt[0]!);
    return reply.code(204).send();
  });

  async function driverTransition(
    endpoint: string,
    from: string,
    to: "DRIVER_ARRIVED" | "TRIP_STARTED",
  ) {
    app.post(endpoint, { preHandler: requireDriver }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = pointSchema.partial().safeParse(request.body ?? {});
      if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

      const { status, body: respBody } = await withIdempotency(
        request.driver!.id,
        endpoint,
        idempotencyKey(request),
        async () => {
          const ride = await prisma.ride.findUnique({ where: { id } });
          if (!ride || ride.driverId !== request.driver!.id) return { status: 404, body: { error: "Not found" } };

          try {
            await transitionRide(id, to, {
              point: body.data.lat !== undefined && body.data.lng !== undefined ? { lat: body.data.lat, lng: body.data.lng } : undefined,
              actorId: request.driver!.id,
            });
          } catch (err) {
            if (err instanceof InvalidTransitionError) return { status: 409, body: { error: err.message } };
            throw err;
          }

          if (to === "TRIP_STARTED" && from === "DRIVER_ARRIVED") {
            await prisma.ride.update({ where: { id }, data: { startedAt: new Date() } });
          }

          return { status: 200, body: { id, state: to } };
        },
      );
      return reply.code(status).send(respBody);
    });
  }

  await driverTransition("/rides/:id/arrived", "DRIVER_ARRIVING", "DRIVER_ARRIVED");
  await driverTransition("/rides/:id/start", "DRIVER_ARRIVED", "TRIP_STARTED");

  // Not folded into driverTransition above: ending a ride also issues its
  // invoice (§4 — "POST /rides/:id/end → issues invoice server-side"),
  // which arrived->started/start don't need.
  app.post("/rides/:id/end", { preHandler: requireDriver }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = pointSchema.partial().safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });
    const point = body.data.lat !== undefined && body.data.lng !== undefined ? { lat: body.data.lat, lng: body.data.lng } : undefined;

    const { status, body: respBody } = await withIdempotency(
      request.driver!.id,
      "/rides/:id/end",
      idempotencyKey(request),
      async () => {
        const ride = await prisma.ride.findUnique({ where: { id } });
        if (!ride || ride.driverId !== request.driver!.id) return { status: 404, body: { error: "Not found" } };

        try {
          await transitionRide(id, "TRIP_COMPLETED", { point, actorId: request.driver!.id });
        } catch (err) {
          if (err instanceof InvalidTransitionError) return { status: 409, body: { error: err.message } };
          throw err;
        }
        await prisma.ride.update({ where: { id }, data: { endedAt: new Date() } });

        const invoice = await issueInvoice(id, point);
        return {
          status: 200,
          body: {
            id,
            state: "TRIP_COMPLETED",
            invoice: {
              id: invoice.id,
              totalCents: invoice.totalCents,
              currency: invoice.currency,
              distanceM: invoice.distanceM,
              waitingS: invoice.waitingS,
            },
          },
        };
      },
    );
    return reply.code(status).send(respBody);
  });

  app.post("/rides/:id/waiting/start", { preHandler: requireDriver }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = pointSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride || ride.driverId !== request.driver!.id) return reply.code(404).send({ error: "Not found" });

    try {
      await transitionRide(id, "WAITING", { point: body.data, actorId: request.driver!.id });
    } catch (err) {
      if (err instanceof InvalidTransitionError) return reply.code(409).send({ error: err.message });
      throw err;
    }
    await prisma.$executeRaw`
      INSERT INTO "WaitingEvent" (id, "rideId", "driverId", "startedAt", "startPoint")
      VALUES (${createId()}, ${id}, ${request.driver!.id}, now(),
              ST_SetSRID(ST_MakePoint(${body.data.lng}, ${body.data.lat}), 4326))
    `;
    return reply.send({ id, state: "WAITING" });
  });

  app.post("/rides/:id/waiting/stop", { preHandler: requireDriver }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = pointSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const ride = await prisma.ride.findUnique({ where: { id } });
    if (!ride || ride.driverId !== request.driver!.id) return reply.code(404).send({ error: "Not found" });

    const open = await prisma.waitingEvent.findFirst({
      where: { rideId: id, driverId: request.driver!.id, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!open) return reply.code(409).send({ error: "No waiting period is open for this ride" });

    try {
      await transitionRide(id, "TRIP_STARTED", { point: body.data, actorId: request.driver!.id });
    } catch (err) {
      if (err instanceof InvalidTransitionError) return reply.code(409).send({ error: err.message });
      throw err;
    }
    // durationS computed server-side from the two stored events — never client-supplied (§6).
    await prisma.$executeRaw`
      UPDATE "WaitingEvent"
      SET "endedAt" = now(),
          "endPoint" = ST_SetSRID(ST_MakePoint(${body.data.lng}, ${body.data.lat}), 4326),
          "durationS" = EXTRACT(EPOCH FROM (now() - "startedAt"))::int
      WHERE id = ${open.id}
    `;
    return reply.send({ id, state: "TRIP_STARTED" });
  });
}
