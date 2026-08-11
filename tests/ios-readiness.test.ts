import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The iOS failures worth testing for are the silent ones: a Swift file that is
// not compiled, a plugin that is never registered, an entitlement that is on
// disk but not wired. None of them break the build - they just make a feature
// quietly not exist.

test("this repo's Swift files are in the target, not just on disk", async () => {
  const project = await source("ios/App/App.xcodeproj/project.pbxproj");
  for (const file of ["StartHealthPlugin.swift", "StartViewController.swift"]) {
    assert.match(project, new RegExp(`path = ${file};`), `${file} has no file reference`);
    assert.ok(project.includes(`/* ${file} in Sources */,`), `${file} is not compiled`);
  }
});

test("the custom health plugin is registered with the bridge", async () => {
  // Capacitor registers npm plugins from its generated list. StartHealth lives
  // in the app target, so nothing registers it unless the view controller does.
  const controller = await source("ios/App/App/StartViewController.swift");
  assert.match(controller, /class StartViewController: CAPBridgeViewController/);
  assert.match(controller, /bridge\?\.registerPluginInstance\(StartHealthPlugin\(\)\)/);

  // And the storyboard has to point at that subclass, not Capacitor's own.
  const storyboard = await source("ios/App/App/Base.lproj/Main.storyboard");
  assert.match(storyboard, /customClass="StartViewController"/);
  assert.doesNotMatch(storyboard, /customClass="CAPBridgeViewController"/);
});

test("the entitlements exist and are wired into both configurations", async () => {
  const entitlements = await source("ios/App/App/App.entitlements");
  assert.match(entitlements, /<key>aps-environment<\/key>/);
  assert.match(entitlements, /<key>com\.apple\.developer\.healthkit<\/key>/);
  assert.match(entitlements, /<key>com\.apple\.developer\.associated-domains<\/key>/);
  assert.match(entitlements, /applinks:start\.elicohenfitness\.co\.il/);

  const project = await source("ios/App/App.xcodeproj/project.pbxproj");
  const wired = project.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) ?? [];
  // Debug and Release. A debug build that cannot register for push is just as
  // broken as a release one.
  assert.equal(wired.length, 2, "entitlements are not wired into both configurations");
});

test("the association file refuses to serve a placeholder team id", async () => {
  const route = await source("app/.well-known/apple-app-site-association/route.ts");
  // iOS caches this file. A guessed Team ID would be cached as a wrong answer.
  assert.match(route, /\/\^\[A-Z0-9\]\{10\}\$\//);
  assert.match(route, /status: 404/);
  assert.match(route, /auth\/confirm-link/);
  assert.match(route, /"content-type": "application\/json"/);
});

test("a cold start from a link is followed, not only a warm one", async () => {
  const bridge = await source("components/native/NativeBridge.tsx");
  // appUrlOpen does not fire when the URL launched the app - which is exactly
  // the magic-link case, since the app is usually closed when the email arrives.
  assert.match(bridge, /App\.getLaunchUrl\(\)/);
  assert.match(bridge, /appUrlOpen/);
  // Both paths go through the same in-app-only check.
  assert.match(bridge, /const target = safeDeepLink/);
});

test("one command re-applies everything cap sync does not own", async () => {
  const sync = await source("scripts/native-sync.mjs");
  assert.match(sync, /register-ios-sources\.mjs/);
  assert.match(sync, /register-ios-entitlements\.mjs/);
  // And it reports what the build is pinned to, because a TestFlight archive
  // aimed at a Preview URL is invisible afterwards.
  assert.match(sync, /server url/);
});
