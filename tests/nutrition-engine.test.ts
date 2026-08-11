import assert from "node:assert/strict";
import test from "node:test";
import { activityFactor, basalMetabolicRate, bodyMassIndex, calculateEnergy, GOAL_CALORIE_OFFSET, missingEnergyFields } from "../lib/nutrition/energy.ts";
import { ALL_AUTOMATIC, caloriesFromMacros, planMacros, resetToAutomatic } from "../lib/nutrition/macro-plan.ts";
import { foodMacroGroup, foodsForGroup } from "../lib/nutrition/food-groups.ts";

// A 30-year-old man, 88kg, 180cm, four sessions a week, 10,000 steps.
const CLIENT = { ageYears: 30, weightKg: 88, heightCm: 180, sex: "male" as const, weeklyWorkouts: 4, dailySteps: 10000 };

test("BMR follows Mifflin-St Jeor, and differs by sex", () => {
  // 10*88 + 6.25*180 - 5*30 + 5 = 1860
  assert.equal(basalMetabolicRate(CLIENT), 1860);
  // The female variant is 166 lower - far too much to average away.
  assert.equal(basalMetabolicRate({ ...CLIENT, sex: "female" }), 1694);
});

test("BMR refuses to guess when an input is missing", () => {
  assert.equal(basalMetabolicRate({ ...CLIENT, sex: undefined }), null);
  assert.equal(basalMetabolicRate({ ...CLIENT, heightCm: 0 }), null);
  assert.equal(basalMetabolicRate({ ...CLIENT, ageYears: undefined }), null);
});

test("the activity factor comes from steps and sessions, not from a label", () => {
  // 1.2 + (7000/1000)*0.025 + 4*0.045 = 1.2 + 0.175 + 0.18
  assert.equal(activityFactor(CLIENT), 1.555);
  // Someone who does nothing sits at sedentary rather than below it.
  assert.equal(activityFactor({ dailySteps: 0, weeklyWorkouts: 0 }), 1.2);
  assert.equal(activityFactor({ dailySteps: 2000, weeklyWorkouts: 0 }), 1.2);
  // Both contributions are capped, so a mistyped step count cannot run away.
  assert.equal(activityFactor({ dailySteps: 90000, weeklyWorkouts: 14 }), 1.77);
});

test("TDEE is BMR times that factor", () => {
  const result = calculateEnergy({ ...CLIENT, goal: "maintain" });
  assert.ok(result.ok);
  assert.equal(result.bmr, 1860);
  assert.equal(result.tdee, Math.round(1860 * 1.555));
  assert.equal(result.tdee, 2892);
});

test("every goal moves the target by exactly its stated offset", () => {
  const maintain = calculateEnergy({ ...CLIENT, goal: "maintain" });
  assert.ok(maintain.ok);
  const tdee = maintain.tdee;

  assert.equal(maintain.calorieTarget, tdee);
  for (const [goal, offset] of Object.entries(GOAL_CALORIE_OFFSET)) {
    const result = calculateEnergy({ ...CLIENT, goal: goal as keyof typeof GOAL_CALORIE_OFFSET });
    assert.ok(result.ok);
    assert.equal(result.calorieTarget, tdee + offset, `${goal} should be TDEE${offset >= 0 ? "+" : ""}${offset}`);
  }
});

test("the four offsets are the ones the product asked for", () => {
  assert.equal(GOAL_CALORIE_OFFSET.maintain, 0);
  assert.equal(GOAL_CALORIE_OFFSET.gentle_cut, -300);
  assert.equal(GOAL_CALORIE_OFFSET.fast_cut, -500);
  assert.equal(GOAL_CALORIE_OFFSET.lean_bulk, 200);
  assert.equal(GOAL_CALORIE_OFFSET.dirty_bulk, 400);
});

