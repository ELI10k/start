import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("daily coach cron creates one deduplicated next-best-action notification per client and day", async () => {
  const route = await readFile(new URL("../app/api/cron/daily-coach/route.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(route, /buildDailyCoachMessage/);
  assert.match(route, /create_in_app_notification/);
  assert.match(route, /daily-coach-\$\{date\}/);
  assert.match(route, /Asia\/Jerusalem/);
  assert.match(route, /Bearer \$\{secret\}/);
  assert.ok(config.crons.some((item: { path: string }) => item.path === "/api/cron/daily-coach"));
});

test("weekly generation alerts the coach but still does not auto-send the report to the client", async () => {
  const route = await readFile(new URL("../app/api/cron/weekly-summary/route.ts", import.meta.url), "utf8");
  assert.match(route, /דוח שבועי מוכן לאישור/);
  assert.match(route, /weekly-summary-ready-/);
  assert.doesNotMatch(route, /send_weekly_summary/);
});
