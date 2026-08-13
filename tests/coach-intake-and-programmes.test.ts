import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assignmentsToAdd, missingProgrammes, PROGRAMMES_BY_LEVEL, programmesForLevel } from "../lib/workouts/trainee-level.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The catalogue as it actually stands, names included - "A-B" and "A-B קצר" are
// prefixes of one another, which is the trap a loose match would fall into.
const CATALOGUE = [
  { id: "p1", name: "FBW משקולות חופשי מתחילים", trainingFrequency: 3 },
  { id: "p2", name: "משקל גוף מתחילים", trainingFrequency: 3 },
  { id: "p3", name: "אימון FBW מלא לחדר כושר", trainingFrequency: 3 },
  { id: "p4", name: "משקל גוף מתקדמים", trainingFrequency: 3 },
  { id: "p5", name: "A-B קצר", trainingFrequency: 4 },
  { id: "p6", name: "A-B", trainingFrequency: 4 },
  { id: "p7", name: "A-B-C", trainingFrequency: 4 },
];

test("a beginner gets the two beginner programmes", () => {
  const programmes = programmesForLevel("beginner", CATALOGUE);
  assert.deepEqual(programmes.map((item) => item.name), ["FBW משקולות חופשי מתחילים", "משקל גוף מתחילים"]);
  assert.equal(programmes.length, 2);
});

test("an intermediate gets the two intermediate programmes", () => {
  const programmes = programmesForLevel("intermediate", CATALOGUE);
  assert.deepEqual(programmes.map((item) => item.name), ["אימון FBW מלא לחדר כושר", "משקל גוף מתקדמים"]);
  assert.equal(programmes.length, 2);
});

test("an advanced trainee gets all three splits, and the right ones", () => {
  const programmes = programmesForLevel("advanced", CATALOGUE);
  assert.equal(programmes.length, 3);
  // Exact matching matters here: a prefix match on "A-B" would take "A-B קצר"
  // and "A-B-C" as well, and the coach would never know why.
  assert.deepEqual(programmes.map((item) => item.id), ["p5", "p6", "p7"]);
});

test("a programme the catalogue does not have is reported, never invented", () => {
  const thin = [CATALOGUE[0]];
  assert.deepEqual(programmesForLevel("beginner", thin).map((item) => item.id), ["p1"]);
  assert.deepEqual([...missingProgrammes("beginner", thin)], ["משקל גוף מתחילים"]);
  assert.deepEqual([...missingProgrammes("beginner", CATALOGUE)], []);
});

test("changing level adds programmes and never removes the old ones", () => {
  // The client trained as a beginner and is moving up. Their completed workouts
  // belong to those assignments, so nothing may be taken away.
  const existing = ["p1", "p2"];
  const added = assignmentsToAdd("intermediate", CATALOGUE, existing);
  assert.deepEqual(added.map((item) => item.id), ["p3", "p4"]);
  // Nothing in the mapping can express a removal.
  const everything = new Set([...existing, ...added.map((item) => item.id)]);
  assert.equal(everything.size, 4);
});

test("re-applying the same level assigns nothing a second time", () => {
  assert.deepEqual(assignmentsToAdd("beginner", CATALOGUE, ["p1", "p2"]), []);
  assert.deepEqual(assignmentsToAdd("advanced", CATALOGUE, ["p5"]).map((item) => item.id), ["p6", "p7"]);
});

test("each level maps to the programme count the product asked for", () => {
  assert.equal(PROGRAMMES_BY_LEVEL.beginner.length, 2);
  assert.equal(PROGRAMMES_BY_LEVEL.intermediate.length, 2);
  assert.equal(PROGRAMMES_BY_LEVEL.advanced.length, 3);
});

