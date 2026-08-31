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
