import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calendarDay, clampGoal, lastDays, shiftDay, stepsByDay, stepsToPersist, summarizeSteps } from "../lib/health/calculations.ts";
import { createTestProvider, describeAvailability, resolveHealthProvider, syncWindow, unavailableProvider } from "../lib/health/providers.ts";
import type { DailySteps } from "../lib/health/types.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const entry = (day: string, steps: number, from: DailySteps["source"] = "healthkit"): DailySteps => ({ day, steps, source: from, recordedAt: `${day}T20:00:00.000Z` });
const TODAY = "2026-08-11";

test("the day is the client's calendar day, not the UTC one", () => {
  // 22:30 UTC on the 10th is already the 11th in Israel - which is when people walk.
  assert.equal(calendarDay("2026-08-10T22:30:00.000Z"), "2026-08-11");
  // And 00:30 UTC on the 11th is still the 11th there, not the 10th.
  assert.equal(calendarDay("2026-08-11T00:30:00.000Z"), "2026-08-11");
  assert.equal(calendarDay("2026-08-10T22:30:00.000Z", "UTC"), "2026-08-10");
});

test("seven days ends on today and starts six days earlier", () => {
  const days = lastDays(TODAY, 7);
  assert.equal(days.length, 7);
  assert.equal(days[6], TODAY);
  assert.equal(days[0], "2026-08-05");
  assert.equal(shiftDay(TODAY, -1), "2026-08-10");
});

test("a phone and a watch on the same walk are not added together", () => {
  const byDay = stepsByDay([entry(TODAY, 8200, "healthkit"), entry(TODAY, 7900, "health-connect")]);
  assert.equal(byDay.get(TODAY)?.steps, 8200);
  assert.equal(byDay.size, 1);
});

test("the weekly average ignores days that never reported", () => {
  // Two reported days, not seven: a phone that was off is not a zero-step day.
  const summary = summarizeSteps([entry(TODAY, 10000), entry("2026-08-10", 6000)], { dailyStepGoal: 8000 }, TODAY);
  assert.equal(summary.weeklyAverage, 8000);
  assert.equal(summary.today, 10000);
  assert.equal(summary.percentOfGoal, 125);
  assert.equal(summary.daysMetGoal, 1);
  assert.equal(summary.trend.length, 7);
  assert.equal(summary.hasData, true);
});

test("no data at all reports zeroes rather than dividing by zero", () => {
  const summary = summarizeSteps([], undefined, TODAY);
  assert.equal(summary.weeklyAverage, 0);
  assert.equal(summary.percentOfGoal, 0);
  assert.equal(summary.goal, 10000);
  assert.equal(summary.hasData, false);
});

test("the goal is clamped to something a person could walk", () => {
  assert.equal(clampGoal(undefined), 10000);
  assert.equal(clampGoal(0), 1000);
  assert.equal(clampGoal(999999), 50000);
  assert.equal(clampGoal(7500), 7500);
});

test("re-syncing the same figures writes nothing", () => {
  const known = [entry(TODAY, 8200), entry("2026-08-10", 6000)];
  assert.deepEqual(stepsToPersist(known, known, TODAY), []);
  const changed = stepsToPersist([entry(TODAY, 9000), entry("2026-08-10", 6000)], known, TODAY);
  assert.deepEqual(changed.map((item) => item.steps), [9000]);
});

test("a day in the future, a negative count and a duplicate are all refused", () => {
  const incoming = [entry("2026-08-12", 500), entry(TODAY, -5), entry(TODAY, 7000), entry(TODAY, 7000)];
  const result = stepsToPersist(incoming, [], TODAY);
  assert.deepEqual(result.map((item) => [item.day, item.steps]), [[TODAY, 7000]]);
});

test("a browser has no health store, and says so instead of showing an empty chart", async () => {
  assert.equal(await unavailableProvider.isAvailable(), false);
  assert.equal(await unavailableProvider.getPermission(), "unavailable");
  assert.deepEqual(await unavailableProvider.readDailySteps("2026-08-05", TODAY), []);
  assert.equal(resolveHealthProvider().source, "none");
  assert.match(describeAvailability("none", "unavailable").reason, /Health Connect/);
  assert.match(describeAvailability("healthkit", "denied").reason, /נדחתה/);
  assert.equal(describeAvailability("healthkit", "granted").reason, "");
});

test("a denied provider returns no steps, and a prompt can still be granted", async () => {
  const denied = createTestProvider([5000], "test", "denied");
  assert.deepEqual(await denied.readDailySteps("2026-08-05", TODAY), []);

  const prompting = createTestProvider([5000, 6000], "test", "prompt");
  assert.deepEqual(await prompting.readDailySteps("2026-08-05", TODAY), []);
  assert.equal(await prompting.requestPermission(), "granted");
  const days = await prompting.readDailySteps("2026-08-09", TODAY);
  assert.deepEqual(days.map((day) => day.day), ["2026-08-09", "2026-08-10", "2026-08-11"]);
  assert.deepEqual(days.map((day) => day.steps), [5000, 6000, 5000]);
});

test("the sync window is the seven days the card shows", () => {
  assert.deepEqual(syncWindow(TODAY), { fromDay: "2026-08-05", toDay: TODAY });
});

test("steps are stored one row per day per source, and re-syncing overwrites", async () => {
  const migration = await source("supabase/migrations/202608110002_health_steps.sql");
  assert.match(migration, /primary key \(client_id, day, source\)/);
  assert.match(migration, /on conflict \(client_id, day, source\) do update/);
  // Coach isolation matches every other client table.
  assert.match(migration, /using \(public\.is_coach_for\(client_id\)\)/);
  assert.match(migration, /alter table public\.health_steps enable row level security/);
  // The caller supplies the day, because the database's clock is in the wrong place.
  assert.match(migration, /p_day date/);
  assert.match(migration, /p_steps<0 or p_steps>200000/);
});