test("assignment inserts rows directly, so a client can hold several at once", async () => {
  const action = await source("app/actions/onboarding.ts");
  // assign_workout_program keeps exactly one active assignment by design, which
  // is the opposite of what a level needs.
  assert.match(action, /async function assignLevelProgrammes/);
  assert.match(action, /from\("workout_assignments"\)\.insert/);
  assert.doesNotMatch(action, /rpc\("assign_workout_program"/);
  // And a failure there must not undo a client that was already created.
  assert.match(action, /level programme assignment failed/);
});

test("the intake collects what the calculation needs and drops what nothing read", async () => {
  const form = await source("components/coach/CreateClientForm.tsx");
  for (const field of ["ageYears", "sex", "height", "weight", "weeklyWorkouts", "dailySteps", "nutritionGoal", "traineeLevel"]) {
    assert.match(form, new RegExp(`name="${field}"`), `${field} is missing from the intake`);
  }
  // Removed: a birth date the calculation would have to derive an age from, and
  // two free-text fields nothing ever read.
  for (const field of ["birthDate", "dietaryPreferences", "foodDislikes", "activityLevel", "trainingType"]) {
    assert.doesNotMatch(form, new RegExp(`name="${field}"`), `${field} should no longer be collected`);
  }
  // Trainee level replaced activity level, and says what it is for.
  assert.match(form, /רמת מתאמן/);
  assert.doesNotMatch(form, /רמת פעילות/);
});

test("the intake is stored in columns a query can use, not in a free-text blob", async () => {
  const action = await source("app/actions/onboarding.ts");
  assert.match(action, /nutrition_goal:nutritionGoal/);
  assert.match(action, /trainee_level:traineeLevel/);
  assert.match(action, /age_years:positive\(form,"ageYears"\)/);
  assert.match(action, /daily_steps:nonNegative\(form,"dailySteps"\)/);
  // Only a value from the closed list is stored.
  assert.match(action, /isNutritionGoal\(value\(form,"nutritionGoal"\)\)/);
  assert.match(action, /isTraineeLevel\(value\(form,"traineeLevel"\)\)/);

  const migration = await source("supabase/migrations/202608110007_client_energy_inputs.sql");
  assert.match(migration, /nutrition_goal text check [\s\S]*'maintain', 'gentle_cut', 'fast_cut', 'lean_bulk', 'dirty_bulk'/);
  assert.match(migration, /trainee_level text check [\s\S]*'beginner', 'intermediate', 'advanced'/);
});

test("the builder computes from the client's own data rather than a typed number", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  assert.match(editor, /calculateEnergy/);
  assert.match(editor, /const energy=energyFor\(menu\.clientId,goal\)/);
  // The goal is a control, and changing it recomputes.
  assert.match(editor, /const changeGoal=/);
  // Missing inputs are named, not guessed at.
  assert.match(editor, /MISSING_LABELS\[field\]/);
  // And BMI is nowhere in the calorie path.
  assert.doesNotMatch(editor, /bodyMassIndex/);
});

test("the picker filters by the food's own group, and keeps favorite foods first", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  // The old filter let every non-master food through, which is why protein was
  // listing everything.
  assert.doesNotMatch(editor, /!food\.masterGroup\|\|food\.masterGroup===/);
  assert.match(editor, /foodsForGroup\(foods,/);

  const picker = await source("components/coach/menus/FoodCombobox.tsx");
  // Searching narrows; it does not reorder the sections away.
  assert.match(picker, /const searchFavorites=matching\.filter\(item=>item\.food\.isMaster\|\|item\.u\?\.favorite\)/);
  assert.match(picker, /return\[\.\.\.searchFavorites,\.\.\.searchRest\]/);
});

test("the food name gets its own line, and the primary can be deleted", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  assert.match(editor, /food-row__head/);
  assert.match(editor, /food-row__body/);
  // Deleting the primary clears the group rather than orphaning alternatives
  // that were each scaled to it.
  assert.match(editor, /items:isPrimary\?\[\]:value\.items\.filter/);
  assert.match(editor, /מחיקת המאכל הראשי תאפס גם את החלופות/);
  // The delete button is no longer disabled on the primary.
  assert.doesNotMatch(editor, /disabled=\{itemIndex===0&&group\.items\.length===1\}/);

  const css = await source("app/globals.css");
  // The name wraps instead of being truncated.
  assert.match(css, /\.food-row__pick \{[^}]*overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /\.food-row__pick \{[^}]*text-overflow: ellipsis/);
});
