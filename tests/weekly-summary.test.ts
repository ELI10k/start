import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { allowedNumbers, citesOnlyKnownNumbers, createModelProvider, isFreeOfMedicalClaims, parseModelSummary, resolveSummaryProvider, rulesProvider } from "../lib/coach-intelligence/summary-provider.ts";
import { isSummaryHour, israelWeek } from "../lib/coach-intelligence/week-window.ts";
import { factCoverage, hasAnyFacts } from "../lib/coach-intelligence/weekly-facts.ts";
import { composeWeeklySummary } from "../lib/coach-intelligence/weekly-summary.ts";
import type { WeeklyFacts } from "../lib/coach-intelligence/weekly-facts.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const facts = (patch: Partial<WeeklyFacts> = {}): WeeklyFacts => ({ weekStart: "2026-08-09", weekEnd: "2026-08-15", ...patch });

test("the week runs Sunday to Saturday in Israel, and Saturday belongs to it", () => {
  // Saturday 2026-08-15, 20:30 Israel: the week that started on Sunday the 9th.
  assert.deepEqual(israelWeek("2026-08-15T17:30:00.000Z"), { start: "2026-08-09", end: "2026-08-15", previousStart: "2026-08-02" });
  // Sunday the 9th itself opens the week rather than closing the previous one.
  assert.equal(israelWeek("2026-08-09T08:00:00.000Z").start, "2026-08-09");
});

test("the job writes on a Saturday evening, in both halves of the year", () => {
  // One weekly cron at 17:00 UTC, because the plan allows a cron at most daily.
  // That lands at 20:00 in Israel in summer and 19:00 in winter, so the gate has
  // to accept both - a single-hour check would stop writing for half the year.
  assert.equal(isSummaryHour("2026-08-15T17:00:00.000Z"), true);  // 20:00 IDT, Saturday
  assert.equal(isSummaryHour("2026-01-17T17:00:00.000Z"), true);  // 19:00 IST, Saturday
  // And it is still narrow: a stray call in the middle of the night does nothing.
  assert.equal(isSummaryHour("2026-08-15T01:00:00.000Z"), false); // 04:00 IDT
  assert.equal(isSummaryHour("2026-08-15T09:00:00.000Z"), false); // 12:00 IDT
  assert.equal(isSummaryHour("2026-08-14T17:00:00.000Z"), false); // Friday
});

test("a week with no data at all is said to have no data", async () => {
  assert.equal(hasAnyFacts(facts()), false);
  const summary = composeWeeklySummary(facts());
  assert.equal(summary.status, "insufficient_data");
  assert.deepEqual([...summary.wentWell], []);
  assert.deepEqual([...summary.actions], []);
  assert.equal((await rulesProvider.summarize(facts())).status, "insufficient_data");
});

test("every line names a number that came from the week", () => {
  const summary = composeWeeklySummary(facts({
    workouts: { completed: 4, planned: 4, skipped: 0, volumeKg: 12000, previousCompleted: 2 },
    steps: { daysReported: 7, average: 11200, goal: 10000, daysMetGoal: 6 },
  }));
  assert.equal(summary.status, "ready");
  assert.ok(summary.wentWell.some((line) => line.includes("ארבעה")));
  assert.ok(summary.wentWell.some((line) => line.includes("11,200")));
  const allowed = allowedNumbers(summary.facts);
  for (const line of [...summary.wentWell, ...summary.needsWork, ...summary.actions]) {
    assert.ok(citesOnlyKnownNumbers(line, allowed), `invented a number: ${line}`);
  }
});

test("no line anywhere invents a figure, including the fallback action", () => {
  // Every branch of the composer, exercised together.
  const everything = facts({
    workouts: { completed: 1, planned: 4, skipped: 2, volumeKg: 8000, previousCompleted: 3 },
    nutrition: { daysReported: 2, mealsEaten: 4, mealsPlanned: 12, freeCalorieDays: 5, outsideMenuItems: 2, measuredOutsideMenuItems: 1, unmeasuredOutsideMenuItems: 1 },
    steps: { daysReported: 5, average: 4200, goal: 10000, daysMetGoal: 0, previousAverage: 3000 },
    weight: { entries: 0, latestKg: 0 },
    measurements: { entries: 1, changedSites: ["מותן"] },
    checkIns: { submitted: 0, reviewed: 0 },
  });
  for (const input of [everything, facts({ measurements: { entries: 2, changedSites: [] } })]) {
    const summary = composeWeeklySummary(input);
    const allowed = allowedNumbers(summary.facts);
    for (const line of [...summary.wentWell, ...summary.needsWork, ...summary.actions]) {
      assert.ok(citesOnlyKnownNumbers(line, allowed), `invented a number: ${line}`);
      assert.ok(isFreeOfMedicalClaims(line), `medical claim: ${line}`);
    }
  }
});

