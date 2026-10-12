import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateFoodNutrition } from "../lib/meal-plans/calculations.ts";
import { AI_MEAL_ALLOWED_USER_ID, canUseAiMealAnalysis } from "../lib/nutrition/ai-meal-feature.ts";
import { matchFood, normalizeComponents, parseMealAnalysis } from "../lib/nutrition/meal-image-analysis.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const foods = [
  { id: "rice", name: "אורז מבושל", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "chicken", name: "פרגית צלויה", calories: 200, protein: 24, carbs: 0, fat: 11 },
  { id: "hummus", name: "חומוס", calories: 240, protein: 8, carbs: 14, fat: 17 },
];

test("AI meal access requires both the global switch and the personal allowlist", () => {
  const previous = process.env.AI_MEAL_ANALYSIS_ENABLED;
  try {
    process.env.AI_MEAL_ANALYSIS_ENABLED = "true";
    assert.equal(canUseAiMealAnalysis(AI_MEAL_ALLOWED_USER_ID), true);
    assert.equal(canUseAiMealAnalysis("00000000-0000-0000-0000-000000000000"), false);
    assert.equal(canUseAiMealAnalysis(null), false);

    process.env.AI_MEAL_ANALYSIS_ENABLED = "false";
    assert.equal(canUseAiMealAnalysis(AI_MEAL_ALLOWED_USER_ID), false);
  } finally {
    if (previous === undefined) delete process.env.AI_MEAL_ANALYSIS_ENABLED;
    else process.env.AI_MEAL_ANALYSIS_ENABLED = previous;
  }
});

test("changing grams recalculates all macros locally from per-100 values", () => {
  const per100 = { calories: 200, protein: 24, carbs: 0, fat: 11 };
  assert.deepEqual(calculateFoodNutrition(per100, 180), { calories: 360, protein: 43.2, carbs: 0, fat: 19.8 });
  assert.deepEqual(calculateFoodNutrition(per100, 90), { calories: 180, protein: 21.6, carbs: 0, fat: 9.9 });
});

test("structured meal output accepts separate Israeli components", () => {
  const parsed = parseMealAnalysis({ containsFood: true, summary: "פרגית עם אורז", components: [
    { name: "פרגית צלויה", estimatedGrams: 180, calories: 360, protein: 43.2, carbs: 0, fat: 19.8, confidence: "high", assumptions: ["צלויה"], clarification: null },
    { name: "אורז מבושל", estimatedGrams: 150, calories: 195, protein: 4.1, carbs: 42, fat: 0.5, confidence: "medium", assumptions: [], clarification: "האם נוסף שמן לאורז?" },
  ] });
  assert.equal(parsed?.components.length, 2);
  const normalized = normalizeComponents(parsed!.components, foods);
  assert.equal(normalized[0].foodId, "chicken");
  assert.equal(normalized[0].source, "catalog");
  assert.deepEqual(normalized[1].per100, { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 });
});

test("ambiguous foods remain labelled AI estimates", () => {
  assert.equal(matchFood("רוטב לא ברור", foods), null);
  const parsed = parseMealAnalysis({ containsFood: true, summary: "מנה", components: [
    { name: "רוטב לא ברור", estimatedGrams: 25, calories: 75, protein: 0, carbs: 2, fat: 7, confidence: "low", assumptions: ["ייתכן שמן"], clarification: "איזה רוטב זה?" },
  ] });
  const item = normalizeComponents(parsed!.components, foods)[0];
  assert.equal(item.source, "ai_estimate");
  assert.deepEqual(item.per100, { calories: 300, protein: 0, carbs: 8, fat: 28 });
});

test("malformed and contradictory model responses are rejected", () => {
  assert.deepEqual(parseMealAnalysis({ containsFood: false, summary: "לא זוהה מזון", components: [] }), { containsFood: false, summary: "לא זוהה מזון", components: [] });
  assert.equal(parseMealAnalysis({ containsFood: true, summary: "", components: [] }), null);
  assert.equal(parseMealAnalysis({ containsFood: true, summary: "x", components: [{ name: "אורז", estimatedGrams: -1 }] }), null);
});

