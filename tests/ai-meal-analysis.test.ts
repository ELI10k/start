import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateFoodNutrition } from "../lib/meal-plans/calculations.ts";
import { AI_MEAL_ALLOWED_USER_ID, canUseAiMealAnalysis } from "../lib/nutrition/ai-meal-feature.ts";
import { applyMealClarification, buildMealClarifications, matchFood, normalizeComponents, parseMealAnalysis, type RawMealClarification, type RawMealComponent } from "../lib/nutrition/meal-image-analysis.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const foods = [
  { id: "rice", name: "אורז מבושל", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, verificationStatus: "מאושר", notes: "לאחר הכנה" },
  { id: "chicken", name: "פרגית צלויה", calories: 200, protein: 24, carbs: 0, fat: 11, verificationStatus: "מאושר", notes: "לאחר הכנה" },
  { id: "hummus", name: "חומוס", calories: 240, protein: 8, carbs: 14, fat: 17, verificationStatus: "מאושר", notes: "" },
];
const group = (id: string, estimatedGrams: number, name = id) => ({ id, name, estimatedGrams });
const component = (overrides: Partial<RawMealComponent> & Pick<RawMealComponent, "name" | "estimatedGrams" | "calories" | "protein" | "carbs" | "fat">): RawMealComponent => ({
  preparation: "מבושל",
  weightBasis: "as_served",
  groupId: "main",
  nutritionIncludesAddedFat: false,
  standaloneVisibleAddition: false,
  confidence: "medium",
  assumptions: [],
  clarification: null,
  ...overrides,
});
const clarificationComponent = (name: string, preparation: string, sharePercent: number, caloriesPer100: number, overrides = {}) => ({
  name, preparation, sharePercent, caloriesPer100, proteinPer100: 2, carbsPer100: 10, fatPer100: 10,
  nutritionIncludesAddedFat: /מטוגן|מיונז/u.test(`${name} ${preparation}`), standaloneVisibleAddition: false,
  confidence: "medium" as const, assumptions: [], ...overrides,
});

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
  const parsed = parseMealAnalysis({ containsFood: true, summary: "פרגית עם אורז", groups: [group("chicken", 180), group("rice", 150)], clarifications: [], components: [
    component({ name: "פרגית צלויה", preparation: "צלויה", groupId: "chicken", estimatedGrams: 180, calories: 360, protein: 43.2, carbs: 0, fat: 19.8, confidence: "high", assumptions: ["צלויה"] }),
    component({ name: "אורז מבושל", groupId: "rice", estimatedGrams: 150, calories: 195, protein: 4.1, carbs: 42, fat: 0.5, clarification: "האם נוסף שמן לאורז?" }),
  ] });
  assert.equal(parsed?.components.length, 2);
  const normalized = normalizeComponents(parsed!.components, foods, parsed!.groups);
  assert.equal(normalized[0].foodId, "chicken");
  assert.equal(normalized[0].source, "catalog");
  assert.deepEqual(normalized[1].per100, { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 });
});

test("ambiguous foods remain labelled AI estimates", () => {
  assert.equal(matchFood("רוטב לא ברור", foods), null);
  const parsed = parseMealAnalysis({ containsFood: true, summary: "מנה", groups: [group("sauce", 25)], clarifications: [], components: [
    component({ name: "ממרח לא ברור", preparation: "לא ידוע", groupId: "sauce", estimatedGrams: 25, calories: 75, protein: 0, carbs: 2, fat: 7, confidence: "low", assumptions: ["ייתכן שמן"], clarification: "איזה ממרח זה?" }),
  ] });
  const item = normalizeComponents(parsed!.components, foods, parsed!.groups)[0];
  assert.equal(item.source, "ai_estimate");
  assert.deepEqual(item.per100, { calories: 300, protein: 0, carbs: 8, fat: 28 });
});

test("malformed and contradictory model responses are rejected", () => {
  assert.deepEqual(parseMealAnalysis({ containsFood: false, summary: "לא זוהה מזון", groups: [], components: [], clarifications: [] }), { containsFood: false, summary: "לא זוהה מזון", groups: [], components: [], clarifications: [] });
  assert.equal(parseMealAnalysis({ containsFood: true, summary: "", groups: [], components: [], clarifications: [] }), null);
  assert.equal(parseMealAnalysis({ containsFood: true, summary: "x", groups: [group("main", 100)], components: [{ name: "אורז", estimatedGrams: -1 }], clarifications: [] }), null);
});

