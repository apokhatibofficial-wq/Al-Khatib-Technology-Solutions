"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();

  await prisma.notificationRecipient.updateMany({
    where: { notificationId, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/dashboard/notifications");
}
