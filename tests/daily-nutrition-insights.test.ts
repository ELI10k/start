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
  assert.ok(result.improve.every((line) => !line.includes("החלבון שנרשם נמוך")));
});

test("a completed day signals the exact protein gap without adding food", () => {
  const result = dailyNutritionInsights({
    eaten: { calories: 1900, protein: 110, carbs: 190, fat: 65 },
    targets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    answeredMeals: 5, unansweredMeals: 0, measuredOutsideItems: 0, unmeasuredOutsideItems: 0, isToday: true,
  });
  assert.ok(result.improve.some((line) => line.includes("נמוך ב־40 גרם")));
  assert.ok(result.improve.some((line) => line.includes("בלי להוסיף ארוחה")));
});

test("low carbs with high fat does not recommend cutting more carbs", () => {
  const result = dailyNutritionInsights({
    eaten: { calories: 2100, protein: 145, carbs: 150, fat: 90 },
    targets: { calories: 2000, protein: 150, carbs: 210, fat: 65 },
    answeredMeals: 5, unansweredMeals: 0, measuredOutsideItems: 0, unmeasuredOutsideItems: 0, isToday: true,
    eatenFoodNames: ["שניצל מטוגן"],
  });
  assert.ok(result.improve.some((line) => line.includes("אין צורך להפחית פחמימות נוספות")));
  assert.ok(result.improve.some((line) => line.includes("חלופות אפויות או צלויות")));
});

test("progress is used only when multiple measurements span at least two weeks", () => {
  const base = {
    eaten: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    targets: { calories: 2000, protein: 150, carbs: 200, fat: 65 },
    answeredMeals: 5, unansweredMeals: 0, measuredOutsideItems: 0, unmeasuredOutsideItems: 0, isToday: true,
  } as const;
  const short = dailyNutritionInsights({ ...base, progress: { measurements: 2, spanDays: 7, weightChange: 1, navelChange: 1 } });
  assert.ok(short.improve.every((line) => !line.includes("היקף הטבור עלו")));
  const established = dailyNutritionInsights({ ...base, progress: { measurements: 3, spanDays: 21, weightChange: 1.2, navelChange: 1.5 } });
  assert.ok(established.improve.some((line) => line.includes("גם המשקל וגם היקף הטבור עלו")));
});