test("a deficit never takes the target below resting requirement", () => {
  // A small, inactive client on the fastest cut: the offset would go under BMR.
  const tiny = { ageYears: 60, weightKg: 45, heightCm: 150, sex: "female" as const, weeklyWorkouts: 0, dailySteps: 1000, goal: "fast_cut" as const };
  const result = calculateEnergy(tiny);
  assert.ok(result.ok);
  assert.equal(result.calorieTarget, result.bmr);
  assert.ok(result.calorieTarget >= result.bmr);
});

test("a missing input is named rather than guessed at", () => {
  const result = calculateEnergy({ weightKg: 88, goal: "maintain" });
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.deepEqual([...result.missing], ["age", "height", "sex"]);
  assert.deepEqual([...missingEnergyFields({ ...CLIENT })], ["goal"]);
  assert.deepEqual([...missingEnergyFields({ ...CLIENT, goal: "maintain" })], []);
});

test("BMI is available but never feeds the calorie chain", async () => {
  assert.equal(bodyMassIndex(88, 180), 27.2);
  assert.equal(bodyMassIndex(0, 180), null);
  const { readFile } = await import("node:fs/promises");
  const energy = await readFile(new URL("../lib/nutrition/energy.ts", import.meta.url), "utf8");
  // Just the body of calculateEnergy - not the rest of the file, which of course
  // defines bodyMassIndex further down.
  const start = energy.indexOf("export function calculateEnergy");
  const body = energy.slice(start, energy.indexOf("\n}\n", start));
  assert.ok(body.includes("basalMetabolicRate"), "the chain should start at BMR");
  assert.doesNotMatch(body, /bodyMassIndex|\bbmi\b/i, "BMI must not inform the calorie target");
});

test("the default plan is protein by weight, fat at a quarter, carbs the rest", () => {
  const result = planMacros({ calories: 2892, weightKg: 88, sources: ALL_AUTOMATIC, current: {} });
  assert.ok(result.ok);
  assert.equal(result.plan.protein, Math.round(88 * 1.8));   // 158
  assert.equal(result.plan.fat, Math.round((2892 * 0.25) / 9)); // 80
  // And the identity holds.
  assert.ok(Math.abs(caloriesFromMacros(result.plan) - 2892) <= 10);
});

test("a manual protein figure moves the carbohydrates, not the calories", () => {
  const automatic = planMacros({ calories: 2500, weightKg: 80, sources: ALL_AUTOMATIC, current: {} });
  assert.ok(automatic.ok);

  const manual = planMacros({
    calories: 2500,
    weightKg: 80,
    sources: { ...ALL_AUTOMATIC, protein: "manual" },
    current: { protein: 200 },
  });
  assert.ok(manual.ok);
  assert.equal(manual.plan.calories, 2500, "the calorie target is the decision and must not move");
  assert.equal(manual.plan.protein, 200);
  // Fat is still a quarter of the calories, because it is still automatic.
  assert.equal(manual.plan.fat, automatic.plan.fat);
  assert.ok(manual.plan.carbohydrates < automatic.plan.carbohydrates);
});

test("a manual fat figure is kept, and carbohydrates absorb it", () => {
  const result = planMacros({
    calories: 2500,
    weightKg: 80,
    sources: { ...ALL_AUTOMATIC, fat: "manual" },
    current: { fat: 100 },
  });
  assert.ok(result.ok);
  assert.equal(result.plan.fat, 100);
  assert.equal(result.sources.fat, "manual");
  assert.equal(result.sources.carbohydrates, "auto");
  assert.ok(Math.abs(caloriesFromMacros(result.plan) - 2500) <= 10);
});

test("manual figures survive a recalculation of the others", () => {
  const sources = { ...ALL_AUTOMATIC, protein: "manual" as const };
  const first = planMacros({ calories: 2500, weightKg: 80, sources, current: { protein: 210 } });
  assert.ok(first.ok);
  // Changing the calorie target recomputes around the manual protein.
  const second = planMacros({ calories: 2800, weightKg: 80, sources, current: { protein: 210 } });
  assert.ok(second.ok);
  assert.equal(second.plan.protein, 210);
  assert.ok(second.plan.carbohydrates > first.plan.carbohydrates);
});