test("Qwen is the default, structured output is required and server entry points enforce the allowlist", async () => {
  const [route, action, flag, page] = await Promise.all([
    source("app/api/nutrition/analyze-meal/route.ts"),
    source("app/actions/ai-meal.ts"),
    source("lib/nutrition/ai-meal-feature.ts"),
    source("app/nutrition/page.tsx"),
  ]);
  assert.match(flag, /alibaba\/qwen3\.8-omni-flash/);
  assert.match(flag, /368e193a-1364-4069-9743-be3da7bddac1/);
  assert.match(route, /type: "json_schema"/);
  assert.match(route, /isAiMealAnalysisEnabled\(\)/);
  assert.match(route, /canUseAiMealAnalysis\(auth\.id\)/);
  assert.match(action, /isAiMealAnalysisEnabled\(\)/);
  assert.match(action, /canUseAiMealAnalysis\(auth\.id\)/);
  assert.match(page, /canUseAiMealAnalysis\(auth\.id\)/);
  assert.doesNotMatch(route, /\.storage/);
});

test("weight edits are local and do not call AI again", async () => {
  const [component, action] = await Promise.all([
    source("components/client/AiMealAnalyzer.tsx"),
    source("app/actions/ai-meal.ts"),
  ]);
  assert.match(component, /calculateFoodNutrition\(item\.per100, item\.grams\)/);
  assert.match(component, /onChange=\{\(event\) => update\(item\.draftId, \{ grams:/);
  assert.match(component, /הוסף ליומן התזונה/);
  assert.match(action, /calculateFoodNutrition\(per100, grams\)/);
  assert.doesNotMatch(action, /analyze-meal|ai-gateway/);
});

test("AI is additive to the existing barcode, saved-meal and manual-photo paths", async () => {
  const sheet = await source("components/client/AteSomethingElse.tsx");
  assert.match(sheet, /setTab\("scan"\)/);
  assert.match(sheet, /CameraScan/);
  assert.match(sheet, /setTab\("saved"\)/);
  assert.match(sheet, /setTab\("photo"\)/);
  assert.match(sheet, /tab === "ai-photo"/);
  assert.match(sheet, /<AiMealAnalyzer/);
});

test("meal-row camera opens directly and AI photography is a separate adjacent action", async () => {
  const [control, sheet] = await Promise.all([
    source("components/client/MealStatusControl.tsx"),
    source("components/client/AteSomethingElse.tsx"),
  ]);
  assert.match(control, /capture="environment"/);
  assert.match(control, /onClick=\{\(\) => cameraInput\.current\?\.click\(\)\}/);
  assert.match(control, /צילום ארוחה ב־AI/);
  assert.match(control, /initialTab="ai-photo"/);
  assert.match(control, /initialPhoto=\{capturedPhoto\}/);
  assert.match(sheet, /!standaloneTab \? <div className="chip-row">/);
  assert.doesNotMatch(sheet, /setTab\("ai-photo"\)/);
  assert.match(sheet, /standaloneTab && initialPhoto \? null/);
});

test("the forward migration preserves client logs and makes AI saves idempotent", async () => {
  const sql = await source("supabase/migrations/20261012154500_ai_meal_analysis.sql");
  assert.match(sql, /create unique index[^;]+client_food_log_ai_meal_component_unique/s);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /if v_existing>0 then return/);
  assert.match(sql, /status_date=p_date/);
  assert.match(sql, /revoke all on function public\.save_ai_meal_to_log/);
  assert.match(sql, /auth\.uid\(\) is distinct from '368e193a-1364-4069-9743-be3da7bddac1'::uuid/);
  assert.match(sql, /select round\(coalesce\(calories,0\)\*v_grams\/100,1\)/);
  assert.match(sql, /case when coalesce\(f\.protein,i\.snapshot_protein\) is null then null/);
  assert.doesNotMatch(sql, /alter table public\.foods/);
  assert.doesNotMatch(sql, /delete from public\.client_food_log/);
  assert.doesNotMatch(sql, /update public\.client_food_log/);
});