test("structured clarification options require a complete weight-preserving split", () => {
  const base = {
    containsFood: true, summary: "סלט", groups: [group("salad", 100)],
    components: [component({ name: "חציל מטוגן", preparation: "מטוגן", groupId: "salad", estimatedGrams: 100, calories: 180, protein: 2, carbs: 10, fat: 15 })],
  };
  const valid = {
    id: "split", kind: "group_split", groupId: "salad", question: "איך מתחלקת הכמות?",
    options: [
      { id: "half", label: "חצי־חצי", components: [clarificationComponent("חציל מטוגן", "מטוגן", 50, 180), clarificationComponent("חציל במיונז", "עם מיונז", 50, 280)] },
      { id: "fried", label: "בעיקר מטוגן", components: [clarificationComponent("חציל מטוגן", "מטוגן", 80, 180), clarificationComponent("חציל במיונז", "עם מיונז", 20, 280)] },
    ],
  };
  assert.equal(parseMealAnalysis({ ...base, clarifications: [valid] })?.clarifications.length, 1);
  const invalid = { ...valid, options: valid.options.map((option) => ({ ...option, components: option.components.map((item, index) => ({ ...item, sharePercent: index === 0 ? 20 : 30 })) })) };
  assert.equal(parseMealAnalysis({ ...base, clarifications: [invalid] }), null);
});

test("salad components are split within one visual group without increasing its total weight", () => {
  const salads = [
    component({ name: "חצילים במיונז", preparation: "מבושל עם מיונז", groupId: "salads", estimatedGrams: 80, calories: 160, protein: 2, carbs: 8, fat: 13, nutritionIncludesAddedFat: true }),
    component({ name: "חצילים מטוגנים", preparation: "מטוגן", groupId: "salads", estimatedGrams: 50, calories: 100, protein: 1, carbs: 7, fat: 7, nutritionIncludesAddedFat: true }),
    component({ name: "גזר במיונז", preparation: "עם מיונז", groupId: "salads", estimatedGrams: 30, calories: 70, protein: 1, carbs: 5, fat: 5, nutritionIncludesAddedFat: true }),
  ];
  const normalized = normalizeComponents(salads, [], [group("salads", 100, "סלטים")]);
  assert.equal(normalized.reduce((sum, item) => sum + item.grams, 0), 100);
  assert.deepEqual(normalized.map((item) => item.grams), [50, 31.2, 18.8]);
});

test("oil and mayonnaise are not counted twice when prepared-food nutrition already includes them", () => {
  const items = [
    component({ name: "גזר במיונז", preparation: "עם מיונז", groupId: "salad", estimatedGrams: 90, calories: 150, protein: 1, carbs: 8, fat: 12, nutritionIncludesAddedFat: true }),
    component({ name: "מיונז", preparation: "רוטב", groupId: "salad", estimatedGrams: 10, calories: 68, protein: 0, carbs: 0, fat: 7.5, standaloneVisibleAddition: true }),
    component({ name: "שמן", preparation: "תוספת נפרדת", groupId: "oil", estimatedGrams: 5, calories: 45, protein: 0, carbs: 0, fat: 5, standaloneVisibleAddition: true }),
  ];
  const normalized = normalizeComponents(items, [], [group("salad", 100), group("oil", 5)]);
  assert.deepEqual(normalized.map((item) => item.name), ["גזר במיונז", "שמן"]);
  assert.equal(normalized[0].grams, 100);
  assert.equal(normalized[1].grams, 5);
});

test("clarifications do not repeat facts already supplied in the meal description", () => {
  const rawComponents = [
    component({ name: "חציל מטוגן", preparation: "מטוגן", groupId: "eggplant", estimatedGrams: 50, calories: 100, protein: 1, carbs: 5, fat: 8, nutritionIncludesAddedFat: true }),
    component({ name: "חציל במיונז", preparation: "עם מיונז", groupId: "eggplant", estimatedGrams: 50, calories: 140, protein: 1, carbs: 5, fat: 12, nutritionIncludesAddedFat: true }),
  ];
  const normalized = normalizeComponents(rawComponents, [], [group("eggplant", 100)]);
  const question: RawMealClarification = {
    id: "eggplant-kind", kind: "component_identity", groupId: "eggplant", question: "איזה סוג חציל יש בארוחה?",
    options: [
      { id: "fried", label: "חציל מטוגן", components: [clarificationComponent("חציל מטוגן", "מטוגן", 100, 200)] },
      { id: "mayo", label: "חציל במיונז", components: [clarificationComponent("חציל במיונז", "עם מיונז", 100, 280)] },
      { id: "both", label: "שניהם", components: [clarificationComponent("חציל מטוגן", "מטוגן", 50, 200), clarificationComponent("חציל במיונז", "עם מיונז", 50, 280)] },
    ],
  };
  const result = buildMealClarifications([question], "פרגית קוסקוס חצילים במיונז וחציל מטוגן", normalized, [], [group("eggplant", 100)]);
  assert.deepEqual(result, []);
});

