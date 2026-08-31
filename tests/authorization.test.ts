import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Every screen under /coach answers the role question itself. proxy.ts is the
// first answer and still runs first; this is the second, for the nine screens
// that had only the first. A page added later that forgets it fails here rather
// than in production.

const pages = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return pages(path);
    return entry === "page.tsx" ? [path] : [];
  });

test("every coach page guards its own role", () => {
  const unguarded = pages("app/coach").filter(
    (path) => !/requireCoach|role\s*!==\s*"coach"/.test(readFileSync(path, "utf8")),
  );
  assert.deepEqual(unguarded, [], `unguarded coach pages: ${unguarded.join(", ")}`);
});

test("getAuthContext refuses an account that is not active", () => {
  assert.match(
    readFileSync("lib/data/product-repository.ts", "utf8"),
    /data\.status\s*!==\s*"active"/,
  );
});

test("the scheduler secret is compared in constant time", () => {
  const routes = [
    "app/api/cron/daily-coach/route.ts",
    "app/api/cron/evening/route.ts",
    "app/api/cron/reminders/route.ts",
    "app/api/cron/weekly-summary/route.ts",
    "app/api/push/dispatch/route.ts",
  ];
  for (const route of routes) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /isAuthorizedCronRequest/, `${route} compares by hand`);
    assert.doesNotMatch(source, /authorization"\) !== `Bearer/, `${route} still uses !==`);
  }
});

test("the paid and shared-write paths all carry a ceiling", () => {
  const metered: readonly [string, string][] = [
    ["app/actions/food-log.ts", "food_ai_minute"],
    ["app/api/foods/barcode/[barcode]/route.ts", "barcode_lookup"],
    ["app/actions/scanned-food.ts", "catalog_write"],
    ["app/login/actions.ts", "magic_link_email"],
  ];
  for (const [path, action] of metered) {
    assert.match(readFileSync(path, "utf8"), new RegExp(action), `${path} is unmetered`);
  }
});

test("an uploaded photograph is checked by its bytes, not its label", () => {
  for (const path of ["app/actions/product.ts", "app/actions/food-log.ts"]) {
    assert.match(readFileSync(path, "utf8"), /detectImageFormat/, `${path} trusts file.type`);
  }
});

test("the response carries the security headers", () => {
  const config = readFileSync("next.config.ts", "utf8");
  for (const header of [
    "Content-Security-Policy-Report-Only",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Strict-Transport-Security",
  ]) {
    assert.match(config, new RegExp(header), `${header} is missing`);
  }
});

test("only one rate limiter exists", () => {
  const migrations = readdirSync("supabase/migrations")
    .filter((name) => /create table[^;]*rate_limit/i.test(readFileSync(join("supabase/migrations", name), "utf8")));
  assert.equal(
    migrations.length,
    1,
    `expected one rate-limit table, found: ${migrations.join(", ")}`,
  );
});

// 595 tests passed while `npm run build` was failing, because none of them type
// check. Vercel does, so this is the gate that should fail first and locally.
test("the tree type-checks", () => {
  execFileSync("npx", ["tsc", "--noEmit"], { stdio: "pipe" });
});

// --- fixes from the code review of b169902 -------------------------------

test("the metadata sync repairs the race without overturning a decision", () => {
  const sql = readFileSync(
    "supabase/migrations/202608310006_the_sync_repairs_a_race_not_a_decision.sql", "utf8");
  // Activation is scoped: only a row still in its provisioning state, and only
  // moments after the user was created.
  assert.match(sql, /when status = 'disabled'/);
  assert.match(sql, /new\.created_at > now\(\) - interval '5 minutes'/);
  // The flag is written only when there is a key to write it from.
  assert.match(sql, /new\.raw_app_meta_data \? 'is_test_account'/);
  assert.match(sql, /else is_test_account end/);
  // And a malformed value cannot fail the UPDATE that carries the trigger.
  assert.match(sql, /exception when others then/);
});

test("a food log over its allowance is still saved, unmeasured", () => {
  const source = readFileSync("app/actions/food-log.ts", "utf8");
  // The ceiling sets a flag; it must not return before the row is written.
  assert.match(source, /estimateRateLimited = !minuteAllowed \|\| !dailyAllowed/);
  assert.doesNotMatch(
    source,
    /if \(!minuteAllowed \|\| !dailyAllowed\) \{\s*\n\s*return \{ ok: false/,
    "a rate-limited entry must not be discarded",
  );
  assert.match(source, /estimateRateLimited\s*\n?\s*\?/);
});

test("an optional read cannot take the nutrition screen down", () => {
  const source = readFileSync("app/nutrition/page.tsx", "utf8");
  assert.doesNotMatch(source, /throw favoriteResult\.error/);
  assert.match(source, /console\.error\("food favourites unavailable"/);
});

test("a missing forwarded address skips the per-address limit", () => {
  const source = readFileSync("app/login/actions.ts", "utf8");
  assert.doesNotMatch(source, /\?\?"unknown"/, 'every caller would share one bucket');
  assert.match(source, /forwarded\?consumeRateLimit/);
  // The per-email limit is the one that must always run.
  assert.match(source, /action:"magic_link_email"/);
});

test("the swap notice cannot roll back the workout", () => {
  const sql = readFileSync(
    "supabase/migrations/202608310007_a_swap_notice_cannot_cost_the_workout.sql", "utf8");
  // notifications.body is check(length <= 2000); the body must be cut to fit.
  assert.match(sql, /left\(v_swap_body, 1997\)/);
  // And the whole notice is wrapped, so no future failure of it costs the hour
  // of training that was already saved above it.
  assert.match(sql, /exception when others then\s*\n\s*--[\s\S]*?raise warning 'exercise swap notice failed/);
  // Warm-up percentages are a percentage, and there are not fifty of them.
  assert.match(sql, /value::integer between 0 and 100/);
  assert.match(sql, /limit 20/);
});

test("upgrade-insecure-requests is enforced, not report-only", () => {
  const config = readFileSync("next.config.ts", "utf8");
  // A report-only policy ignores the directive and logs that on every page
  // load, which buries the violations the report-only policy exists to surface.
  assert.doesNotMatch(config, /"upgrade-insecure-requests",\n\s*\]\.join/);
  assert.match(config, /key: "Content-Security-Policy", value: "upgrade-insecure-requests"/);
});
