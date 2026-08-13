import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { calculateEnergy, GOAL_CALORIE_OFFSET, NUTRITION_GOALS } from "../lib/nutrition/energy.ts";
import { PROGRAMMES_BY_LEVEL, TRAINEE_LEVELS } from "../lib/workouts/trainee-level.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The intake form runs once, at creation. Everything below is about the client
// who already existed when the calorie columns were added - and who, until now,
// could never be given an age, a goal or a level.

test("a client with no intake is told what is missing, not given a guessed target", () => {
  const result = calculateEnergy({ weightKg: 80 });
  assert.equal(result.ok, false);
  assert.ok(!result.ok);
  // Named individually, so the coach knows which field to go and fill.
  assert.deepEqual([...result.missing].sort(), ["age", "goal", "height", "sex"]);
});

test("filling the intake in is what makes the chain computable", () => {
  const complete = calculateEnergy({
    ageYears: 30, weightKg: 80, heightCm: 180, sex: "male",
    weeklyWorkouts: 3, dailySteps: 8000, goal: "gentle_cut",
  });
  assert.ok(complete.ok);
  // BMR -> factor -> TDEE -> target, each derived from the one before it.
  assert.equal(complete.bmr, 10 * 80 + 6.25 * 180 - 5 * 30 + 5);
  assert.equal(complete.tdee, Math.round(complete.bmr * complete.activityFactor));
  assert.equal(complete.calorieTarget, complete.tdee + GOAL_CALORIE_OFFSET.gentle_cut);
});

test("every goal the form offers is one the engine knows how to price", async () => {
  const form = await source("components/coach/ClientIntakeForm.tsx");
  // The options come from the engine's own list rather than being retyped, so a
  // sixth goal cannot appear in the form without an offset behind it.
  assert.match(form, /NUTRITION_GOALS\.map\(\(goal\) => \[goal, GOAL_LABELS\[goal\]\]\)/);
  for (const goal of NUTRITION_GOALS) {
    assert.equal(typeof GOAL_CALORIE_OFFSET[goal], "number", `${goal} has no calorie offset`);
  }
  assert.equal(NUTRITION_GOALS.length, 5);
});

test("the new-client form works the target out while the coach is still typing", async () => {
  const form = await source("components/coach/CreateClientForm.tsx");
  // It used to be invisible until the client existed and a menu was opened, so a
  // mistyped height was only caught much later, if at all.
  assert.match(form, /calculateEnergy\(\{/);
  assert.match(form, /calculateMacroTargetResult\(/);
  // The shared functions, not a second copy of the arithmetic.
  assert.doesNotMatch(form, /1\.8|0\.25|Mifflin/);
  assert.match(form, /import \{ calculateMacroTargetResult \} from "@\/lib\/nutrition\/macro-targets"/);
  // And it names what is missing rather than showing a zero.
  assert.match(form, /energy\.missing\.map\(field=>MISSING_LABELS\[field\]\)/);
});

test("the update is coach-only, and only for that coach's own client", async () => {
  const actions = await source("app/actions/onboarding.ts");
  const fn = actions.slice(actions.indexOf("export async function updateClientIntake"));
  assert.match(fn, /coach\.role!=="coach"/);
  // The dashboard query returns nothing unless the relationship exists, which is
  // the same authorization every other coach action here uses.
  assert.match(fn, /getCoachClientDashboard\(coach\.id,clientId\)/);
  assert.match(fn, /if\(!client\) return \{status:"error"/);
});

test("changing the trainee level stores the level and nothing else", async () => {
  const actions = await source("app/actions/onboarding.ts");
  const fn = actions.slice(
    actions.indexOf("export async function updateClientIntake"),
    actions.indexOf("const createClientErrorMessage"),
  );
  assert.match(fn, /trainee_level:traineeLevel/);
  // No assignment is created, removed or touched from this screen, so a workout
  // the client already did cannot be disturbed by a correction to their level.
  assert.doesNotMatch(fn, /assignLevelProgrammes|workout_assignments|assignmentsToAdd/);
});

test("the session count is merged into the preferences blob, not written over it", async () => {
  const actions = await source("app/actions/onboarding.ts");
  const fn = actions.slice(actions.indexOf("export async function updateClientIntake"));
  // Overwriting would drop the allergies, meal times and equipment the original
  // intake put there.
  assert.match(fn, /const preferences=\{\.\.\.currentPreferences,weekly_workouts:weeklyWorkouts\}/);
});

test("the level mapping is offered as a recommendation, and says so", async () => {
  const form = await source("components/coach/ClientIntakeForm.tsx");
  assert.match(form, /תוכניות מומלצות לרמת/);
  assert.match(form, /המלצה בלבד/);
  // It reads the shared mapping rather than restating programme names.
  assert.match(form, /PROGRAMMES_BY_LEVEL\[level\]\.map/);
  assert.doesNotMatch(form, /A-B-C"/);
  // And the mapping is the one the product asked for.
  assert.deepEqual([...TRAINEE_LEVELS], ["beginner", "intermediate", "advanced"]);
  assert.deepEqual([...PROGRAMMES_BY_LEVEL.beginner], ["FBW משקולות חופשי מתחילים", "משקל גוף מתחילים"]);
  assert.deepEqual([...PROGRAMMES_BY_LEVEL.intermediate], ["אימון FBW מלא לחדר כושר", "משקל גוף מתקדמים"]);
  assert.deepEqual([...PROGRAMMES_BY_LEVEL.advanced], ["A-B קצר", "A-B", "A-B-C"]);
});

test("the weight is not editable from the coach's card", async () => {
  const form = await source("components/coach/ClientIntakeForm.tsx");
  // It comes from the client's own weigh-ins; a coach typing one would put a
  // figure in the progress history that nobody stood on a scale for.
  assert.doesNotMatch(form, /name="weight"/);
  assert.match(form, /משקל אחרון מהמדידות/);
});

test("out-of-range intake is refused with the field named", async () => {
  const actions = await source("app/actions/onboarding.ts");
  const fn = actions.slice(actions.indexOf("export async function updateClientIntake"));
  assert.match(fn, /age<12 \|\| age>100/);
  assert.match(fn, /steps<0 \|\| steps>60000/);
  assert.match(fn, /weeklyWorkouts>14/);
  assert.match(fn, /בין 0 ל־14/);
});

test("every select on the changed screens carries its own accessible name", async () => {
  // A select wrapped in a <label> otherwise announces as the label text followed
  // by every option, and nothing can find it by name.
  for (const path of [
    "components/coach/ClientIntakeForm.tsx",
    "components/coach/CreateClientForm.tsx",
    "components/coach/menus/PersistentMenuEditor.tsx",
  ]) {
    const text = await source(path);
    const selects = text.match(/<select[^>]*>/g) ?? [];
    assert.ok(selects.length > 0, `${path} has no select to check`);
    for (const tag of selects) {
      assert.match(tag, /aria-label=/, `${path} has a select with no accessible name: ${tag.slice(0, 80)}`);
    }
  }
});
