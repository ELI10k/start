import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  NUTRITION_DAY_COMPLETION_RATIO,
  nutritionDayStatus,
} from "../lib/nutrition/day-status.ts";

test("past nutrition days complete at ninety percent of the calorie bank", () => {
  assert.equal(NUTRITION_DAY_COMPLETION_RATIO, 0.9);
  assert.equal(nutritionDayStatus({ day: "2026-10-10", today: "2026-10-12", calories: 1799, calorieTarget: 2000 }), "missed");
  assert.equal(nutritionDayStatus({ day: "2026-10-10", today: "2026-10-12", calories: 1800, calorieTarget: 2000 }), "complete");
  assert.equal(nutritionDayStatus({ day: "2026-10-10", today: "2026-10-12", calories: 2400, calorieTarget: 2000 }), "complete");
});

test("today, future days and days without a target stay neutral", () => {
  assert.equal(nutritionDayStatus({ day: "2026-10-12", today: "2026-10-12", calories: 2000, calorieTarget: 2000 }), "neutral");
  assert.equal(nutritionDayStatus({ day: "2026-10-13", today: "2026-10-12", calories: 0, calorieTarget: 2000 }), "neutral");
  assert.equal(nutritionDayStatus({ day: "2026-10-10", today: "2026-10-12", calories: 0, calorieTarget: null }), "neutral");
});

test("the day strip uses only white circles with green or red checks", async () => {
  const [component, css] = await Promise.all([
    readFile(new URL("../components/client/NutritionDayStrip.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(component, /day-strip__day--\$\{status\}/);
  assert.match(component, /day-strip__status">✓/);
  assert.doesNotMatch(component, /isActive \? " pill--green"/);
  assert.match(css, /\.day-strip \.chip\.day-strip__day--complete/);
  assert.match(css, /\.day-strip \.chip\.day-strip__day--missed/);
  assert.match(css, /background: var\(--surface\)/);
});