test("a preparation question remains when only the food name was supplied", () => {
  const normalized = normalizeComponents([
    component({ name: "פרגית", preparation: "לא ידוע", groupId: "chicken", estimatedGrams: 170, calories: 340, protein: 40, carbs: 0, fat: 18 }),
  ], [], [group("chicken", 170)]);
  const question: RawMealClarification = {
    id: "chicken-prep", kind: "preparation", groupId: "chicken", question: "איך הפרגית הוכנה?",
    options: [
      { id: "grilled", label: "צלויה", components: [clarificationComponent("פרגית", "צלויה", 100, 200)] },
      { id: "fried", label: "מטוגנת", components: [clarificationComponent("פרגית", "מטוגנת", 100, 300)] },
    ],
  };
  assert.equal(buildMealClarifications([question], "פרגית וקוסקוס", normalized, [], [group("chicken", 170)]).length, 1);
  assert.equal(buildMealClarifications([question], "פרגית צלויה וקוסקוס", normalized, [], [group("chicken", 170)]).length, 0);
});

test("only the two highest-impact clarification groups are returned", () => {
  const groups = [group("a", 100), group("b", 100), group("c", 100)];
  const normalized = normalizeComponents(groups.map((item) => component({ name: `סלט ${item.id}`, preparation: "לא ידוע", groupId: item.id, estimatedGrams: 100, calories: 100, protein: 2, carbs: 10, fat: 5 })), [], groups);
  const questions: RawMealClarification[] = groups.map((item, index) => ({
    id: `question-${item.id}`, kind: "sauce_amount", groupId: item.id, question: `כמה רוטב יש בסלט ${item.id}?`,
    options: [
      { id: "little", label: "מעט", components: [clarificationComponent(`סלט ${item.id}`, "מעט רוטב", 100, 120)] },
      { id: "much", label: "הרבה", components: [clarificationComponent(`סלט ${item.id}`, "הרבה רוטב", 100, 240 + index * 40)] },
    ],
  }));
  assert.deepEqual(buildMealClarifications(questions, "שלושה סלטים", normalized, [], groups).map((question) => question.id), ["question-c", "question-b"]);
});

test("one-click group split keeps the current total grams and recalculates locally", () => {
  const rawComponents = [
    component({ name: "חציל מטוגן", preparation: "מטוגן", groupId: "salads", estimatedGrams: 50, calories: 75, protein: 1, carbs: 5, fat: 5, nutritionIncludesAddedFat: true }),
    component({ name: "חציל במיונז", preparation: "עם מיונז", groupId: "salads", estimatedGrams: 50, calories: 225, protein: 1, carbs: 5, fat: 20, nutritionIncludesAddedFat: true }),
  ];
  const normalized = normalizeComponents(rawComponents, [], [group("salads", 100)]);
  const question: RawMealClarification = {
    id: "salad-split", kind: "group_split", groupId: "salads", question: "איך מתחלקת כמות החצילים?",
    options: [
      { id: "mostly-fried", label: "בעיקר מטוגן", components: [clarificationComponent("חציל מטוגן", "מטוגן", 80, 150), clarificationComponent("חציל במיונז", "עם מיונז", 20, 450)] },
      { id: "both", label: "חצי־חצי", components: [clarificationComponent("חציל מטוגן", "מטוגן", 50, 150), clarificationComponent("חציל במיונז", "עם מיונז", 50, 450)] },
    ],
  };
  const [built] = buildMealClarifications([question], "חציל מטוגן וחציל במיונז", normalized, [], [group("salads", 100)]);
  assert.ok(built);
  const manuallyAdjusted = normalized.map((item, index) => ({ ...item, grams: index === 0 ? 70 : 50 }));
  const result = applyMealClarification(manuallyAdjusted, built, built.options[1]);
  assert.equal(result.reduce((sum, item) => sum + item.grams, 0), 120);
  assert.deepEqual(result.map((item) => item.grams), [60, 60]);
  assert.equal(result.reduce((sum, item) => sum + calculateFoodNutrition(item.per100, item.grams).calories, 0), 360);
});

