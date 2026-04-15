import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function configure() {
  if (configured) return;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  webpush.setVapidDetails(
    `mailto:${process.env.RESEND_FROM ?? "noreply@example.com"}`,
    pub,
    priv
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send a push notification to a single user (all their active subscriptions).
 * Silently removes stale/expired subscriptions (410 Gone).
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  configure();
  if (!configured) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return;

  const data = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    url:   payload.url ?? "/",
    icon:  payload.icon ?? "/icon-192.png",
  });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data
        );
      } catch (err: any) {
        // 410 Gone or 404 = subscription expired — remove it
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }
    })
  );
}

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
