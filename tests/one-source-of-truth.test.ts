import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { calculateEnergy, GOAL_CALORIE_OFFSET } from "../lib/nutrition/energy.ts";
import { ALL_AUTOMATIC, FAT_SHARE_OF_CALORIES, planMacros, PROTEIN_GRAMS_PER_KG } from "../lib/nutrition/macro-plan.ts";
import { calculateMacroTargetResult } from "../lib/nutrition/macro-targets.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// One calorie engine, one macro rule. Two of either is how a coach and a client
// end up looking at different numbers for the same person.

test("there is exactly one implementation of BMR and the goal offsets", async () => {
  const files = await readdir(new URL("../lib/nutrition/", import.meta.url));
  const implementations: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".ts")) continue;
    const text = await source(`lib/nutrition/${file}`);
    // The Mifflin-St Jeor constants, in any arrangement.
    if (/6\.25\s*\*/.test(text) && /10\s*\*/.test(text)) implementations.push(file);
  }
  assert.deepEqual(implementations, ["energy.ts"], `BMR is implemented in more than one place: ${implementations.join(", ")}`);
});

test("the macro split is stated once and imported, not restated", async () => {
  const files = await readdir(new URL("../lib/nutrition/", import.meta.url));
  const declarations: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".ts")) continue;
    const text = await source(`lib/nutrition/${file}`);
    if (/=\s*1\.8\s*;/.test(text) || /=\s*0\.25\s*;/.test(text)) declarations.push(file);
  }
  assert.deepEqual(declarations, ["macro-targets.ts"], `the split is declared in more than one place: ${declarations.join(", ")}`);
  assert.equal(PROTEIN_GRAMS_PER_KG, 1.8);
  assert.equal(FAT_SHARE_OF_CALORIES, 0.25);
});

test("the server's recomputation agrees with the browser's plan", () => {
  // The browser computes while the coach types; the server recomputes on save.
  // For the same inputs they must land on the same numbers.
  for (const [weight, calories] of [[88, 2600], [62, 1800], [105, 3200]] as const) {
    const server = calculateMacroTargetResult(weight, calories);
    const browser = planMacros({ calories, weightKg: weight, sources: ALL_AUTOMATIC, current: {} });
    assert.ok(server.ok && browser.ok);
    assert.equal(browser.plan.protein, server.targets.protein, `protein differs at ${weight}kg / ${calories}kcal`);
    assert.equal(browser.plan.fat, server.targets.fat, `fat differs at ${weight}kg / ${calories}kcal`);
    assert.equal(browser.plan.carbohydrates, server.targets.carbohydrates, `carbohydrates differ at ${weight}kg / ${calories}kcal`);
  }
});

test("the same client produces the same target wherever it is computed", () => {
  const client = { ageYears: 41, weightKg: 74, heightCm: 168, sex: "female" as const, weeklyWorkouts: 3, dailySteps: 8000 };
  // Every goal, computed twice, must be identical - there is only one function,
  // and this is what keeps it that way.
  for (const goal of Object.keys(GOAL_CALORIE_OFFSET) as (keyof typeof GOAL_CALORIE_OFFSET)[]) {
    const first = calculateEnergy({ ...client, goal });
    const second = calculateEnergy({ ...client, goal });
    assert.deepEqual(first, second);
    assert.ok(first.ok);
  }
});

test("the orphaned second engine is gone", async () => {
  const files = await readdir(new URL("../lib/nutrition/", import.meta.url));
  // It carried its own BMR, its own activity multiplier and its own goal
  // adjustments - -25%, -18%, +8% - none of which match the agreed offsets.
  // Nothing imported it, which is exactly why it could sit there disagreeing.
  assert.ok(!files.includes("calculations.ts"), "lib/nutrition/calculations.ts is back");
});

test("coach intake and client onboarding write the same columns", async () => {
  const action = await source("app/actions/onboarding.ts");
  // Both paths, one shape. Two shapes is how a client ends up uncomputable.
  const columns = ["nutrition_goal", "trainee_level", "age_years", "sex:", "daily_steps", "target_weight", "height"];
  const coachBlock = action.slice(action.indexOf("createClientFromCoach"), action.indexOf("completeClientOnboarding"));
  const clientBlock = action.slice(action.indexOf("completeClientOnboarding"));
  for (const column of columns) {
    assert.ok(coachBlock.includes(column), `the coach intake does not write ${column}`);
    assert.ok(clientBlock.includes(column), `client onboarding does not write ${column}`);
  }
  // And both give the client their programmes from the same helper.
  assert.ok(coachBlock.includes("assignLevelProgrammes"));
  assert.ok(clientBlock.includes("assignLevelProgrammes"));
});

test("onboarding does not reintroduce the fields the intake dropped", async () => {
  const page = await source("app/onboarding/page.tsx");
  for (const field of ["birthDate", "activityLevel", "dietaryPreferences", "foodDislikes"]) {
    assert.doesNotMatch(page, new RegExp(`name="${field}"`), `${field} is back on the onboarding form`);
  }
  for (const field of ["ageYears", "sex", "dailySteps", "nutritionGoal", "traineeLevel", "navelCircumference"]) {
    assert.match(page, new RegExp(`name="${field}"`), `${field} is missing from onboarding`);
  }
});

test("the manifest makes START installable, in Hebrew and standalone", async () => {
  const manifest = await source("app/manifest.ts");
  assert.match(manifest, /short_name: "START"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(manifest, /dir: "rtl"/);
  assert.match(manifest, /lang: "he"/);
  // Android crops to the launcher shape, so a maskable icon is not optional.
  assert.match(manifest, /purpose: "maskable"/);
  assert.match(manifest, /scope: "\/"/);
});

test("the service worker caches nothing, on purpose", async () => {
  const worker = await source("public/sw.js");
  // Every screen is server-rendered per request behind an auth cookie. A caching
  // worker would serve one person's data on another person's device.
  assert.match(worker, /event\.respondWith\(fetch\(event\.request\)\)/);
  assert.doesNotMatch(worker, /caches\.open|cache\.put|cache\.addAll/);
});
