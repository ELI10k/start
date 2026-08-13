import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildClientReport, type ReportInput } from "../lib/coach-intelligence/client-report.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const EMPTY: ReportInput = {
  weighIns: [], checkIns: [],
  hasMenu: false, menuCompletionPercent: 0, menuPlannedItems: 0,
  hasProgram: false, programName: null, weeklyFrequency: null,
  weeklyCompletionPercent: 0, lastWorkoutAt: null, goalLabel: null, calorieTarget: null,
};

// ------------------------------------------------------------------ archiving

test("archiving ends the relationship and touches nothing else", async () => {
  const actions = await source("app/actions/coach.ts");
  const fn = actions.slice(actions.indexOf("export async function archiveClient"), actions.indexOf("export async function restoreClient"));
  assert.match(fn, /\.update\(\{status:"ended",end_date:israelDateKey\(\)\}\)/);
  // The client's own account status describes the person, not this coach's
  // working relationship with them.
  assert.doesNotMatch(fn, /profiles/);
  // Nothing is removed, anywhere.
  assert.doesNotMatch(fn, /\.delete\(\)|deleteUser|auth\.admin/);
});

test("restoring is the same row, the other way", async () => {
  const actions = await source("app/actions/coach.ts");
  const start = actions.indexOf("export async function restoreClient");
  const fn = actions.slice(start, actions.indexOf("export async function", start + 10));
  assert.match(fn, /\.update\(\{status:"active",end_date:null\}\)/);
  assert.doesNotMatch(fn, /\.delete\(\)/);
});

test("a coach can only archive or restore their own relationship", async () => {
  const actions = await source("app/actions/coach.ts");
  // Ownership is read through the coach's own session first, and the service
  // role write is still scoped to their coach_id - so the key cannot reach
  // another coach's row.
  assert.match(actions, /async function relationshipFor\(clientId:string,expected:"active"\|"ended"\)/);
  assert.match(actions, /auth\.role!=="coach"/);
  for (const fn of ["archiveClient", "restoreClient"]) {
    const body = actions.slice(actions.indexOf(`export async function ${fn}`), actions.indexOf(`export async function ${fn}`) + 900);
    assert.match(body, /\.eq\("coach_id",context\.auth\.id\)/, `${fn} does not scope the write to the coach`);
  }
});

test("the confirmation names the client and never calls it a deletion", async () => {
  const panel = await source("components/coach/client-file/ArchiveClient.tsx");
  const archiveBlock = panel.slice(panel.indexOf("const archive ="), panel.indexOf("const remove ="));
  assert.match(panel, /\{clientName\}/);
  assert.match(panel, /לא יימחקו/);
  assert.match(panel, /העברת לקוח לארכיון/);
  // "מחיקה" would make a coach hesitate over the safe action.
  assert.doesNotMatch(archiveBlock, /מחיקת לקוח|למחוק את הלקוח/);
});

test("permanent deletion is explicit, typed and releases the auth email", async () => {
  const [actions,panel]=await Promise.all([
    source("app/actions/coach.ts"),
    source("components/coach/client-file/ArchiveClient.tsx"),
  ]);
  const fn=actions.slice(actions.indexOf("export async function permanentlyDeleteClient"),actions.indexOf("export async function setClientContentAssignment"));
  assert.match(fn,/confirmationName\.trim\(\)/);
  assert.match(fn,/relationships.*some/s);
  assert.match(fn,/auth\.admin\.deleteUser\(clientId\)/);
  assert.match(panel,/מחיקת לקוח לצמיתות/);
  assert.match(panel,/confirmationName\.trim\(\)!==clientName\.trim\(\)/);
  assert.match(panel,/אותו אימייל/);
});

test("the archive list is the same table, the other side of the status", async () => {
  const repository = await source("lib/data/product-repository.ts");
  const fn = repository.slice(repository.indexOf("export async function listArchivedCoachClients"));
  assert.match(fn, /\.eq\("status", "ended"\)/);
  // end_date already existed, which is why this needed no migration.
  assert.match(fn, /end_date/);
});

// -------------------------------------------------------------------- report

test("with no data the report states what is missing and recommends nothing", () => {
  const report = buildClientReport(EMPTY);
  assert.equal(report.trends.length, 0);
  assert.equal(report.positives.length, 0);
  assert.ok(report.missing.includes("אין מדידות משקל"));
  assert.ok(report.missing.includes("אין צ׳ק־אינים"));
  // The only action is to go and get the data.
  assert.equal(report.actions[0]?.text, "להשלים את הנתונים החסרים לפני החלטות");
  assert.equal(report.referral, null);
});

test("one measurement is never a trend", () => {
  const report = buildClientReport({ ...EMPTY, weighIns: [{ date: "2026-08-01", weight: 80, navel: null }] });
  assert.equal(report.trends.length, 0);
  assert.ok(report.missing.some((line) => line.includes("מדידת משקל אחת בלבד")));
});

