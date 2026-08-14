import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildDailyCoachMessage, prioritiseCoachAttention } from "../lib/coach-intelligence/proactive-coach.ts";

test("daily coach chooses one data-backed action and cites its numbers", () => {
  const message = buildDailyCoachMessage({ mealsCompleted: 2, mealsPlanned: 4, calories: 1200, calorieTarget: 2200, protein: 80, proteinTarget: 150 });
  assert.match(message.title, /חלבון/);
  assert.match(message.summary, /70/);
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

test("client and coach dashboards wire the proactive coach without a second weekly engine", async () => {
  const [client, coach] = await Promise.all([readFile("app/page.tsx", "utf8"), readFile("app/coach/page.tsx", "utf8")]);
  assert.match(client, /buildDailyCoachMessage/);
  assert.match(client, /DailyCoachCard/);
  assert.match(coach, /getCoachAttention/);
  assert.match(coach, /CoachAttentionPanel/);
  assert.doesNotMatch(client + coach, /generateWeeklyReport/);
});
