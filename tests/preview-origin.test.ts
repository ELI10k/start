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

// The helper reads next/headers, which cannot be imported outside a request. The
// branch that matters is which source it chooses, so that is what is pinned.
test("a sign-in that started on a preview never points at production", async () => {
  const helper = await source("lib/auth/site-url.ts");
  // Production always uses the public custom domain. This is also the domain
  // associated with the native app, so a stale Vercel alias cannot break
  // Universal Links in magic-link emails.
  assert.match(helper, /if \(process\.env\.VERCEL_ENV === "production"\)/);
  assert.match(helper, /const PRODUCTION_SITE_URL = "https:\/\/start\.elicohenfitness\.co\.il"/);
  assert.match(helper, /return PRODUCTION_SITE_URL;/);
  // Everything else answers on the origin the request arrived on. The production
  // URL is not reachable from that branch at all.
  const preview = helper.slice(helper.indexOf("return (await requestOrigin())"));
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
  const helper = await source("lib/auth/site-url.ts");
  // No scheme, no path, no second host smuggled in behind a comma.
  assert.match(helper, /const HOST_ONLY = \/\^\[a-z0-9\.-\]\+\(:\\d\{2,5\}\)\?\$\/i/);
  assert.ok(helper.includes('.split(",")[0]'), "a comma-separated header must be reduced to its first value");
  assert.match(helper, /if \(protocol !== "http" && protocol !== "https"\) return "";/);
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
  const helper = await source("lib/auth/site-url.ts");
  assert.match(helper, /export const isPreviewDeployment = \(\) => process\.env\.VERCEL_ENV === "preview"/);
  const layout = await source("app/coach/layout.tsx");
  assert.match(layout, /preview=\{isPreviewDeployment\(\)\}/);
  const nav = await source("components/coach/CoachNav.tsx");
  assert.match(nav, /data-testid="preview-badge"/);
  assert.match(nav, /preview&&/);
  // The nav is a client component; it must not try to read the env itself.
  assert.doesNotMatch(nav, /process\.env/);
});

test("automatic training assignment is a visible choice the coach can refuse", async () => {
  const form = await source("components/coach/CreateClientForm.tsx");
  assert.match(form, /TrainingIntakeFields preview=/);
  const fields = await source("components/coach/TrainingIntakeFields.tsx");
  assert.match(fields, /name="autoAssignProgrammes"/);
  assert.match(fields, /התאם ושייך תוכנית אוטומטית לפי האפיון/);

  const actions = await source("app/actions/onboarding.ts");
  // Nothing is assigned unless the box is ticked.
  assert.match(actions, /const autoAssign=value\(form,"autoAssignProgrammes"\)==="on"/);
  assert.match(actions, /if\(autoAssign\)/);
  assert.match(actions, /assignPersonalizedTraining\(admin,clientId,intakeFromForm\(form\)\)/);
});

test("assignment still only ever adds, so a level change cannot touch history", async () => {
  const sql = await source("supabase/migrations/20261004121752_personalized_workout_catalog.sql");
  assert.match(sql, /if exists\(select 1 from public.workout_assignments where client_id=p_client_id and status='active'\) then return 'already_active'/);
  assert.doesNotMatch(sql, /delete from|update public.workout_assignments/i);
});
