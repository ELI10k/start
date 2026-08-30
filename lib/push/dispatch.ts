import "server-only";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseWebPushSubscription, sendWebPush } from "./web-push.ts";
import { vapidKeysFromEnv, vapidSubject } from "./vapid.ts";

/**
 * Draining the push outbox.
 *
 * Lives here rather than inside the route because it has two callers now. The
 * route is still the way a scheduler calls it. The other is the moment a
 * notification is written: a reminder that arrives when the cron next runs is a
 * reminder about something that already happened, and this deployment has two
 * cron slots for the whole product. Draining on write costs one request and
 * makes the delivery immediate, which is the only thing that makes a push worth
 * sending at all.
 *
 * Claiming is what makes the two callers safe together: `claim_push_deliveries`
 * takes rows with `for update skip locked` and counts the attempt, so a
 * scheduled run and a write-triggered run cannot send the same row twice.
 */

type Claimed = Readonly<{
  delivery_id: string;
  token: string;
  platform: string;
  provider: string;
  title: string;
  body: string;
  href: string;
  category: string;
}>;

export type DispatchResult = Readonly<{
  ok: boolean;
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
  message?: string;
}>;

const credentialsFor = (provider: string) =>
  provider === "apns"
    ? Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID)
    : provider === "fcm"
      ? Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON)
      : provider === "web-push"
        ? Boolean(vapidKeysFromEnv())
        : false;

export async function dispatchPushDeliveries(limit = 50): Promise<DispatchResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const empty = { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  if (!url || !serviceKey) return { ok: false, ...empty, message: "Supabase is not configured." };

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("claim_push_deliveries", { p_limit: limit });
  if (error) {
    console.error("push dispatch claim failed", { code: error.code, message: error.message });
    return { ok: false, ...empty, message: error.message };
  }

  const claimed = (data ?? []) as Claimed[];
  const vapid = vapidKeysFromEnv();
  const subject = vapidSubject();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const mark = async (deliveryId: string, status: "sent" | "failed" | "skipped", detail?: string) => {
    const { error: markError } = await supabase.rpc("mark_push_delivery", {
      p_delivery_id: deliveryId,
      p_status: status,
      p_detail: detail ?? null,
    });
    if (markError) console.error("push dispatch mark failed", { deliveryId, message: markError.message });
  };

  // One at a time. These share a serverless function with everything else the
  // request is doing, and fifty concurrent TLS handshakes to three different
  // push services is how the function that was going to answer a person times
  // out instead.
  for (const delivery of claimed) {
    if (!credentialsFor(delivery.provider)) {
      await mark(delivery.delivery_id, "skipped", `${delivery.provider} credentials are not configured`);
      skipped += 1;
      continue;
    }

    if (delivery.provider === "web-push" && vapid) {
      const subscription = parseWebPushSubscription(delivery.token);
      if (!subscription) {
        // Not a subscription this transport can read. Reported as failed with
        // the word that disables the row, so it is not retried twice more.
        await mark(delivery.delivery_id, "failed", "unregistered: malformed subscription");
        failed += 1;
        continue;
      }
      const result = await sendWebPush(
        subscription,
        { title: delivery.title, body: delivery.body, href: delivery.href, category: delivery.category },
        vapid,
        subject,
      );
      if (result.status === "sent") {
        await mark(delivery.delivery_id, "sent");
        sent += 1;
      } else {
        await mark(delivery.delivery_id, "failed", result.detail);
        failed += 1;
      }
      continue;
    }

    // APNs and FCM. Deliberately absent rather than stubbed: a fake success
    // would mark the row sent and lose the notification for good.
    await mark(delivery.delivery_id, "skipped", `${delivery.provider} transport is not implemented`);
    skipped += 1;
  }

  if (claimed.length) console.info("push dispatch ran", { claimed: claimed.length, sent, failed, skipped });
  return { ok: true, claimed: claimed.length, sent, failed, skipped };
}

/**
 * Drain without making the caller wait or care.
 *
 * Called after something writes a notification. A push that cannot be sent must
 * never be the reason a coach's message fails to save, so every outcome here is
 * swallowed - the row stays in the outbox and the next drain picks it up.
 *
 * `after` rather than a bare promise. A serverless function is allowed to stop
 * the moment it has answered, and a floating promise started just before that is
 * simply not finished - which would have made this work locally, where the
 * process keeps running, and silently send nothing in production. `after` is
 * what tells the platform there is still work owed.
 */
export function dispatchPushSoon(): void {
  const drain = () =>
    dispatchPushDeliveries().catch((cause) => {
      console.error("push dispatch on write failed", { message: cause instanceof Error ? cause.message : "unknown" });
    });
  try {
    after(drain);
  } catch {
    // Outside a request scope `after` refuses. Nothing is lost: the row stays
    // in the outbox and a scheduled drain will take it.
    void drain();
  }
}
