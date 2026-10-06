import assert from "node:assert/strict";
import test from "node:test";

import { isFirstExerciseForMuscle, planWarmup, warmupMuscleKey } from "../lib/workouts/warmup.ts";

test("warm-up uses the two prescribed preparation sets", () => {
  const plan = planWarmup(40, { repetitions: 8 });
  assert.ok(plan);
  assert.deepEqual(plan.sets, [
    { percent: 50, weightKg: 20, repetitions: 10 },
    { percent: 70, weightKg: 27.5, repetitions: 5 },
  ]);
});

test("warm-up protocol is stable across working-set targets", () => {
  for (const repetitions of [8, 9, 12, 15, 20]) {
    assert.deepEqual(planWarmup(40, { repetitions })?.sets.map((set) => set.repetitions), [10, 5]);
  }
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
