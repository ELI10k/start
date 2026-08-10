import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const bytes = async (path: string) => (await stat(new URL(`../${path}`, import.meta.url))).size;

test("the app is named and identified the same way everywhere", async () => {
  const config = await source("capacitor.config.ts");
  const strings = await source("android/app/src/main/res/values/strings.xml");
  const plist = await source("ios/App/App/Info.plist");
  assert.match(config, /co\.il\.startcoaching\.app/);
  assert.match(strings, /<string name="package_name">co\.il\.startcoaching\.app<\/string>/);
  assert.match(strings, /<string name="app_name">START<\/string>/);
  assert.match(plist, /<key>CFBundleDisplayName<\/key>\s*<string>START<\/string>/);
});

test("the icon exists at every density the stores ask for", async () => {
  const icons = [
    "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
    "android/app/src/main/res/mipmap-mdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png",
    "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
    "public/apple-touch-icon.png",
  ];
  for (const path of icons) {
    assert.ok((await bytes(path)) > 200, `${path} is missing or empty`);
  }
});

test("the icon is full bleed, and the adaptive foreground keeps its safe zone", async () => {
  const script = await source("scripts/generate-app-icons.mjs");
  // A pre-rounded mark inside a white margin renders as a small icon floating
  // in a tile once the system applies its own mask.
  assert.match(script, /<rect width="1024" height="1024" fill="\$\{INK\}"\/>/);
  // The adaptive foreground must be transparent, everything else must not be.
  assert.match(script, /transparent \? image : image\.flatten/);
  assert.match(script, /ic_launcher_foreground\.png", svg: foreground[^}]*transparent: true/);
});

test("every permission the app asks for says why, in Hebrew", async () => {
  const plist = await source("ios/App/App/Info.plist");
  for (const key of [
    "NSHealthShareUsageDescription",
    "NSHealthUpdateUsageDescription",
    "NSCameraUsageDescription",
    "NSPhotoLibraryUsageDescription",
  ]) {
    const match = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`).exec(plist);
    assert.ok(match, `${key} is missing`);
    // A one-word string passes App Review's parser and fails its reviewer.
    assert.ok(match[1].length > 40, `${key} does not explain itself: ${match[1]}`);
    assert.match(match[1], /[֐-׿]/, `${key} is not in Hebrew`);
  }
});

test("the shell is pinned to a deployment at sync time", async () => {
  const checklist = await source("docs/testflight-checklist.md");
  assert.match(checklist, /START_NATIVE_SERVER_URL/);
  // The mistake worth warning about: archiving against a Preview URL.
  assert.match(checklist, /capacitor\.config\.json/);
  assert.match(checklist, /BLOCKED-EXTERNAL/);
  // Every external blocker is named with what it unblocks.
  for (const item of ["Apple Developer Program", "APNs key", "FCM service account", "Health Connect"]) {
    assert.ok(checklist.includes(item), `checklist does not mention ${item}`);
  }
});
