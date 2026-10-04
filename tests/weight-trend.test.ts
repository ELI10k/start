import assert from "node:assert/strict";
import test from "node:test";

import { weightTrendTone } from "../lib/progress/weight-trend.ts";

test("weight changes are colored relative to cutting or bulking goals", () => {
  for (const goal of ["gentle_cut", "fast_cut"]) {
    assert.equal(weightTrendTone(-0.5, goal), "positive");
    assert.equal(weightTrendTone(0.5, goal), "negative");
  }
  for (const goal of ["lean_bulk", "dirty_bulk"]) {
    assert.equal(weightTrendTone(0.5, goal), "positive");
    assert.equal(weightTrendTone(-0.5, goal), "negative");
  }
});

test("unchanged weight and goals without a direction stay neutral", () => {
  assert.equal(weightTrendTone(0, "gentle_cut"), "neutral");
  assert.equal(weightTrendTone(0.5, "maintain"), "neutral");
  assert.equal(weightTrendTone(-0.5, null), "neutral");
});
