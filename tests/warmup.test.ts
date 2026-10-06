import assert from "node:assert/strict";
import test from "node:test";

import { isFirstExerciseForMuscle, planWarmup, warmupMuscleKey } from "../lib/workouts/warmup.ts";

test("warm-up uses two preparation sets with 12 reps for targets up to 8", () => {
  const plan = planWarmup(40, { repetitions: 8 });
  assert.ok(plan);
  assert.deepEqual(plan.sets, [
    { percent: 50, weightKg: 20, repetitions: 12 },
    { percent: 80, weightKg: 32.5, repetitions: 12 },
  ]);
});

test("both warm-up sets scale repetitions with the working-set target", () => {
  assert.equal(planWarmup(40, { repetitions: 9 })?.sets[0]?.repetitions, 15);
  assert.equal(planWarmup(40, { repetitions: 9 })?.sets[1]?.repetitions, 15);
  assert.equal(planWarmup(40, { repetitions: 12 })?.sets[0]?.repetitions, 15);
  assert.equal(planWarmup(40, { repetitions: 15 })?.sets[0]?.repetitions, 20);
  assert.equal(planWarmup(40, { repetitions: 20, compound: true })?.sets.length, 2);
});

test("warm-up is offered only on the first exercise for a muscle group", () => {
  assert.equal(isFirstExerciseForMuscle("גב", ["חימום", "רגליים"]), true);
  assert.equal(isFirstExerciseForMuscle("גב", ["חימום", "גב"]), false);
  assert.equal(isFirstExerciseForMuscle(undefined, ["חימום"]), false);
});

test("knee flexion and extension receive separate warm-ups in every programme", () => {
  const hamstrings = warmupMuscleKey("רגליים", "כפיפת רגליים במכונה | תרגיל רגליים להמטסרינג");
  const quadriceps = warmupMuscleKey("רגליים", "פשיטת רגליים במכונה | תרגיל רגליים לארבע ראשי");

  assert.equal(hamstrings, "רגליים:כפיפת-ברך");
  assert.equal(quadriceps, "רגליים:פשיטת-ברך");
  assert.equal(isFirstExerciseForMuscle(quadriceps, ["חימום", hamstrings]), true);
  assert.equal(isFirstExerciseForMuscle(quadriceps, ["חימום", quadriceps]), false);
});
