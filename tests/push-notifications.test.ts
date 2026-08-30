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
  // Off a browser entirely - there is no window here - and with no VAPID key
  // configured, which is the other way a deployment ends up with no transport.
  assert.equal(resolvePushProvider().platform, "none");
  assert.equal(resolvePushProvider("   ").platform, "none");
  assert.match(pushReason("unavailable"), /פעמון/);
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
  const dispatch = await source("lib/push/dispatch.ts");
  assert.match(dispatch, /credentials are not configured/);
  // APNs and FCM are still absent rather than stubbed: a fake success would mark
  // the row sent and lose the notification for good.
  assert.match(dispatch, /transport is not implemented/);
  // The route is a wrapper now, and still not callable from the open internet.
  const route = await source("app/api/push/dispatch/route.ts");
  assert.match(route, /Bearer \$\{secret\}/);
});

test("web push has real credentials, and they are this deployment's own", async () => {
  const dispatch = await source("lib/push/dispatch.ts");
  // A VAPID pair is generated locally; no Apple or Google account is involved,
  // so web-push is the one provider that can be credentialled today.
  assert.match(dispatch, /provider === "web-push"[\s\S]{0,80}Boolean\(vapidKeysFromEnv\(\)\)/);
  assert.match(dispatch, /sendWebPush\(/);
  // A subscription the transport cannot read is not retried three times.
  assert.match(dispatch, /"failed", "unregistered: malformed subscription"/);
});

test("a dead subscription disables the device instead of being retried forever", async () => {
  const transport = await source("lib/push/web-push.ts");
  // 404 and 410 are the push service saying the subscription is gone. The word
  // "unregistered" is what mark_push_delivery keys the disable off.
  assert.match(transport, /status === 404 \|\| response\.status === 410/);
  assert.match(transport, /unregistered: \$\{response\.status\}/);
  const migration = await source("supabase/migrations/202608110003_push_devices.sql");
  assert.match(migration, /ilike '%unregistered%'/);
});

test("a push is sent the moment the notification is written, not on the next cron", async () => {
  // Two cron slots exist for the whole product. A reminder that goes out when
  // the scheduler next happens to run is a reminder about something that has
  // already passed.
  for (const path of ["app/actions/messages.ts", "app/actions/coach.ts"]) {
    assert.match(await source(path), /dispatchPushSoon\(\)/, path);
  }
  // And it can never be the reason the thing it accompanies fails to save.
  const dispatch = await source("lib/push/dispatch.ts");
  // `after`, not a floating promise: a serverless function may stop the moment
  // it has answered, and an unawaited send started just before that never runs.
  assert.match(dispatch, /import \{ after \} from "next\/server"/);
  assert.match(dispatch, /after\(drain\)/);
  // The scheduled runs drain too, so nothing a write-time attempt missed is lost.
  assert.match(await source("app/api/cron/reminders/route.ts"), /dispatchPushDeliveries\(\)/);
  assert.match(await source("app/api/cron/evening/route.ts"), /steps\.pushDispatch = await dispatchPushDeliveries\(\)/);
});

test("the service worker shows every push it is handed, and taps stay in the app", async () => {
  const worker = await source("public/sw.js");
  assert.match(worker, /self\.addEventListener\("push"/);
  assert.match(worker, /self\.addEventListener\("notificationclick"/);
  // A payload it cannot read is still a real notification. Swallowing one is
  // how a browser decides to revoke the permission.
  assert.match(worker, /NOTIFICATION_FALLBACK/);
  // The same guard the in-app deep link has: an absolute URL in a payload must
  // not take a tap to another site.
  assert.match(worker, /startsWith\("\/"\) && !data\.href\.startsWith\("\/\/"\)/);
  // A new worker has to be published for any of this to reach an installed app.
  assert.match(worker, /const VERSION = "v3"/);
});

test("a web subscription is stored whole, and the column is wide enough for it", async () => {
  const migration = await source("supabase/migrations/202608300001_web_push_carries_a_subscription.sql");
  assert.match(migration, /between 8 and 4096/);
  // The endpoint plus two keys, JSON-encoded into the token the row already has.
  const transport = await source("lib/push/web-push.ts");
  assert.match(transport, /export function parseWebPushSubscription/);
  assert.match(transport, /endpoint\.startsWith\("https:\/\/"\)/);
});