test("the coach weekly report includes measured and unmeasured outside-menu food", () => {
  const summary = composeWeeklySummary(facts({
    nutrition: { daysReported: 4, mealsEaten: 8, mealsPlanned: 10, freeCalorieDays: 0, outsideMenuItems: 3, measuredOutsideMenuItems: 2, unmeasuredOutsideMenuItems: 1 },
  }));
  assert.ok(summary.wentWell.some((line) => line.includes("2") && line.includes("מחוץ לתפריט")));
  assert.ok(summary.needsWork.some((line) => line.includes("1") && line.includes("ללא ערכים")));
});

test("a missed target is criticised, and turned into a specific action", () => {
  const summary = composeWeeklySummary(facts({ workouts: { completed: 1, planned: 4, skipped: 2, volumeKg: 0 } }));
  assert.ok(summary.needsWork.some((line) => line.includes("1") && line.includes("4")));
  assert.ok(summary.actions.length >= 1 && summary.actions.length <= 3);
  assert.ok(summary.actions.every((action) => action.length > 20));
});

test("a signal the client never reported produces no line about it", () => {
  const summary = composeWeeklySummary(facts({ workouts: { completed: 3, planned: 3, skipped: 0, volumeKg: 100 } }));
  // No steps, weight or nutrition were reported, so none are mentioned.
  const text = [...summary.wentWell, ...summary.needsWork].join(" ");
  assert.doesNotMatch(text, /צעדים/);
  assert.doesNotMatch(text, /שקיל/);
});

test("a summary written from one or two sources says so", () => {
  const coverage = factCoverage(facts({ workouts: { completed: 3, planned: 3, skipped: 0, volumeKg: 10 } }));
  assert.deepEqual(coverage, { present: 1, total: 6, sparse: true });
  const summary = composeWeeklySummary(facts({ workouts: { completed: 3, planned: 3, skipped: 0, volumeKg: 10 } }));
  assert.ok(summary.needsWork.some((line) => line.includes("מקור נתונים אחד")));
  // Said in words, because a digit in a summary has to trace back to the week.
  assert.ok(summary.needsWork.every((line) => citesOnlyKnownNumbers(line, allowedNumbers(summary.facts))));
});

test("weight is reported, never diagnosed", () => {
  const summary = composeWeeklySummary(facts({ weight: { entries: 2, latestKg: 81.4, changeKg: -0.6 } }));
  const text = [...summary.wentWell, ...summary.needsWork, ...summary.actions].join(" ");
  assert.match(text, /0\.6 ק״ג/);
  assert.ok(isFreeOfMedicalClaims(text));
  assert.equal(isFreeOfMedicalClaims("ייתכן שמדובר בבעיה בבלוטת התריס"), false);
});

test("a model that invents a number is discarded and the rules text stands", async () => {
  const input = facts({ workouts: { completed: 4, planned: 4, skipped: 0, volumeKg: 12000 } });
  const liar = createModelProvider("model", { complete: async () => JSON.stringify({ wentWell: ["השלמת 9 אימונים מתוך 9"], needsWork: [], actions: ["להמשיך"] }) });
  const result = await liar.summarize(input);
  assert.equal(result.provider, "rules");
  assert.ok(result.wentWell.some((line) => line.includes("ארבעה")));
});

test("a model that only rephrases is accepted", async () => {
  const input = facts({ workouts: { completed: 4, planned: 4, skipped: 0, volumeKg: 12000 } });
  const honest = createModelProvider("model", { complete: async () => `כאן התשובה: ${JSON.stringify({ wentWell: ["ארבעה אימונים מתוך ארבעה - שבוע מלא."], needsWork: [], actions: ["לשמור על אותם ימים גם בשבוע הבא."] })}` });
  const result = await honest.summarize(input);
  assert.equal(result.provider, "model");
  assert.deepEqual([...result.actions], ["לשמור על אותם ימים גם בשבוע הבא."]);
});

