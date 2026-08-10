import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the shell loads the deployed app rather than bundling a rewrite", async () => {
  const config = await source("capacitor.config.ts");
  assert.match(config, /appId: "co\.il\.startcoaching\.app"/);
  assert.match(config, /appName: "START"/);
  assert.match(config, /process\.env\.START_NATIVE_SERVER_URL/);
  // Never plain HTTP: the session cookies travel over this connection.
  assert.match(config, /cleartext: false/);
});

test("safe-area insets actually resolve", async () => {
  const layout = await source("app/layout.tsx");
  // Every env(safe-area-inset-*) rule in the stylesheet is a no-op without this.
  assert.match(layout, /viewportFit: "cover"/);
  const css = await source("app/globals.css");
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  // Pinch-zoom stays available.
  assert.doesNotMatch(layout, /maximumScale/);
  assert.doesNotMatch(layout, /userScalable/);
});

test("nothing outside the bridge imports Capacitor", async () => {
  for (const path of [
    "lib/health/providers.ts",
    "lib/push/providers.ts",
    "lib/analytics/client.ts",
    "components/client/StepsCard.tsx",
    "components/client/PushRegistration.tsx",
  ]) {
    const text = await source(path);
    assert.doesNotMatch(text, /@capacitor/, `${path} should not know it is in a container`);
  }
  const bridge = await source("components/native/NativeBridge.tsx");
  assert.match(bridge, /Capacitor\.isNativePlatform\(\)/);
  // And it does nothing at all on the web.
  assert.match(bridge, /if \(!Capacitor\.isNativePlatform\(\)\) return;/);
});

test("the bridge satisfies the contracts the web layer already wrote against", async () => {
  const bridge = await source("components/native/NativeBridge.tsx");
  assert.match(bridge, /StartHealth\?: unknown/);
  assert.match(bridge, /StartPush\?: unknown/);
  assert.match(bridge, /StartNative\?: \{ platform: string \}/);
  // A deep link goes through the same check a tapped notification does.
  assert.match(bridge, /safeDeepLink/);
  // Permission alone leaves the app unaddressable; registering is what produces
  // the token.
  assert.match(bridge, /if \(state === "granted"\) await PushNotifications\.register\(\)/);
  // Tokens rotate without being asked, so an already-permitted install
  // re-registers on launch.
  assert.match(bridge, /if \(result\.receive === "granted"\) void PushNotifications\.register\(\)/);
  // Every listener is removed.
  assert.match(bridge, /for \(const cleanup of cleanups\) cleanup\(\)/);
});

test("iOS declares why it asks for each permission", async () => {
  const plist = await source("ios/App/App/Info.plist");
  for (const key of ["NSHealthShareUsageDescription", "NSCameraUsageDescription", "NSPhotoLibraryUsageDescription"]) {
    assert.match(plist, new RegExp(key), `${key} is missing - App Review rejects this`);
  }
  // Hebrew strings, because that is what the client reads in the system dialog.
  assert.match(plist, /START מציג את הצעדים היומיים/);
  assert.match(plist, /<string>start<\/string>/);
  assert.match(plist, /remote-notification/);
  // APNs hands the token to the app delegate; without this push is silent.
  const delegate = await source("ios/App/App/AppDelegate.swift");
  assert.match(delegate, /capacitorDidRegisterForRemoteNotifications/);
  assert.match(delegate, /capacitorDidFailToRegisterForRemoteNotifications/);
});

test("Android registers the custom plugin and accepts start:// links", async () => {
  const activity = await source("android/app/src/main/java/co/il/startcoaching/app/MainActivity.java");
  // Registration has to happen before super.onCreate, or the bridge starts
  // without the plugin and the web layer sees it missing.
  assert.match(activity, /registerPlugin\(StartHealthPlugin\.class\);\s*super\.onCreate/);
  const manifest = await source("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:scheme="start"/);
  assert.match(manifest, /android:supportsRtl="true"/);
});

test("the health plugin speaks in calendar days, not instants", async () => {
  const contract = await source("lib/native/health-plugin.ts");
  assert.match(contract, /readDailySteps\(options: \{ fromDay: string; toDay: string \}\)/);
  // The web stub reports unavailable, which is what a browser should see.
  assert.match(contract, /status: "unavailable" as const/);
  const swift = await source("ios/App/App/StartHealthPlugin.swift");
  assert.match(swift, /yyyy-MM-dd/);
  assert.match(swift, /cumulativeSum/);
  // A day with no data is omitted rather than reported as a zero-step day.
  assert.match(swift, /guard steps > 0 else \{ return \}/);
});
