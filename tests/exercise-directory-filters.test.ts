import assert from "node:assert/strict";
import test from "node:test";
import { EXERCISE_CATEGORIES, EXERCISE_DIFFICULTIES, matchesExerciseCategory, sortMuscles } from "../lib/workouts/exercise-directory-filters.ts";
import type { Exercise } from "../lib/workouts/types.ts";

function exercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: "exercise-1", name: "תרגיל", normalizedName: "תרגיל", aliases: [], category: "כוח",
    primaryMuscleGroup: "חזה", secondaryMuscleGroups: [], equipment: "משקולות", difficulty: "בינוני",
    cues: [], commonMistakes: [], sourceWorkbooks: [], sourceReferences: [], status: "active", ...overrides,
  };
}

test("exercise directory exposes the requested category and difficulty order", () => {
  assert.deepEqual([...EXERCISE_CATEGORIES], ["משקולות", "מכונות", "משקל גוף", "TRX"]);
  assert.deepEqual(EXERCISE_DIFFICULTIES.map(({ label }) => label), ["מתחילים", "בינוני", "מתקדמת"]);
});

test("muscles are ordered anatomically instead of alphabetically", () => {
  assert.deepEqual(sortMuscles(["ישבן", "חזה", "יד אחורית", "גב", "כתף קדמית"]), ["חזה", "גב", "כתף קדמית", "יד אחורית", "ישבן"]);
});

test("category choices group exercises by their actual equipment", () => {
  assert.equal(matchesExerciseCategory(exercise({ equipment: "מכונת לחיצת חזה" }), "מכונות"), true);
  assert.equal(matchesExerciseCategory(exercise({ equipment: "משקל גוף", category: "ליבה" }), "משקל גוף"), true);
  assert.equal(matchesExerciseCategory(exercise({ equipment: "רצועות TRX" }), "TRX"), true);
  assert.equal(matchesExerciseCategory(exercise({ equipment: "משקולות יד" }), "משקולות"), true);
  assert.equal(matchesExerciseCategory(exercise({ equipment: "רצועות תלייה" }), "TRX"), true);
  assert.equal(matchesExerciseCategory(exercise({ category: "משקל גוף", equipment: "מוט" }), "משקל גוף"), true);
  assert.equal(matchesExerciseCategory(exercise({ category: "מכונות", equipment: "כבל פולי" }), "משקולות"), false);
  assert.equal(matchesExerciseCategory(exercise({ category: "משקולות ומכונות", equipment: "משקולות יד", sourceWorkbooks: ["בנק תרגילים משקולות ומכונות.xlsx"] }), "משקולות"), true);
});