test("recalculating puts every field back under the system's control", () => {
  const result = resetToAutomatic(2500, 80);
  assert.ok(result.ok);
  assert.equal(result.plan.protein, Math.round(80 * 1.8));
  assert.equal(result.plan.fat, Math.round((2500 * 0.25) / 9));
  assert.deepEqual(result.sources, ALL_AUTOMATIC);
});

test("a plan that cannot balance is refused rather than clamped", () => {
  // Protein and fat alone already exceed the target.
  const result = planMacros({
    calories: 1200,
    weightKg: 120,
    sources: { ...ALL_AUTOMATIC, fat: "manual" },
    current: { fat: 90 },
  });
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  assert.equal(result.reason, "negative_carbohydrates");
});

test("macros that disagree with the target produce a warning, not silence", () => {
  const result = planMacros({
    calories: 2500,
    weightKg: 80,
    sources: { calories: "auto", protein: "manual", carbohydrates: "manual", fat: "manual" },
    current: { protein: 100, fat: 50 },
  });
  assert.ok(result.ok);
  // Carbohydrates are still derived, so this one balances.
  assert.equal(result.warning, undefined);
  assert.ok(Math.abs(caloriesFromMacros(result.plan) - 2500) <= 10);
});

test("missing weight or calories is a missing input, not a zero plan", () => {
  assert.deepEqual(planMacros({ calories: 0, weightKg: 80, sources: ALL_AUTOMATIC, current: {} }), { ok: false, reason: "missing_input" });
  assert.deepEqual(planMacros({ calories: 2000, weightKg: 0, sources: ALL_AUTOMATIC, current: {} }), { ok: false, reason: "missing_input" });
});

// The picker complaint: protein listing carbohydrates and vice versa.
const chicken = { id: "food-chicken", protein: 31, carbs: 0, fat: 3.6 };
const rice = { id: "food-rice", protein: 2.7, carbs: 28, fat: 0.3 };
const oil = { id: "food-oil", protein: 0, carbs: 0, fat: 100 };
const masterProtein = { id: "master-p-1", protein: 1, carbs: 40, fat: 0 };
const masterCarb = { id: "master-c-2", protein: 40, carbs: 1, fat: 0 };

test("a food is classified by its dominant macro, the same way the database does", () => {
  assert.equal(foodMacroGroup(chicken), "protein");
  assert.equal(foodMacroGroup(rice), "carbohydrate");
  assert.equal(foodMacroGroup(oil), "fat");
  // Ties go to protein, matching 202607290005_refine_legacy_macro_groups.sql.
  assert.equal(foodMacroGroup({ id: "food-tie", protein: 10, carbs: 10, fat: 10 }), "protein");
  assert.equal(foodMacroGroup({ id: "food-null", protein: null, carbs: null, fat: null }), "protein");
});

test("a curated master food keeps the group it was curated into", () => {
  // Its macros say otherwise; the curation is deliberate and wins.
  assert.equal(foodMacroGroup(masterProtein), "protein");
  assert.equal(foodMacroGroup(masterCarb), "carbohydrate");
});

test("the protein group never offers a carbohydrate, and the reverse", () => {
  const catalogue = [chicken, rice, oil, masterProtein, masterCarb];

  const proteins = foodsForGroup(catalogue, "protein").map((food) => food.id);
  assert.ok(proteins.includes("food-chicken"));
  assert.ok(proteins.includes("master-p-1"));
  assert.ok(!proteins.includes("food-rice"), "rice must not appear under protein");
  assert.ok(!proteins.includes("master-c-2"));
  assert.ok(!proteins.includes("food-oil"));

  const carbs = foodsForGroup(catalogue, "carbohydrate").map((food) => food.id);
  assert.ok(carbs.includes("food-rice"));
  assert.ok(carbs.includes("master-c-2"));
  assert.ok(!carbs.includes("food-chicken"), "chicken must not appear under carbohydrate");
  assert.ok(!carbs.includes("master-p-1"));
});
