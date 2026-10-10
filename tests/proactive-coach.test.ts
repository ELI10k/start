import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildCoachAttention, buildDailyCoachMessage, prioritiseCoachAttention } from "../lib/coach-intelligence/proactive-coach.ts";

test("daily coach chooses one data-backed action and cites its numbers", () => {
  const message = buildDailyCoachMessage({ mealsCompleted: 2, mealsPlanned: 4, calories: 1200, calorieTarget: 2200, protein: 80, proteinTarget: 150 });
  assert.match(message.title, /נשאר לסמן/);
  assert.doesNotMatch(message.title + message.summary, /הפוקוס שלך עכשיו: חלבון/);
  assert.equal(message.href, "/nutrition");
  assert.equal(message.evidence.length, 3);
});

test("daily coach refuses to invent advice when targets are missing", () => {
  const message = buildDailyCoachMessage({ mealsCompleted: 0, mealsPlanned: 0, calories: 0, protein: 0 });
  assert.equal(message.tone, "missing");
  assert.match(message.summary, /לא תנחש/);
});

test("coach attention keeps the latest report and ranks real risk", () => {
  const items = prioritiseCoachAttention([
    { clientId: "a", clientName: "א", weekEnd: "2026-08-01", risk: 90, retentionRisk: 20, health: 30 },
    { clientId: "a", clientName: "א", weekEnd: "2026-08-08", risk: 10, retentionRisk: 10, health: 90 },
    { clientId: "b", clientName: "ב", weekEnd: "2026-08-08", risk: 75, retentionRisk: 40, health: 50 },
  ]);
  assert.deepEqual(items.map((item) => item.clientId), ["b"]);
  assert.equal(items[0]?.severity, "high");
});

test("coach attention evaluates a coached client without waiting for a weekly report", () => {
  const items = buildCoachAttention([{
    clientId: "eli", clientName: "אלי כהן", periodEnd: "2026-10-10", eligibleDays: 7,
    hasActiveMenu: true, plannedMeals: 28, markedMeals: 4, nutritionDays: 1,
    workoutsCompleted: 3, workoutsPlanned: 3, checkIns: 1, weighIns: 1,
  }]);
  assert.equal(items.length, 1);
  assert.match(items[0]?.reason ?? "", /סומנו 4 מתוך 28 ארוחות \(14%\)/);
  assert.match(items[0]?.reason ?? "", /3 אימונים הושלמו/);
  assert.match(items[0]?.reason ?? "", /צ׳ק־אין הוגש/);
  assert.match(items[0]?.reason ?? "", /שקילה עודכנה/);
});

test("nutrition adherence waits for five eligible days", () => {
  const items = buildCoachAttention([{
    clientId: "new", clientName: "לקוח חדש", periodEnd: "2026-10-10", eligibleDays: 3,
    hasActiveMenu: true, plannedMeals: 12, markedMeals: 0, nutritionDays: 0,
    workoutsCompleted: 0, workoutsPlanned: 3, checkIns: 0, weighIns: 0,
  }]);
  assert.deepEqual(items, []);
});

test("a digital client cannot enter through the live attention source", async () => {
  const [repository, panel] = await Promise.all([
    readFile("lib/coach-intelligence/proactive-repository.ts", "utf8"),
    readFile("components/coach/CoachAttentionPanel.tsx", "utf8"),
  ]);
  assert.match(repository, /coach_client_relationships/);
  assert.match(repository, /eq\("coach_id", coachId\)/);
  assert.doesNotMatch(repository, /from\("habit_analysis_reports"\)/);
  assert.doesNotMatch(panel, /items\.slice/);
});

test("the proactive coach runs from the cron, and no second weekly engine exists", async () => {
  const [client, coach, cron] = await Promise.all([
    readFile("app/page.tsx", "utf8"),
    readFile("app/coach/page.tsx", "utf8"),
    readFile("app/api/cron/daily-coach/route.ts", "utf8"),
  ]);
  // The daily tip stopped being a card on the client home screen - that screen
  // now has to fit one phone viewport, and the tip itself is a lesson in the
  // content library. It still reaches the client, as the push it always was.
  assert.match(cron, /buildDailyCoachMessage/);
  assert.doesNotMatch(client, /buildDailyCoachMessage/);
  assert.match(coach, /getCoachAttention/);
  assert.match(coach, /CoachAttentionPanel/);
  assert.doesNotMatch(client + coach, /generateWeeklyReport/);
});
