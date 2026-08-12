import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { safeReturnPath } from "../lib/auth/return-path.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// A coach opened a preview, asked for a sign-in link, clicked it, and landed on
// production - seeing the old build and reporting the preview as broken. The
// redirect was built from VERCEL_PROJECT_PRODUCTION_URL, which is literally the
// production domain, whenever NEXT_PUBLIC_SITE_URL was unset. It is set for
// production only.

// The module reads next/headers, which cannot be imported outside a request. The
// branch that matters is which source it chooses, so that is what is pinned.
test("a sign-in that started on a preview never points at production", async () => {
  const module = await source("lib/auth/site-url.ts");
  // Production keeps its configured address.
  assert.match(module, /if \(process\.env\.VERCEL_ENV === "production"\)/);
  assert.match(module, /return configured \|\| \(productionUrl \? `https:\/\/\$\{productionUrl\}` : ""\)/);
  // Everything else answers on the origin the request arrived on. The production
  // URL is not reachable from that branch at all.
  const preview = module.slice(module.indexOf("return (await requestOrigin())"));
  assert.match(preview, /return \(await requestOrigin\(\)\) \|\| configured;/);
  assert.doesNotMatch(preview, /VERCEL_PROJECT_PRODUCTION_URL/);
});

test("no auth redirect is built from a fixed production address any more", async () => {
  for (const path of ["app/login/actions.ts", "app/actions/onboarding.ts"]) {
    const text = await source(path);
    assert.doesNotMatch(text, /VERCEL_PROJECT_PRODUCTION_URL/, `${path} still reaches for the production URL`);
    assert.match(text, /siteUrlForRedirect\(\)/, `${path} does not use the shared origin helper`);
  }
  // And the helper is awaited wherever it is used, or the redirect would be a
  // Promise stringified into the URL.
  const onboarding = await source("app/actions/onboarding.ts");
  assert.doesNotMatch(onboarding, /redirectTo:inviteRedirect\(\)/);
  assert.doesNotMatch(onboarding, /emailRedirectTo:magicLinkRedirect\(\)/);
  assert.match(onboarding, /redirectTo:await inviteRedirect\(\)/);
});

test("the host header is only trusted away from production, and only as a host", async () => {
  const module = await source("lib/auth/site-url.ts");
  // No scheme, no path, no second host smuggled in behind a comma.
  assert.match(module, /const HOST_ONLY = \/\^\[a-z0-9\.-\]\+\(:\\d\{2,5\}\)\?\$\/i/);
  assert.ok(module.includes('.split(",")[0]'), "a comma-separated header must be reduced to its first value");
  assert.match(module, /if \(protocol !== "http" && protocol !== "https"\) return "";/);
});

test("the return path still refuses anything that leaves the site", () => {
  // The origin changes per deployment; where a login may land does not.
  assert.equal(safeReturnPath("https://start-snowy-eight.vercel.app/coach"), null);
  assert.equal(safeReturnPath("//evil.example.com"), null);
  assert.equal(safeReturnPath("http://evil.example.com/x"), null);
  assert.equal(safeReturnPath("/login"), null);
  assert.equal(safeReturnPath("/auth/callback"), null);
  assert.equal(safeReturnPath("/coach/workouts"), "/coach/workouts");
  assert.equal(safeReturnPath("/coach/workouts?day=1"), "/coach/workouts?day=1");
});

test("the PREVIEW badge is decided on the server and cannot show in production", async () => {
  const module = await source("lib/auth/site-url.ts");
  assert.match(module, /export const isPreviewDeployment = \(\) => process\.env\.VERCEL_ENV === "preview"/);
  const layout = await source("app/coach/layout.tsx");
  assert.match(layout, /preview=\{isPreviewDeployment\(\)\}/);
  const nav = await source("components/coach/CoachNav.tsx");
  assert.match(nav, /data-testid="preview-badge"/);
  assert.match(nav, /preview&&/);
  // The nav is a client component; it must not try to read the env itself.
  assert.doesNotMatch(nav, /process\.env/);
});

test("assigning the level's programmes is a choice the coach sees and can refuse", async () => {
  const form = await source("components/coach/CreateClientForm.tsx");
  assert.match(form, /name="autoAssignProgrammes"/);
  assert.match(form, /שייך תוכנית אימונים אוטומטית לפי הרמה/);
  // The programmes are named before the coach submits, and each can be unticked.
  assert.match(form, /PROGRAMMES_BY_LEVEL\[level\]\.map/);
  assert.match(form, /name="levelProgrammes"/);

  const actions = await source("app/actions/onboarding.ts");
  // Nothing is assigned unless the box is ticked.
  assert.match(actions, /const autoAssign=value\(form,"autoAssignProgrammes"\)==="on"/);
  assert.match(actions, /if\(traineeLevel&&autoAssign\)await assignLevelProgrammes/);
  // And only the programmes that were left ticked.
  assert.match(actions, /chosenNames\.length/);
  assert.match(actions, /wanted\.filter\(programme=>chosenNames\.includes\(programme\.name\.trim\(\)\)\)/);
});

test("assignment still only ever adds, so a level change cannot touch history", async () => {
  const actions = await source("app/actions/onboarding.ts");
  const fn = actions.slice(actions.indexOf("async function assignLevelProgrammes"), actions.indexOf("const emailPattern"));
  assert.match(fn, /assignmentsToAdd\(level,programmes,assigned\)/);
  assert.doesNotMatch(fn, /\.delete\(\)|\.update\(/);
});
