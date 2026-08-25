import assert from "node:assert/strict";
import test from "node:test";

import { planWarmup } from "../lib/workouts/warmup.ts";

test("warm-up repetitions always follow the current workout prescription", () => {
  for (const repetitions of [8, 10, 12]) {
    const plan = planWarmup(40, { repetitions });
    assert.ok(plan);
    assert.deepEqual(plan.sets.map((set) => set.repetitions), [repetitions, repetitions]);
  }
});

test("warm-up does not invent repetitions when the workout has none", () => {
  assert.equal(planWarmup(40), null);
});
