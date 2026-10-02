import assert from "node:assert/strict";
import test from "node:test";

import { workoutRestSeconds } from "../lib/workouts/rest.ts";

test("parses Hebrew workout rest prescriptions into seconds", () => {
  assert.equal(workoutRestSeconds("90 שניות"), 90);
  assert.equal(workoutRestSeconds("30 שניות"), 30);
  assert.equal(workoutRestSeconds("דקה"), 60);
  assert.equal(workoutRestSeconds("1 דק"), 60);
  assert.equal(workoutRestSeconds("1.5 דקות"), 90);
  assert.equal(workoutRestSeconds("1.5 -1 דקות"), 90);
  assert.equal(workoutRestSeconds("1.5 -2 דקות"), 120);
  assert.equal(workoutRestSeconds(undefined), null);
});
