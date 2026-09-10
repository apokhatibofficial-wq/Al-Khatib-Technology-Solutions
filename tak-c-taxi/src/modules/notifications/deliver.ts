import { prisma } from "../../db/client.js";
import { sendToSubscription, PushNotConfiguredError } from "./push.js";
import type { Notification } from "../../generated/prisma/client.js";

async function resolveSubscriptions(notification: Notification) {
  if (notification.recipientId) {
    return prisma.pushSubscription.findMany({ where: { userId: notification.recipientId } });
  }

  // Broadcast. ADMIN has no push channel at all — AdminUser has no
  // PushSubscription relation (§3: admins use the web panel), so there's
  // nothing to fan out to, not a failure.
  if (notification.recipientType === "ADMIN") return [];

  if (notification.recipientType === "DRIVER") {
    return prisma.pushSubscription.findMany({ where: { user: { driver: { status: "APPROVED" } } } });
  }

  // PASSENGER or ALL: every user (every account has at least a passenger capacity).
  return prisma.pushSubscription.findMany({});
}

/**
 * Called right after a Notification row is created (admin/routes.ts).
 * Updates deliveryStatus to what actually happened — never a fabricated
 * "SENT" (§9's "no fake data" applies just as much to delivery status as
 * to a fare number).
 */
export async function deliverNotification(notificationId: string): Promise<void> {
  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });

  if (notification.recipientType === "ADMIN" && !notification.recipientId) {
    await prisma.notification.update({ where: { id: notificationId }, data: { deliveryStatus: "NO_CHANNEL" } });
    return;
  }

  const subs = await resolveSubscriptions(notification);
  if (subs.length === 0) {
    await prisma.notification.update({ where: { id: notificationId }, data: { deliveryStatus: "NO_SUBSCRIPTIONS" } });
    return;
  }

  let sent = 0;
  let configuredOk = true;
  for (const sub of subs) {
    try {
      const outcome = await sendToSubscription(sub, { title: notification.title, body: notification.body });
      if (outcome === "sent") sent++;
    } catch (err) {
      if (err instanceof PushNotConfiguredError) {
        configuredOk = false;
        break;
      }
      throw err;
    }
  }

  const deliveryStatus = !configuredOk ? "NOT_CONFIGURED" : sent > 0 ? "SENT" : "FAILED";
  await prisma.notification.update({ where: { id: notificationId }, data: { deliveryStatus } });
}
