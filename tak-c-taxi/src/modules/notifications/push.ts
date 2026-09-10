import webpush from "web-push";
import { env } from "../../config/env.js";
import { prisma } from "../../db/client.js";
import type { PushSubscription } from "../../generated/prisma/client.js";

export class PushNotConfiguredError extends Error {}

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new PushNotConfiguredError("VAPID keys are not configured on this server yet.");
  }
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
}

export type PushOutcome = "sent" | "dead" | "failed";

/**
 * Sends to one subscription. A 404/410 from the push service means the
 * subscription is gone for good (uninstalled, permission revoked, browser
 * data cleared) — standard Web Push practice is to delete it rather than
 * keep retrying it forever, so that's done here, not left for a caller to
 * remember.
 */
export async function sendToSubscription(sub: PushSubscription, payload: PushPayload): Promise<PushOutcome> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return "sent";
  } catch (err) {
    const statusCode = err instanceof webpush.WebPushError ? err.statusCode : undefined;
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return "dead";
    }
    return "failed";
  }
}
