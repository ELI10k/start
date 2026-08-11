import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { nativePushProvider, pushReason, resolvePushProvider, safeDeepLink, unavailablePushProvider } from "../lib/push/providers.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("a tapped notification can only land inside the app", () => {
  assert.equal(safeDeepLink("/workouts"), "/workouts");
  assert.equal(safeDeepLink("/check-in?week=32"), "/check-in?week=32");
  // An absolute URL in a payload would take a client off to another site.
  assert.equal(safeDeepLink("https://example.com/phish"), "/notifications");
  assert.equal(safeDeepLink("//example.com"), "/notifications");
  assert.equal(safeDeepLink("javascript:alert(1)"), "/notifications");
  assert.equal(safeDeepLink(undefined), "/notifications");
  assert.equal(safeDeepLink(42), "/notifications");

  // The paths deep links are actually issued for. Hyphens matter here: the
  // control-character guard once carried its range as raw bytes, which reads as
  // "[ -]" and would reject every one of these if it were ever taken literally.
  for (const path of ["/check-in", "/auth/confirm-link?token_hash=abc", "/workouts/history", "/progress/measurements"]) {
    assert.equal(safeDeepLink(path), path, `${path} must survive the guard`);
  }

  // What the guard is actually for: a control character smuggled into a
  // payload. Written as escapes so the source stays readable - which is the
  // whole point of the change these assertions accompany.
  assert.equal(safeDeepLink("/workouts\u0000/../evil"), "/notifications");
  assert.equal(safeDeepLink("/work\u001fouts"), "/notifications");
  assert.equal(safeDeepLink("/workouts\u007f"), "/notifications");
  // A plain space is not a control character and is left alone; a path with
  // one is merely unusual, not dangerous.
  assert.equal(safeDeepLink("/a b"), "/a b");
});

test("a browser has no push transport, and says so", async () => {
  assert.equal(await unavailablePushProvider.isAvailable(), false);
  assert.equal(await unavailablePushProvider.getPermission(), "unavailable");
  assert.equal(await unavailablePushProvider.getRegistration(), undefined);
  assert.equal(resolvePushProvider().platform, "none");
  assert.match(pushReason("unavailable"), /בדפדפן/);
  assert.match(pushReason("denied"), /נדחו/);
  assert.equal(pushReason("granted"), "");
});

test("a bridge that throws degrades instead of crashing the screen", async () => {
  const broken = nativePushProvider({
    platform: "ios",
    provider: "apns",
    isAvailable: () => { throw new Error("bridge gone"); },
    getPermission: () => { throw new Error("bridge gone"); },
    requestPermission: () => { throw new Error("bridge gone"); },
    getToken: () => { throw new Error("bridge gone"); },
  });
  assert.equal(await broken.isAvailable(), false);
  assert.equal(await broken.getPermission(), "unavailable");
  assert.equal(await broken.requestPermission(), "denied");
  assert.equal(await broken.getRegistration(), undefined);
  // No token-change or open handler on the bridge is normal, not an error.
  assert.equal(typeof broken.onTokenChange(() => {}), "function");
});

test("a token too short to be real is not registered", async () => {
  const provider = nativePushProvider({
    platform: "android", provider: "fcm",
    isAvailable: () => true, getPermission: () => "granted", requestPermission: () => "granted",
    getToken: () => "short",
  });
  assert.equal(await provider.getRegistration(), undefined);

  const good = nativePushProvider({
    platform: "android", provider: "fcm",
    isAvailable: () => true, getPermission: () => "granted", requestPermission: () => "granted",
    getToken: () => "  a-real-looking-token  ",
  });
  assert.deepEqual(await good.getRegistration(), { token: "a-real-looking-token", platform: "android", provider: "fcm" });
});

test("one outbox row per device, created with the notification itself", async () => {
  const migration = await source("supabase/migrations/202608110003_push_devices.sql");
  assert.match(migration, /create trigger notifications_queue_push after insert on public\.notifications/);
  assert.match(migration, /unique \(notification_id, device_id\)/);
  assert.match(migration, /on conflict \(notification_id, device_id\) do nothing/);
  // Both switches are honoured: the category preference and push on its own.
  assert.match(migration, /public\.notification_enabled\(new\.recipient_id, new\.category\)/);
  assert.match(migration, /select push from public\.notification_preferences/);
});

test("re-registering a token moves it rather than duplicating it", async () => {
  const migration = await source("supabase/migrations/202608110003_push_devices.sql");
  assert.match(migration, /token text not null unique/);
  assert.match(migration, /on conflict \(token\) do update\s+set user_id = auth\.uid\(\)/);
  // A handset the provider says is gone stops being addressed.
  assert.match(migration, /update public\.push_devices set enabled = false/);
});

test("two overlapping dispatch runs cannot send the same notification twice", async () => {
  const migration = await source("supabase/migrations/202608110003_push_devices.sql");
  assert.match(migration, /for update skip locked/);
  assert.match(migration, /attempts < 3/);
  // The dispatcher is service-role only.
  assert.match(migration, /revoke all on function public\.claim_push_deliveries\(integer\), public\.mark_push_delivery\(uuid,text,text\) from public, authenticated/);
});

test("with no credentials the dispatcher records a skip, never a false send", async () => {
  const route = await source("app/api/push/dispatch/route.ts");
  assert.match(route, /credentials are not configured/);
  assert.match(route, /transport is not implemented/);
  assert.doesNotMatch(route, /p_status: "sent"/);
  // And it is not callable from the open internet.
  assert.match(route, /Bearer \$\{secret\}/);
});
