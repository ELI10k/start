import assert from "node:assert/strict";
import test from "node:test";
import { dailyNutritionInsights } from "../lib/nutrition/daily-insights.ts";

test("daily nutrition review separates preservation from improvement", () => {
  const result = dailyNutritionInsights({
    eaten: { calories: 2200, protein: 140, carbs: 220, fat: 70 },
    targets: { calories: 2000, protein: 150 },
    answeredMeals: 5,
    unansweredMeals: 1,
    measuredOutsideItems: 2,
    unmeasuredOutsideItems: 1,
    isToday: true,
  });
  assert.ok(result.preserve.some((line) => line.includes("ארוחות")));
  assert.ok(result.improve.some((line) => line.includes("חריגה")));
  assert.ok(result.improve.some((line) => line.includes("להשלים ערכים")));
});

test("an unfinished day is not criticised for low protein", () => {
  const result = dailyNutritionInsights({
    eaten: { calories: 800, protein: 40, carbs: 70, fat: 20 },
    targets: { calories: 2000, protein: 150 },
    answeredMeals: 2,
    unansweredMeals: 3,
    measuredOutsideItems: 0,
    unmeasuredOutsideItems: 0,
    isToday: true,
  });
  assert.ok(result.improve.some((line) => line.includes("3 ארוחות")));
  assert.ok(result.improve.every((line) => !line.includes("מתוך יעד")));
});
