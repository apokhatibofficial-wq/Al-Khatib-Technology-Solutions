"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requirePermission, requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import { PAYMENT_STATUS_LABELS } from "@/lib/subscription";
import type { PaymentStatus } from "@/generated/prisma/client";

const VALID_STATUSES: PaymentStatus[] = ["PAID", "UNPAID", "LATE"];

export async function setSubscriptionStatusAction(userId: string, status: string) {
  const admin = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);
  if (!VALID_STATUSES.includes(status as PaymentStatus)) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await prisma.subscription.update({
    where: { userId },
    data: { status: status as PaymentStatus },
  });

  await logAudit({
    actorId: admin.id,
    targetUserId: userId,
    action: "subscription.status",
    summary: `غيّر حالة اشتراك ${target.fullName} إلى ${PAYMENT_STATUS_LABELS[status as PaymentStatus]}`,
  });

  revalidatePath("/admin/subscriptions");
}

export async function renewCycleAction(userId: string) {
  const admin = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await prisma.subscription.update({
    where: { userId },
    data: { cycleStart: new Date(), lastRenewedAt: new Date(), lastRenewedById: admin.id },
  });

  await logAudit({
    actorId: admin.id,
    targetUserId: userId,
    action: "subscription.renew",
    summary: `جدّد دورة اشتراك ${target.fullName} (30 يومًا من اليوم)`,
  });

  revalidatePath("/admin/subscriptions");
}

export async function togglePageWatermarkAction(userId: string) {
  const admin = await requirePermission(PERMISSIONS.SUBSCRIPTIONS_MANAGE);

  const page = await prisma.publicPage.findUnique({ where: { userId } });
  if (!page) return;

  await prisma.publicPage.update({
    where: { userId },
    data: { showWatermark: !page.showWatermark },
  });

  await logAudit({
    actorId: admin.id,
    targetUserId: userId,
    action: "subscription.watermark",
    summary: `${page.showWatermark ? "أخفى" : "أظهر"} العلامة المائية لحساب واحد`,
  });

  revalidatePath("/admin/subscriptions");
}

export async function toggleGlobalWatermarkAction() {
  const admin = await requireSuperAdmin();

  const current = await prisma.systemSetting.upsert({
    where: { id: "global" },
    create: { id: "global" },
    update: {},
  });

  await prisma.systemSetting.update({
    where: { id: "global" },
    data: { watermarkEnabledGlobally: !current.watermarkEnabledGlobally },
  });

  await logAudit({
    actorId: admin.id,
    action: "settings.watermark",
    summary: `${current.watermarkEnabledGlobally ? "أخفى" : "أظهر"} العلامة المائية على مستوى المنصة بالكامل`,
  });

  revalidatePath("/admin/settings");
}
