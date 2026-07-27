"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac";
import { notificationSchema } from "@/lib/validation/notification";

export async function searchRecipientsAction(
  query: string,
): Promise<{ id: string; fullName: string; username: string }[]> {
  await requirePermission(PERMISSIONS.MESSAGES_SEND);
  const trimmed = query.trim();
  if (!trimmed) return [];

  const users = await prisma.user.findMany({
    where: {
      role: { in: ["INDIVIDUAL", "BUSINESS"] },
      OR: [
        { fullName: { contains: trimmed, mode: "insensitive" } },
        { username: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, username: true },
    take: 10,
  });

  return users;
}

type NotificationFieldErrors = Partial<Record<"title" | "body" | "recipientIds", string>>;
export type SendNotificationFormState =
  | { error?: string; fieldErrors?: NotificationFieldErrors; success?: boolean }
  | undefined;

export async function sendNotificationAction(
  _prevState: SendNotificationFormState,
  formData: FormData,
): Promise<SendNotificationFormState> {
  const admin = await requirePermission(PERMISSIONS.MESSAGES_SEND);

  const recipientIdsRaw = formData.getAll("recipientIds").map(String);
  const parsed = notificationSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    recipientMode: formData.get("recipientMode"),
    recipientIds: recipientIdsRaw,
    attachmentUrl: formData.get("attachmentUrl") ?? "",
    attachmentKind: formData.get("attachmentKind") || "NONE",
  });

  if (!parsed.success) {
    const fieldErrors: NotificationFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NotificationFieldErrors;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;

  let recipientUserIds: string[];
  if (data.recipientMode === "all") {
    const allCustomers = await prisma.user.findMany({
      where: { role: { in: ["INDIVIDUAL", "BUSINESS"] } },
      select: { id: true },
    });
    recipientUserIds = allCustomers.map((u) => u.id);
  } else {
    recipientUserIds = data.recipientIds ?? [];
  }

  if (recipientUserIds.length === 0) {
    return { fieldErrors: { recipientIds: "اختر مستلمًا واحدًا على الأقل" } };
  }

  await prisma.notification.create({
    data: {
      senderId: admin.id,
      title: data.title,
      body: data.body,
      broadcast: data.recipientMode === "all",
      attachmentKind: data.attachmentUrl ? data.attachmentKind || "FILE" : "NONE",
      attachmentUrl: data.attachmentUrl || null,
      recipients: {
        create: recipientUserIds.map((userId) => ({ userId })),
      },
    },
  });

  revalidatePath("/admin/messages");
  return { success: true };
}