test("clarification alternatives cannot double-count mayonnaise already included in prepared food", () => {
  const normalized = normalizeComponents([
    component({ name: "גזר במיונז", preparation: "עם מיונז", groupId: "carrot", estimatedGrams: 100, calories: 180, protein: 1, carbs: 10, fat: 14, nutritionIncludesAddedFat: true }),
  ], [], [group("carrot", 100)]);
  const question: RawMealClarification = {
    id: "mayo-amount", kind: "sauce_amount", groupId: "carrot", question: "כמה מיונז יש בסלט?",
    options: [
      { id: "light", label: "מעט", components: [clarificationComponent("גזר במיונז", "עם מעט מיונז", 100, 130)] },
      { id: "rich", label: "הרבה", components: [
        clarificationComponent("גזר במיונז", "עם מיונז", 90, 260),
        clarificationComponent("מיונז", "רוטב", 10, 680, { standaloneVisibleAddition: true }),
      ] },
    ],
  };
  const [built] = buildMealClarifications([question], "גזר במיונז", normalized, [], [group("carrot", 100)]);
  assert.ok(built);
  assert.equal(built.options[1].replacements.length, 1);
  assert.equal(built.options[1].replacements[0].grams, 100);
});

test("catalog matching requires trusted foods and a compatible preparation", () => {
  const catalog = [
    { id: "eggplant", name: "חציל", calories: 25, protein: 1, carbs: 6, fat: 0.2, verificationStatus: "מאושר", notes: "טרי" },
    { id: "fried-eggplant", name: "חציל מטוגן", calories: 180, protein: 2, carbs: 10, fat: 15, verificationStatus: "מאושר", notes: "מטוגן; לאחר הכנה" },
    { id: "raw-thigh", name: "פרגית ללא עור נא", calories: 149, protein: 19, carbs: 0, fat: 8, verificationStatus: "מאושר", notes: "נא" },
    { id: "thigh", name: "פרגית", calories: 190, protein: 25, carbs: 0, fat: 10, verificationStatus: null, notes: "מאכל מאסטר; מנה לאחר הכנה" },
    { id: "pending", name: "קוסקוס מבושל", calories: 110, protein: 4, carbs: 23, fat: 0.1, verificationStatus: "ממתין לבדיקה", notes: "" },
  ];
  assert.equal(matchFood("חציל מטוגן", catalog, "מטוגן")?.id, "fried-eggplant");
  assert.equal(matchFood("חציל", [catalog[0]], "מטוגן"), null);
  assert.equal(matchFood("פרגית צלויה", catalog, "צלויה")?.id, "thigh");
  assert.notEqual(matchFood("פרגית צלויה", catalog, "צלויה")?.id, "raw-thigh");
  assert.equal(matchFood("קוסקוס מבושל", catalog, "מבושל"), null);
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

test("meal description is required and the prompt keeps image quantity authoritative", async () => {
  const [route, componentSource] = await Promise.all([
    source("app/api/nutrition/analyze-meal/route.ts"),
    source("components/client/AiMealAnalyzer.tsx"),
  ]);
  assert.match(route, /description_required/);
  assert.match(route, /התמונה היא המקור המרכזי והסמכות להערכת הנפח והמשקל/);
  assert.match(route, /אל תגדיל את משקל הארוחה/);
  assert.match(route, /nutritionIncludesAddedFat=true/);
  assert.doesNotMatch(route, /777/);
  assert.match(componentSource, /מה יש בארוחה\?/);
  assert.match(componentSource, /כתוב בקצרה אילו מזונות יש בצלחת ואיך הוכנו/);
  assert.match(componentSource, /required aria-required="true"/);
  assert.match(componentSource, /!description\.trim\(\)/);
});

test("each analysis uses one gateway request and grouped normalization", async () => {
  const route = await source("app/api/nutrition/analyze-meal/route.ts");
  assert.equal(route.match(/fetch\("https:\/\/ai-gateway\.vercel\.sh/g)?.length, 1);
  assert.match(route, /normalizeComponents\(parsed\.components, foods, parsed\.groups\)/);
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

test("clarification alternatives are signed and save remains compatible with old index-only analyses", async () => {
  const [route, action, signature, componentSource] = await Promise.all([
    source("app/api/nutrition/analyze-meal/route.ts"),
    source("app/actions/ai-meal.ts"),
    source("lib/nutrition/meal-analysis-signature.ts"),
    source("components/client/AiMealAnalyzer.tsx"),
  ]);
  assert.match(route, /allowedComponents/);
  assert.match(route, /selectionGroups/);
  assert.match(action, /signed\.allowedComponents \?\? signed\.components/);
  assert.match(action, /signed\.components\.find\(\(item\) => item\.index/);
  assert.match(action, /selected\.every\(\(key\) => variant\.includes\(key\)\)/);
  assert.match(signature, /allowedComponents\?/);
  assert.match(signature, /selectionGroups\?/);
  assert.match(componentSource, /applyMealClarification/);
  assert.doesNotMatch(componentSource, /answerClarification[\s\S]{0,800}fetch\(/);
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
