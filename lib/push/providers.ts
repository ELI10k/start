import type { PushPermissionState, PushProvider, PushRegistration } from "./types.ts";

// A tapped notification decides where the app goes next, so the href it carries
// is treated as untrusted input. Only an in-app path is ever followed: an
// absolute URL in a payload would let whoever can craft one send a client to
// another site from inside the app.
export function safeDeepLink(href: unknown, fallback = "/notifications"): string {
  if (typeof href !== "string") return fallback;
  const value = href.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // No control characters. This guard used to carry the raw bytes inside the
  // character class, which renders as an innocent-looking "[ -]" in every
  // editor and diff - unreadable, and one careless save away from silently
  // becoming a different guard. Escaped, it says what it means.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

export const unavailablePushProvider: PushProvider = {
  platform: "none",
  isAvailable: async () => false,
  getPermission: async () => "unavailable",
  requestPermission: async () => "unavailable",
  getRegistration: async () => undefined,
  onTokenChange: () => () => {},
  onNotificationOpened: () => () => {},
};

// What the native shell has to expose. APNs and FCM differ in every detail
// except this shape; the bridge normalises both to a token and a permission.
export type NativePushBridge = Readonly<{
  platform: "ios" | "android";
  provider: "apns" | "fcm";
  isAvailable: () => Promise<boolean> | boolean;
  getPermission: () => Promise<PushPermissionState> | PushPermissionState;
  requestPermission: () => Promise<PushPermissionState> | PushPermissionState;
  getToken: () => Promise<string | undefined> | string | undefined;
  onTokenChange?: (handler: (token: string) => void) => () => void;
  onNotificationOpened?: (handler: (payload: { href?: string }) => void) => () => void;
}>;

declare global {
  interface Window { StartPush?: NativePushBridge }
}

export function nativePushProvider(bridge: NativePushBridge): PushProvider {
  const registration = (token: string | undefined): PushRegistration | undefined =>
    token && token.trim().length >= 8 ? { token: token.trim(), platform: bridge.platform, provider: bridge.provider } : undefined;
  return {
    platform: bridge.platform,
    isAvailable: async () => { try { return Boolean(await bridge.isAvailable()); } catch { return false; } },
    getPermission: async () => { try { return await bridge.getPermission(); } catch { return "unavailable"; } },
    requestPermission: async () => { try { return await bridge.requestPermission(); } catch { return "denied"; } },
    getRegistration: async () => { try { return registration(await bridge.getToken()); } catch { return undefined; } },
    onTokenChange: (handler) => bridge.onTokenChange?.((token) => {
      const next = registration(token);
      if (next) handler(next);
    }) ?? (() => {}),
    onNotificationOpened: (handler) => bridge.onNotificationOpened?.((payload) => handler(safeDeepLink(payload?.href))) ?? (() => {}),
  };
}

// ------------------------------------------------------------------ the browser

/**
 * The same contract, over the browser's own Push API.
 *
 * No account with Apple or Google is involved here: the subscription is signed
 * with this deployment's VAPID key pair, and the push service is whichever one
 * the browser already talks to. On iOS it works from 16.4, and only once START
 * has been added to the home screen - which is what `isAvailable` is really
 * testing when it looks for PushManager.
 *
 * A subscription is three values, not one - an endpoint and two keys the message
 * is encrypted against - so the whole thing is JSON-encoded into the token the
 * device row already has. Nothing downstream has to know that except the
 * transport that sends it.
 */
const subscriptionToken = (subscription: PushSubscription): string | undefined => {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return undefined;
  return JSON.stringify({ endpoint: json.endpoint, keys: { p256dh, auth } });
};

// The VAPID public key is base64url on the wire and bytes in the browser API.
const applicationServerKey = (publicKey: string): ArrayBuffer => {
  const padded = publicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(publicKey.length / 4) * 4, "=");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
};

export function webPushProvider(publicKey: string): PushProvider {
  const ready = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return undefined;
    return navigator.serviceWorker.ready;
  };
  const permission = (): PushPermissionState =>
    Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "prompt";
  const registrationFrom = (subscription: PushSubscription | null): PushRegistration | undefined => {
    const token = subscription ? subscriptionToken(subscription) : undefined;
    return token ? { token, platform: "web", provider: "web-push" } : undefined;
  };
  // Subscribing is what produces the token, and it is safe to call when one
  // already exists: the browser returns the existing subscription.
  const subscribe = async (): Promise<PushRegistration | undefined> => {
    const worker = await ready();
    if (!worker) return undefined;
    const existing = await worker.pushManager.getSubscription();
    if (existing) return registrationFrom(existing);
    return registrationFrom(await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(publicKey),
    }));
  };

  return {
    platform: "web",
    isAvailable: async () => Boolean(await ready()),
    getPermission: async () => (await ready()) ? permission() : "unavailable",
    requestPermission: async () => {
      if (!(await ready())) return "unavailable";
      if (Notification.permission !== "default") return permission();
      try {
        await Notification.requestPermission();
      } catch {
        return "denied";
      }
      return permission();
    },
    getRegistration: async () => {
      if (permission() !== "granted") return undefined;
      try {
        return await subscribe();
      } catch {
        // A refused or expired subscription is not worth interrupting anyone:
        // the in-app bell still works and the next visit tries again.
        return undefined;
      }
    },
    // The browser rotates a subscription by expiring it, which surfaces as the
    // next `getRegistration` returning something different rather than as an
    // event. There is nothing to subscribe to here.
    onTokenChange: () => () => {},
    // A tapped web notification is routed by the service worker, which focuses
    // or opens the page at the href itself. Nothing to listen for in the page.
    onNotificationOpened: () => () => {},
  };
}

/**
 * The native shell wins where it exists - it is the one that can wake a phone
 * from the App Store build. In every browser, web push stands in, and only where
 * this deployment has been given a VAPID public key.
 */
export function resolvePushProvider(publicKey?: string): PushProvider {
  if (typeof window === "undefined") return unavailablePushProvider;
  if (window.StartPush) return nativePushProvider(window.StartPush);
  const key = publicKey?.trim();
  return key ? webPushProvider(key) : unavailablePushProvider;
}

const REASONS: Record<PushPermissionState, string> = {
  unknown: "",
  unavailable: "הדפדפן הזה לא תומך בהתראות. באייפון צריך להוסיף את START למסך הבית; בינתיים ההתראות מופיעות בפעמון.",
  prompt: "אפשר לאשר התראות כדי לקבל תזכורות גם כשהאפליקציה סגורה.",
  granted: "",
  denied: "ההתראות נדחו. אפשר לאשר אותן מחדש בהגדרות המכשיר.",
};
export const pushReason = (state: PushPermissionState) => REASONS[state];
