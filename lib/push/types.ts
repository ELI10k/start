// Push is the same notification the client already gets in the app, delivered
// while the app is closed. The in-app row stays the source of truth: a push
// carries a title, a body and the href that row already has, so tapping it lands
// on the same screen the bell would have taken them to.

export type PushPlatform = "ios" | "android" | "web";
export type PushProviderName = "apns" | "fcm" | "web-push";
export type PushPermissionState = "unknown" | "unavailable" | "prompt" | "granted" | "denied";

export type PushRegistration = Readonly<{ token: string; platform: PushPlatform; provider: PushProviderName }>;

export type PushProvider = Readonly<{
  platform: PushPlatform | "none";
  isAvailable: () => Promise<boolean>;
  getPermission: () => Promise<PushPermissionState>;
  /** Asks the OS, then returns the token if it was granted. */
  requestPermission: () => Promise<PushPermissionState>;
  getRegistration: () => Promise<PushRegistration | undefined>;
  /** Fires when the OS rotates the token, which it does without being asked. */
  onTokenChange: (handler: (registration: PushRegistration) => void) => () => void;
  /** Fires when the user taps a notification. The payload carries the href. */
  onNotificationOpened: (handler: (href: string) => void) => () => void;
}>;

export type PushPayload = Readonly<{ title: string; body: string; href: string; category: string }>;
