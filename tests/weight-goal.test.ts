import assert from "node:assert/strict";
import test from "node:test";
import { weightGoalEstimate, weightGoalProgress } from "../lib/progress/weight-goal.ts";

const entries = (start: number, current: number) => [
  { date: "2026-01-01", weight: start, navel_circumference: null },
  { date: "2026-02-01", weight: current, navel_circumference: null },
];

test("calculates a weight-loss goal meter", () => {
  assert.deepEqual(weightGoalProgress(entries(90, 87), 80), {
    startingWeight: 90, currentWeight: 87, targetWeight: 80,
    remainingKg: 7, completedKg: 3, percent: 30,
  });
});

test("also supports weight-gain goals and caps a passed target", () => {
  assert.equal(weightGoalProgress(entries(70, 75), 80)?.percent, 50);
  assert.deepEqual(weightGoalProgress(entries(70, 82), 80)?.remainingKg, 0);
  assert.equal(weightGoalProgress(entries(70, 82), 80)?.percent, 100);
});

test("does not show a meter without both a target and a weigh-in", () => {
  assert.equal(weightGoalProgress([], 80), null);
  assert.equal(weightGoalProgress(entries(90, 87), null), null);
});

test("estimates weeks and months remaining from a weekly trend toward the goal", () => {
  const progress = weightGoalProgress(entries(89.5, 87.9), 80)!;
  assert.deepEqual(weightGoalEstimate(progress, -0.5), { weeks: 16, months: 3.6 });
});

test("does not estimate an arrival when the trend is unavailable or moving away", () => {
  const loss = weightGoalProgress(entries(90, 87), 80)!;
  assert.equal(weightGoalEstimate(loss, null), null);
  assert.equal(weightGoalEstimate(loss, 0), null);
  assert.equal(weightGoalEstimate(loss, 0.5), null);

  const gain = weightGoalProgress(entries(70, 74), 80)!;
  assert.equal(weightGoalEstimate(gain, -0.5), null);
});