test("a model that writes a medical claim, throws, or returns junk is discarded", async () => {
  const input = facts({ workouts: { completed: 4, planned: 4, skipped: 0, volumeKg: 12000 } });
  for (const complete of [
    async () => JSON.stringify({ wentWell: ["ארבעה אימונים. ייתכן שיש לך אנמיה."], needsWork: [], actions: [] }),
    async () => { throw new Error("rate limited"); },
    async () => "not json at all",
    async () => JSON.stringify({ wentWell: [], needsWork: [], actions: [] }),
  ]) {
    const result = await createModelProvider("model", { complete }).summarize(input);
    assert.equal(result.provider, "rules");
  }
});

test("with no model credential the deterministic writer is what runs", () => {
  assert.equal(resolveSummaryProvider().name, "rules");
  assert.equal(resolveSummaryProvider().isConfigured(), true);
  assert.equal(parseModelSummary("garbage"), undefined);
});

test("a sent summary is never rewritten underneath the client", async () => {
  const migration = await source("supabase/migrations/202608110004_weekly_summaries.sql");
  assert.match(migration, /where public\.weekly_summaries\.status <> 'sent'/);
  assert.match(migration, /unique \(client_id, week_start\)/);
  // The client sees only what the coach released; the coach sees their own clients.
  assert.match(migration, /using \(client_id = \(select auth\.uid\(\)\) and status = 'sent'\)/);
  assert.match(migration, /using \(public\.is_coach_for\(client_id\)\)/);
  // Generation is service-role only: a client editing their own summary would
  // make it worthless as evidence.
  assert.match(migration, /revoke all on function public\.upsert_weekly_summary\([^)]*\) from public, authenticated/);
});

test("the schedule stays inside what the hosting plan allows", async () => {
  const vercel = JSON.parse(await source("vercel.json")) as { crons: { path: string; schedule: string }[] };
  // Two slots, and not one more.
  //
  // The Hobby plan registers exactly two cron jobs. Declaring four does not fail
  // the deploy and does not warn - Vercel takes two and silently drops the rest.
  // On 2026-08-21 the Cron Jobs panel listed two, and neither was the 05:00
  // reminders run nor the Saturday summary: both had been declared for weeks and
  // neither had ever fired. The weekly summary therefore no longer has an entry
  // of its own; it runs inside the evening job, which gates it on isSummaryHour.
  assert.equal(vercel.crons.length, 2, "more than two entries means some are silently dropped");
  assert.ok(vercel.crons.some((entry) => entry.path === "/api/cron/reminders"));
  assert.ok(vercel.crons.some((entry) => entry.path === "/api/cron/evening"));
  assert.equal(vercel.crons.find((entry) => entry.path === "/api/cron/evening")?.schedule, "30 18 * * *");
  // A cron that fires more than once a day is rejected at deploy time on the
  // current plan - which means a bad schedule here breaks every deployment, not
  // just the job. None of these may use a step or a range in the hour field.
  for (const entry of vercel.crons) {
    const hour = entry.schedule.split(" ")[1];
    assert.doesNotMatch(hour, /[*/,-]/, `${entry.path} runs more than once a day: ${entry.schedule}`);
  }
  // The summary is reached through the evening job now, so that is what has to
  // call it - an unreferenced route would simply never run.
  const evening = await source("app/api/cron/evening/route.ts");
  assert.match(evening, /weekly-summary\/route/);
  assert.match(evening, /reminders\/route/);
  assert.match(evening, /daily-coach\/route/);
  // 18:30 UTC is 21:30 in Israel in summer and 20:30 in winter; isSummaryHour
  // accepts 18:00-21:00 on a Saturday, so both land inside it.
  const route = await source("app/api/cron/weekly-summary/route.ts");
  assert.match(route, /isSummaryHour/);
  assert.match(route, /Bearer \$\{secret\}/);
  // One client's failure must not take the rest of the run down.
  assert.match(route, /weekly summary failed for client/);
});
