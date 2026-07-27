import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  actorId: string;
  targetUserId?: string | null;
  action: string;
  summary: string;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      targetUserId: params.targetUserId ?? null,
      action: params.action,
      summary: params.summary,
    },
  });
}
