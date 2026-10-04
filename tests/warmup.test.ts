import assert from "node:assert/strict";
import test from "node:test";

import { isFirstExerciseForMuscle, planWarmup } from "../lib/workouts/warmup.ts";

test("warm-up uses one preparation set with 12 reps for targets up to 8", () => {
  const plan = planWarmup(40, { repetitions: 8 });
  assert.ok(plan);
  assert.deepEqual(plan.sets, [
    { percent: 50, weightKg: 20, repetitions: 12 },
  ]);
});

test("warm-up repetitions scale with the working-set target and never add extra sets", () => {
  assert.equal(planWarmup(40, { repetitions: 9 })?.sets[0]?.repetitions, 15);
  assert.equal(planWarmup(40, { repetitions: 12 })?.sets[0]?.repetitions, 15);
  assert.equal(planWarmup(40, { repetitions: 15 })?.sets[0]?.repetitions, 20);
  assert.equal(planWarmup(40, { repetitions: 20, compound: true })?.sets.length, 1);
});

test("an active workout does not install a browser reload warning", async () => {
  const { readFile } = await import("node:fs/promises");
  const session = await readFile(new URL("../components/workouts/client/WorkoutSession.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(session, /beforeunload/);
});

test("warm-up is offered only on the first exercise for a muscle group", () => {
  assert.equal(isFirstExerciseForMuscle("גב", ["חימום", "רגליים"]), true);
  assert.equal(isFirstExerciseForMuscle("גב", ["חימום", "גב"]), false);
  assert.equal(isFirstExerciseForMuscle(undefined, ["חימום"]), false);
});
