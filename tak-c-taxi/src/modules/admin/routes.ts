import { createId } from "@paralleldrive/cuid2";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { requireAdminRole } from "../auth/guard.js";
import { recordAudit } from "./audit.js";
import { deliverNotification } from "../notifications/deliver.js";

const pageSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET routes are open to any admin role (§10's RBAC is about who can
// *mutate* what — read access across the ops surface is the baseline for
// every admin seat, including READONLY, whose entire purpose is exactly this).
const ANY_ADMIN: [] = [];

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // ---- Users ---------------------------------------------------------------

  app.get("/admin/users", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = z.object({ status: z.enum(["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"]).optional() }).merge(pageSchema).safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const users = await prisma.user.findMany({
      where: q.data.status ? { status: q.data.status } : {},
      orderBy: { createdAt: "desc" },
      take: q.data.limit,
      skip: q.data.offset,
    });
    return reply.send({ users });
  });

  app.patch("/admin/users/:id", { preHandler: requireAdminRole("SUPER_ADMIN", "OPS") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]), reason: z.string().optional() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) return reply.code(404).send({ error: "Not found" });

    const after = await prisma.user.update({ where: { id }, data: { status: body.data.status } });
    await recordAudit({
      admin: request.adminUser!,
      action: "user.status.update",
      entity: "User",
      entityId: id,
      oldValue: { status: before.status },
      newValue: { status: after.status },
      reason: body.data.reason,
      request,
    });
    return reply.send(after);
  });

  // ---- Drivers ---------------------------------------------------------------

  app.get("/admin/drivers", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).optional() }).merge(pageSchema).safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const drivers = await prisma.driver.findMany({
      where: q.data.status ? { status: q.data.status } : {},
      include: { user: { select: { fullName: true, email: true } }, vehicles: true },
      orderBy: { createdAt: "desc" },
      take: q.data.limit,
      skip: q.data.offset,
    });
    return reply.send({ drivers });
  });

  async function driverStatusChange(endpoint: string, action: string, toStatus: "APPROVED" | "REJECTED" | "SUSPENDED", fromStatuses: string[]) {
    app.post(endpoint, { preHandler: requireAdminRole("SUPER_ADMIN", "OPS") }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z.object({ reason: z.string().optional() }).safeParse(request.body ?? {});
      if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

      const before = await prisma.driver.findUnique({ where: { id } });
      if (!before) return reply.code(404).send({ error: "Not found" });
      if (!fromStatuses.includes(before.status)) {
        return reply.code(409).send({ error: `Cannot ${action} a driver in status ${before.status}` });
      }

      const after = await prisma.driver.update({
        where: { id },
        data: {
          status: toStatus,
          ...(toStatus === "APPROVED" ? { approvedById: request.adminUser!.id, approvedAt: new Date() } : {}),
        },
      });
      await recordAudit({
        admin: request.adminUser!,
        action: `driver.${action}`,
        entity: "Driver",
        entityId: id,
        oldValue: { status: before.status },
        newValue: { status: after.status },
        reason: body.data.reason,
        request,
      });
      return reply.send(after);
    });
  }
  await driverStatusChange("/admin/drivers/:id/approve", "approve", "APPROVED", ["PENDING"]);
  await driverStatusChange("/admin/drivers/:id/reject", "reject", "REJECTED", ["PENDING"]);
  await driverStatusChange("/admin/drivers/:id/suspend", "suspend", "SUSPENDED", ["APPROVED"]);

  // ---- Rides / invoices / ratings (read-only ops visibility) -----------------

  app.get("/admin/rides", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = z.object({ state: z.string().optional() }).merge(pageSchema).safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const rides = await prisma.ride.findMany({
      where: q.data.state ? { state: q.data.state as never } : {},
      orderBy: { requestedAt: "desc" },
      take: q.data.limit,
      skip: q.data.offset,
    });
    return reply.send({ rides });
  });

  app.get("/admin/invoices", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = pageSchema.safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const invoices = await prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, take: q.data.limit, skip: q.data.offset });
    return reply.send({ invoices });
  });

  app.get("/admin/ratings", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = pageSchema.safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const ratings = await prisma.rating.findMany({ orderBy: { createdAt: "desc" }, take: q.data.limit, skip: q.data.offset });
    return reply.send({ ratings });
  });

  // ---- Cities & pricing (§9 — no city or fare hardcoded; both are ops-managed) -

  app.get("/admin/cities", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (_request, reply) => {
    const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
    return reply.send({ cities });
  });

  app.post("/admin/cities", { preHandler: requireAdminRole("SUPER_ADMIN") }, async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(1),
        centroid: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
        // GeoJSON-style ring: [[lng,lat], [lng,lat], ..., first-point-repeated-last].
        boundaryRing: z.array(z.tuple([z.number(), z.number()])).min(4),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const ring = body.data.boundaryRing.map(([lng, lat]) => `${lng} ${lat}`).join(", ");
    const id = createId();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "City" (id, name, centroid, boundary, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), ST_SetSRID(ST_GeomFromText($5), 4326), true, now(), now())`,
      id,
      body.data.name,
      body.data.centroid.lng,
      body.data.centroid.lat,
      `POLYGON((${ring}))`,
    );
    const city = await prisma.city.findUniqueOrThrow({ where: { id } });
    await recordAudit({ admin: request.adminUser!, action: "city.create", entity: "City", entityId: id, newValue: { name: body.data.name }, request });
    return reply.code(201).send(city);
  });

  app.get("/admin/pricing", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = z.object({ cityId: z.string().optional() }).merge(pageSchema).safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const versions = await prisma.pricingVersion.findMany({
      where: q.data.cityId ? { cityId: q.data.cityId } : {},
      orderBy: { effectiveFrom: "desc" },
      take: q.data.limit,
      skip: q.data.offset,
    });
    return reply.send({ pricingVersions: versions });
  });

  // §9: "تعديلها من اللوحة يُنشئ نسخة جديدة بتاريخ سريان" — this only ever
  // INSERTs a new version; nothing here can mutate an existing one.
  app.post("/admin/pricing", { preHandler: requireAdminRole("SUPER_ADMIN", "FINANCE") }, async (request, reply) => {
    const body = z
      .object({
        cityId: z.string().min(1),
        pricePerUnitCents: z.number().int().positive(),
        unitMeters: z.number().int().positive(),
        baseFareCents: z.number().int().min(0),
        minFareCents: z.number().int().min(0),
        waitingFeePerMinCents: z.number().int().min(0),
        currency: z.string().min(1),
        effectiveFrom: z.coerce.date().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const city = await prisma.city.findUnique({ where: { id: body.data.cityId } });
    if (!city) return reply.code(404).send({ error: "City not found" });

    const version = await prisma.pricingVersion.create({
      data: {
        cityId: body.data.cityId,
        pricePerUnit: body.data.pricePerUnitCents,
        unitMeters: body.data.unitMeters,
        baseFare: body.data.baseFareCents,
        minFare: body.data.minFareCents,
        waitingFeePerMin: body.data.waitingFeePerMinCents,
        currency: body.data.currency,
        effectiveFrom: body.data.effectiveFrom ?? new Date(),
        createdById: request.adminUser!.id,
      },
    });
    await recordAudit({
      admin: request.adminUser!,
      action: "pricing.create",
      entity: "PricingVersion",
      entityId: version.id,
      newValue: version,
      request,
    });
    return reply.code(201).send(version);
  });

  // ---- Announcements -----------------------------------------------------

  app.get("/admin/announcements", { preHandler: requireAdminRole(...ANY_ADMIN) }, async (request, reply) => {
    const q = pageSchema.safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: q.data.limit, skip: q.data.offset });
    return reply.send({ announcements });
  });

  app.post("/admin/announcements", { preHandler: requireAdminRole("SUPER_ADMIN", "OPS", "SUPPORT") }, async (request, reply) => {
    const body = z
      .object({
        title: z.string().min(1),
        body: z.string().min(1),
        audience: z.enum(["PASSENGER", "DRIVER", "ADMIN", "ALL"]),
        startsAt: z.coerce.date().optional(),
        endsAt: z.coerce.date().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const announcement = await prisma.announcement.create({
      data: { ...body.data, createdById: request.adminUser!.id },
    });
    await recordAudit({ admin: request.adminUser!, action: "announcement.create", entity: "Announcement", entityId: announcement.id, newValue: announcement, request });
    return reply.code(201).send(announcement);
  });

  app.patch("/admin/announcements/:id", { preHandler: requireAdminRole("SUPER_ADMIN", "OPS", "SUPPORT") }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ isActive: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });

    const before = await prisma.announcement.findUnique({ where: { id } });
    if (!before) return reply.code(404).send({ error: "Not found" });

    const after = await prisma.announcement.update({ where: { id }, data: { isActive: body.data.isActive } });
    await recordAudit({
      admin: request.adminUser!,
      action: "announcement.update",
      entity: "Announcement",
      entityId: id,
      oldValue: { isActive: before.isActive },
      newValue: { isActive: after.isActive },
      request,
    });
    return reply.send(after);
  });

  // ---- Notifications -------------------------------------------------------
  // Creates the record only — real delivery (Web Push / FCM) is phase 8.
  // deliveryStatus is honestly "QUEUED", never a fabricated "SENT".

  app.post("/admin/notifications", { preHandler: requireAdminRole("SUPER_ADMIN", "OPS", "SUPPORT") }, async (request, reply) => {
    const body = z
      .object({
        recipientType: z.enum(["PASSENGER", "DRIVER", "ADMIN", "ALL"]),
        recipientId: z.string().optional(),
        title: z.string().min(1),
        body: z.string().min(1),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message });
    if (body.data.recipientType !== "ALL" && !body.data.recipientId) {
      return reply.code(400).send({ error: "recipientId is required unless recipientType is ALL" });
    }

    const notification = await prisma.notification.create({
      data: { ...body.data, deliveryStatus: "QUEUED" },
    });
    await recordAudit({
      admin: request.adminUser!,
      action: "notification.create",
      entity: "Notification",
      entityId: notification.id,
      newValue: notification,
      request,
    });

    // Attempt real delivery now (phase 8) rather than leaving the row at
    // "QUEUED" forever — deliverNotification sets the real outcome
    // (SENT / FAILED / NO_SUBSCRIPTIONS / NOT_CONFIGURED / NO_CHANNEL).
    await deliverNotification(notification.id);
    const delivered = await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
    return reply.code(201).send(delivered);
  });

  // ---- Audit log itself ---------------------------------------------------

  app.get("/admin/audit", { preHandler: requireAdminRole("SUPER_ADMIN") }, async (request, reply) => {
    const q = z.object({ entity: z.string().optional(), actorId: z.string().optional() }).merge(pageSchema).safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: q.error.issues[0]?.message });
    const logs = await prisma.auditLog.findMany({
      where: { ...(q.data.entity ? { entity: q.data.entity } : {}), ...(q.data.actorId ? { actorId: q.data.actorId } : {}) },
      orderBy: { createdAt: "desc" },
      take: q.data.limit,
      skip: q.data.offset,
    });
    return reply.send({ logs });
  });
}
