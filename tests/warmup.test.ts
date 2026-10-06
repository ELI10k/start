import assert from "node:assert/strict";
import test from "node:test";

import { isFirstExerciseForMuscle, planWarmup } from "../lib/workouts/warmup.ts";

test("warm-up uses the prescribed 50 percent and 80 percent preparation sets", () => {
  const plan = planWarmup(40, { repetitions: 8 });
  assert.ok(plan);
  assert.deepEqual(plan.sets, [
    { percent: 50, weightKg: 20, repetitions: 12 },
    { percent: 80, weightKg: 32.5, repetitions: 12 },
  ]);
});

test("both warm-up sets use repetitions derived from the working-set target", () => {
  assert.deepEqual(planWarmup(40, { repetitions: 8 })?.sets.map((set) => set.repetitions), [12, 12]);
  assert.deepEqual(planWarmup(40, { repetitions: 9 })?.sets.map((set) => set.repetitions), [15, 15]);
  assert.deepEqual(planWarmup(40, { repetitions: 12 })?.sets.map((set) => set.repetitions), [15, 15]);
  assert.deepEqual(planWarmup(40, { repetitions: 15 })?.sets.map((set) => set.repetitions), [20, 20]);
  assert.deepEqual(planWarmup(40, { repetitions: 20 })?.sets.map((set) => set.repetitions), [20, 20]);
  assert.equal(planWarmup(40, { repetitions: 20, compound: true })?.sets.length, 2);
});

test("an active workout does not install a browser reload warning", async () => {
  const { readFile } = await import("node:fs/promises");
  const session = await readFile(new URL("../components/workouts/client/WorkoutSession.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(session, /beforeunload/);
});

test("workout session excludes every abdominal exercise from loaded warm-ups", async () => {
  const { readFile } = await import("node:fs/promises");
  const session = await readFile(new URL("../components/workouts/client/WorkoutSession.tsx", import.meta.url), "utf8");
  assert.match(session, /abdominalExercise=exercise\?\.primaryMuscleGroup===\"בטן\"/);
  assert.match(session, /professional\?needsPreparation:firstForMuscle/);
});

test("warm-up is offered only on the first exercise for a muscle group", () => {
  assert.equal(isFirstExerciseForMuscle("גב", ["חימום", "רגליים"]), true);
  assert.equal(isFirstExerciseForMuscle("גב", ["חימום", "גב"]), false);
  assert.equal(isFirstExerciseForMuscle(undefined, ["חימום"]), false);
});
