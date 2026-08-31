import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("daily coach cron creates one deduplicated next-best-action notification per client and day", async () => {
  const route = await readFile(new URL("../app/api/cron/daily-coach/route.ts", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.match(route, /buildDailyCoachMessage/);
  assert.match(route, /create_in_app_notification/);
  assert.match(route, /daily-coach-\$\{date\}/);
  // The day has to be Israel's, not UTC's. It used to be a local copy of the
  // formatter; it is now the shared helper, which is the same guarantee stated
  // once. The weekday helper is what keeps a multi-day menu counted as one day.
  assert.match(route, /israelDateKey\(\)/);
  assert.match(route, /israelWeekday\(date\)/);
  // Constant-time now, but the requirement is unchanged: no secret, no run.
  assert.match(route, /isAuthorizedCronRequest\(request, secret\)/);
  // The daily coach no longer has a cron entry of its own: the Hobby plan
  // registers two jobs and silently drops the rest, so it runs inside the
  // evening job instead. An entry here would push a working one out.
  assert.ok(!config.crons.some((item: { path: string }) => item.path === "/api/cron/daily-coach"));
  const evening = await readFile(new URL("../app/api/cron/evening/route.ts", import.meta.url), "utf8");
  assert.match(evening, /daily-coach\/route/);
});

test("weekly generation alerts the coach but still does not auto-send the report to the client", async () => {
  const route = await readFile(new URL("../app/api/cron/weekly-summary/route.ts", import.meta.url), "utf8");
  assert.match(route, /דוח שבועי מוכן לאישור/);
  assert.match(route, /weekly-summary-ready-/);
  assert.doesNotMatch(route, /send_weekly_summary/);
});
