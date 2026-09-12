import { createId } from "@paralleldrive/cuid2";
import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/client.js";
import type { Prisma, AdminUser } from "../../generated/prisma/client.js";

interface AuditParams {
  admin: AdminUser;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  request: FastifyRequest;
}

/**
 * §10: "RBAC على السيرفر... Log Audit لكل عملية" — every admin mutation
 * writes one row here. Called explicitly from each handler (not a generic
 * hook) so entity/oldValue/newValue are always the real before/after, not
 * a guess from the raw request body.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      id: createId(),
      actorId: params.admin.id,
      actorRole: params.admin.role,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      oldValue: (params.oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: (params.newValue ?? undefined) as Prisma.InputJsonValue | undefined,
      reason: params.reason,
      ip: params.request.ip,
      userAgent: params.request.headers["user-agent"],
    },
  });
}
