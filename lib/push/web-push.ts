import { encryptPushMessage, RECORD_SIZE, type PushKeys } from "./aes128gcm.ts";
import { vapidAuthorization, type VapidKeys } from "./vapid.ts";
import type { PushPayload } from "./types.ts";

/**
 * Sending one push to one browser.
 *
 * A web subscription is three values, so the device row stores the whole thing
 * JSON-encoded in the column that holds a native token. Parsing it here rather
 * than in the dispatcher keeps everything that knows the shape of a web
 * subscription in one file.
 */

export type WebPushSubscription = Readonly<{ endpoint: string } & PushKeys>;

export function parseWebPushSubscription(token: string): WebPushSubscription | null {
  try {
    const value = JSON.parse(token) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
    const endpoint = typeof value.endpoint === "string" ? value.endpoint : "";
    const p256dh = typeof value.keys?.p256dh === "string" ? value.keys.p256dh : "";
    const auth = typeof value.keys?.auth === "string" ? value.keys.auth : "";
    if (!endpoint.startsWith("https://") || !p256dh || !auth) return null;
    return { endpoint, p256dh, auth };
  } catch {
    return null;
  }
}

export type WebPushResult =
  | { status: "sent" }
  /** The subscription is gone. The caller disables the device rather than retrying. */
  | { status: "unregistered"; detail: string }
  | { status: "failed"; detail: string };

/** Four minutes. Long enough for a phone that is asleep, short enough to stay news. */
const TTL_SECONDS = 240;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The payload the service worker reads. Deliberately the same four fields the
 * in-app notification row already carries, so a push can never say something the
 * bell does not.
 */
const encodePayload = (payload: PushPayload) =>
  Buffer.from(JSON.stringify({
    title: payload.title,
    body: payload.body,
    href: payload.href,
    category: payload.category,
  }));

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: PushPayload,
  keys: VapidKeys,
  subject: string,
): Promise<WebPushResult> {
  const plaintext = encodePayload(payload);
  // The record has to hold the plaintext, the delimiter byte and the GCM tag.
  if (plaintext.length + 17 > RECORD_SIZE) return { status: "failed", detail: "payload_too_large" };

  let body: Buffer;
  try {
    body = encryptPushMessage(plaintext, subscription).body;
  } catch (cause) {
    // A malformed key is a property of the stored row, not of the network, and
    // retrying it three times will fail three times.
    return { status: "unregistered", detail: `unregistered: ${cause instanceof Error ? cause.message : "invalid_subscription"}` };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidAuthorization(subscription.endpoint, keys, subject),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(TTL_SECONDS),
        Urgency: "normal",
      },
      body: new Uint8Array(body),
      signal: controller.signal,
    });
    if (response.status === 201 || response.status === 200 || response.status === 202) return { status: "sent" };
    // 404 and 410 are the push service saying this subscription no longer
    // exists - the browser was uninstalled, or the permission was revoked. The
    // word matters: `mark_push_delivery` disables the device on it.
    if (response.status === 404 || response.status === 410)
      return { status: "unregistered", detail: `unregistered: ${response.status}` };
    return { status: "failed", detail: `${response.status} ${(await response.text()).slice(0, 200)}` };
  } catch (cause) {
    return { status: "failed", detail: cause instanceof Error ? cause.name : "request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}
