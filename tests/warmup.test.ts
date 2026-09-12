import assert from "node:assert/strict";
import test from "node:test";

import { planWarmup } from "../lib/workouts/warmup.ts";

test("warm-up keeps the original 50/70 protocol", () => {
  const plan = planWarmup(40, { repetitions: 8 });
  assert.ok(plan);
  assert.deepEqual(plan.sets, [
    { percent: 50, weightKg: 20, repetitions: 10 },
    { percent: 70, weightKg: 27.5, repetitions: 5 },
  ]);
});

test("warm-up keeps the original easy and compound variants", () => {
  assert.deepEqual(planWarmup(40, { effort: "RPE 6" })?.sets.map((set) => set.percent), [50]);
  assert.deepEqual(planWarmup(40, { compound: true })?.sets.map((set) => set.percent), [50, 70, 85]);
});
