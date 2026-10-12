import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateFoodNutrition } from "../lib/meal-plans/calculations.ts";
import { matchFood, normalizeComponents, parseMealAnalysis } from "../lib/nutrition/meal-image-analysis.ts";

const foods = [
  { id: "rice", name: "אורז מבושל", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "chicken", name: "פרגית צלויה", calories: 200, protein: 24, carbs: 0, fat: 11 },
  { id: "hummus", name: "חומוס", calories: 240, protein: 8, carbs: 14, fat: 17 },
];

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

test("ambiguous names are not forced into the shared catalogue", () => {
  assert.equal(matchFood("רוטב לא ברור", foods), null);
  const parsed = parseMealAnalysis({ containsFood: true, summary: "מנה", components: [
    { name: "רוטב לא ברור", estimatedGrams: 25, calories: 75, protein: 0, carbs: 2, fat: 7, confidence: "low", assumptions: ["ייתכן שמן"], clarification: "איזה רוטב זה?" },
  ] });
  const item = normalizeComponents(parsed!.components, foods)[0];
  assert.equal(item.source, "ai_estimate");
  assert.equal(item.foodId, null);
  assert.deepEqual(item.per100, { calories: 300, protein: 0, carbs: 8, fat: 28 });
});

test("non-food and malformed responses are rejected", () => {
  assert.deepEqual(parseMealAnalysis({ containsFood: false, summary: "לא זוהה מזון", components: [] }), { containsFood: false, summary: "לא זוהה מזון", components: [] });
  assert.equal(parseMealAnalysis({ containsFood: true, summary: "", components: [] }), null);
  assert.equal(parseMealAnalysis({ containsFood: true, summary: "x", components: [{ name: "אורז", estimatedGrams: -1 }] }), null);
});

test("the AI meal migration is atomic, idempotent and does not alter foods", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261012033157_ai_meal_analysis.sql", import.meta.url), "utf8");
  assert.match(sql, /create unique index[^;]+client_food_log_ai_meal_component_unique/s);
  assert.match(sql, /create or replace function public\.save_ai_meal_to_log/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /if v_existing>0 then return/);
  assert.match(sql, /insert into public\.client_food_log/);
  assert.match(sql, /insert into public\.my_meal_items/);
  assert.doesNotMatch(sql, /alter table public\.foods/);
});

test("the analyzer uses Luna structured output and never uploads the image to storage", async () => {
  const route = await readFile(new URL("../app/api/nutrition/analyze-meal/route.ts", import.meta.url), "utf8");
  const component = await readFile(new URL("../components/client/AiMealAnalyzer.tsx", import.meta.url), "utf8");
  const saveAction = await readFile(new URL("../app/actions/ai-meal.ts", import.meta.url), "utf8");
  assert.match(route, /openai\/gpt-6-luna/);
  assert.match(route, /type: "json_schema"/);
  assert.match(route, /food_ai_minute/);
  assert.doesNotMatch(route, /\.storage/);
  assert.match(component, /calculateFoodNutrition\(item\.per100, item\.grams\)/);
  assert.match(component, /הוסף ליומן התזונה/);
  assert.match(saveAction, /from\("foods"\).*select\("id,name,calories,protein,carbs,fat"\)/s);
  assert.match(saveAction, /calculateFoodNutrition\(per100, grams\)/);
  assert.doesNotMatch(saveAction, /analyze-meal|ai-gateway/);
});
