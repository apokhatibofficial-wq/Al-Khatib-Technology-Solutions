"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getEditablePageByUserId } from "@/lib/editable-page";
import { buildPageSnapshot } from "@/lib/page-snapshot";
import { prisma } from "@/lib/prisma";
import { authorizePublish } from "@/lib/profile-access";

export async function markPageDirty(pageId: string) {
  await prisma.publicPage.update({
    where: { id: pageId },
    data: { hasUnpublishedChanges: true },
  });
}

export type PublishResult = { ok: true; firstPublish: boolean } | { ok: false; error: string };

export async function publishPageAction(targetUserId: string): Promise<PublishResult> {
  const actor = await authorizePublish(targetUserId);

  const page = await getEditablePageByUserId(targetUserId);
  if (!page) return { ok: false, error: "الصفحة غير موجودة" };

  const snapshot = buildPageSnapshot(page);
  const isFirstPublish = !page.firstPublishedAt;
  const now = new Date();

  await prisma.publicPage.update({
    where: { id: page.id },
    data: {
      published: true,
      hasUnpublishedChanges: false,
      publishedAt: now,
      firstPublishedAt: isFirstPublish ? now : page.firstPublishedAt,
      publishedSnapshot: JSON.parse(JSON.stringify(snapshot)),
    },
  });

  await logAudit({
    actorId: actor.id,
    targetUserId,
    action: "page.publish",
    summary:
      actor.id === targetUserId
        ? "نشر التعديلات على صفحته العامة"
        : `نشر التعديلات نيابةً على صفحة ${page.user.fullName}`,
  });

  revalidatePath(`/u/${page.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin/review");

  return { ok: true, firstPublish: isFirstPublish };
}