test("two measurements make a trend, and it carries both points", () => {
  const report = buildClientReport({
    ...EMPTY,
    weighIns: [{ date: "2026-08-08", weight: 79, navel: null }, { date: "2026-08-01", weight: 80.5, navel: null }],
  });
  const weight = report.trends.find((trend) => trend.label === "משקל");
  assert.ok(weight);
  assert.equal(weight.direction, "down");
  assert.equal(weight.detail, "-1.5 ק״ג");
  assert.match(weight.basis, /2026-08-01 \(80\.5 ק״ג\).*2026-08-08 \(79 ק״ג\)/);
});

test("every recommendation carries the figures it came from", () => {
  const report = buildClientReport({
    ...EMPTY,
    hasMenu: true, menuCompletionPercent: 20, menuPlannedItems: 10,
    hasProgram: true, programName: "A-B", weeklyFrequency: 4, weeklyCompletionPercent: 25,
    goalLabel: "חיטוב עדין", calorieTarget: 2100,
  });
  for (const point of [...report.nutrition, ...report.workouts, ...report.actions]) {
    assert.ok(point.basis.trim().length > 0, `a recommendation has no basis: ${point.text}`);
  }
  assert.ok(report.nutrition.some((point) => point.basis.includes("20%")));
  assert.ok(report.workouts.some((point) => point.basis.includes("25%")));
});

test("nothing is said about food or training the client never reported", () => {
  const report = buildClientReport(EMPTY);
  const everything = [...report.nutrition, ...report.workouts, ...report.positives, ...report.attention].map((point) => point.text).join(" ");
  assert.doesNotMatch(everything, /אכל|צרך|קלוריות שנצרכו|ביצע אימון/);
  // With no menu it says so rather than scoring adherence.
  assert.ok(report.missing.some((line) => line.includes("אין תפריט פעיל")));
});

test("a reported pain becomes a referral, never a diagnosis", () => {
  const report = buildClientReport({
    ...EMPTY,
    checkIns: [{ submittedAt: "2026-08-08", adherence: 3, energy: 3, sleep: 3, hunger: 3, workoutsCompleted: 2, mealPlanDays: 4, notes: "כאב בגב התחתון אחרי סקוואט" }],
  });
  assert.ok(report.referral);
  assert.match(report.referral, /איש מקצוע רפואי/);
  assert.match(report.referral, /אין כאן אבחנה/);
  // No condition is named anywhere in the report.
  const everything = JSON.stringify(report);
  assert.doesNotMatch(everything, /פריצת דיסק|דלקת|מחלה|אבחנה רפואית/);
});

test("the report view separates a number, a direction and a suggestion", async () => {
  const view = await source("components/coach/client-file/ClientReport.tsx");
  assert.match(view, /1 · נתונים שנאספו/);
  assert.match(view, /2 · מגמות לעומת התקופה הקודמת/);
  assert.match(view, /3 · נקודות חיוביות/);
  assert.match(view, /4 · דורש תשומת לב/);
  assert.match(view, /5 · המלצות תזונה/);
  assert.match(view, /6 · המלצות אימונים/);
  assert.match(view, /7 · שאלות ללקוח/);
  assert.match(view, /8 · פעולות מוצעות לשבוע הבא/);
  assert.match(view, /מבוסס על: \{point\.basis\}/);
  assert.match(view, /אין עדיין שתי נקודות זמן להשוואה/);
});

test("the versions migration is additive and freezes an approved version", async () => {
  const migration = await source("supabase/migrations/202608120002_coach_report_versions.sql");
  assert.match(migration, /Applied to the shared Supabase project/);
  assert.match(migration, /add column if not exists approved_at timestamptz/);
  assert.match(migration, /add column if not exists approved_by uuid/);
  // Additive only: nothing dropped or rewritten. Comment lines carry the
  // rollback, which does mention drops, so only executable lines are checked.
  const executable = migration.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
  assert.doesNotMatch(executable, /drop column/);
  assert.doesNotMatch(executable, /^\s*update public\./m);
  assert.doesNotMatch(executable, /drop table|alter column|rename/);
  // An approved report stops moving.
  assert.match(migration, /approved_summary_is_immutable/);
  assert.match(migration, /Rollback:/);
});

test("the coach can edit and approve, while an approved report is read-only", async () => {
  const actions = await source("app/actions/weekly-summary.ts");
  const panel = await source("components/coach/WeeklySummaryPanel.tsx");
  const repository = await source("lib/coach-intelligence/summary-repository.ts");
  assert.match(actions, /auth\.role !== "coach"/);
  assert.match(actions, /approved_summary_is_immutable/);
  assert.match(actions, /\.is\("approved_at", null\)/);
  assert.match(actions, /approved_by: input\.auth\.id/);
  assert.match(panel, /אישור ושמירת גרסה/);
  assert.match(panel, /לאחר האישור הגרסה ננעלת/);
  assert.match(panel, /summary\.status === "draft" && summary\.approvedAt/);
  assert.match(repository, /row\.edited_went_well \?\? row\.went_well/);
  assert.match(repository, /approvedAt:/);
});
