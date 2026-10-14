import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the Play build keeps the published identity", async () => {
  const gradle = await source("android/app/build.gradle");
  // Google Play ties the listing to this id for good; it is not the iOS bundle id.
  assert.match(gradle, /applicationId "co\.il\.startcoaching\.app"/);
  assert.match(gradle, /versionName "1\.0"/);
  assert.match(gradle, /versionCode \d+/);
  const strings = await source("android/app/src/main/res/values/strings.xml");
  assert.match(strings, /<string name="app_name">LIFE FIT<\/string>/);
});

test("release signing comes from the environment, never from the repository", async () => {
  const gradle = await source("android/app/build.gradle");
  assert.match(gradle, /System\.getenv\("LIFE_FIT_UPLOAD_KEYSTORE"\)/);
  assert.match(gradle, /storePassword System\.getenv\("LIFE_FIT_UPLOAD_KEYSTORE_PASSWORD"\)/);
  assert.match(gradle, /signingConfig signingConfigs\.release/);
  // No literal passwords and no keystore path checked in.
  assert.doesNotMatch(gradle, /(store|key)Password\s+["']/);
  assert.doesNotMatch(gradle, /\.(jks|keystore)["']/);
  const ignore = await source(".gitignore");
  assert.match(ignore, /^\*\.jks$/m);
  assert.match(ignore, /^\*\.keystore$/m);
});

test("the release bundle points at production", async () => {
  const script = await source("scripts/android/bundle-release.sh");
  assert.match(script, /START_NATIVE_SERVER_URL="https:\/\/start\.elicohenfitness\.co\.il" npx cap sync android/);
  assert.match(script, /security find-generic-password/);
  assert.match(script, /jarsigner" -verify/);
});

test("the upload key is never replaced by accident", async () => {
  const script = await source("scripts/android/create-upload-keystore.sh");
  assert.match(script, /already exists[\s\S]*exit 1/);
  // The password is typed by the owner and reaches the Keychain over stdin.
  assert.match(script, /read -r -s/);
  assert.match(script, /security -i/);
});

test("Android uses the LIFE FIT mark, not the old START wordmark", async () => {
  const background = await source("android/app/src/main/res/values/ic_launcher_background.xml");
  assert.match(background, /#000000/);
  const generator = await source("scripts/android/generate-android-assets.mjs");
  assert.match(generator, /AppIcon\.appiconset\/AppIcon-512@2x\.png/);
});

test("sign-in emails open in the Android app, verified by assetlinks.json", async () => {
  const manifest = await source("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /<intent-filter android:autoVerify="true">/);
  assert.match(manifest, /android:host="start\.elicohenfitness\.co\.il"/);
  assert.match(manifest, /android:path="\/auth\/confirm-link"/);
  assert.match(manifest, /android:path="\/auth\/confirm-invite"/);

  const { PACKAGE_NAME, androidFingerprints } = await import("../lib/native/assetlinks.ts");
  assert.equal(PACKAGE_NAME, "co.il.startcoaching.app");
  const upload = "37:D8:01:4C:2E:1B:C3:77:49:97:9E:B9:96:B9:57:64:E0:E1:D6:0F:A5:D4:D5:AE:D3:B5:FB:C7:4E:BA:8E:55";
  assert.deepEqual(androidFingerprints(""), [upload]);
  // The Play app signing key is added from the environment; junk is ignored.
  const play = "AA:".repeat(31) + "AA";
  assert.deepEqual(androidFingerprints(`${play.toLowerCase()}, not-a-hash`), [upload, play]);
});

test("Android never calls into Firebase without a Firebase project", async () => {
  const bridge = await source("components/native/NativeBridge.tsx");
  assert.match(bridge, /isAvailable: async \(\) => platform === "ios"/);
  for (const call of bridge.matchAll(/PushNotifications\.register\(\)/g)) {
    const line = bridge.slice(bridge.lastIndexOf("\n", call.index), call.index);
    assert.match(line, /platform === "ios"/);
  }
});
