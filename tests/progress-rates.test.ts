import assert from "node:assert/strict";
import test from "node:test";
import { averageWeightChangeRates } from "../lib/progress/rates.ts";

test("average weight rate uses actual elapsed days", () => {
  const result = averageWeightChangeRates([
    { date: "2026-08-01", value: 90 },
    { date: "2026-08-15", value: 88 },
  ]);
  assert.deepEqual(result, { days: 14, weeklyKg: -1, monthlyKg: null });
});

test("average weight rate sorts entries and reports gains", () => {
  const result = averageWeightChangeRates([
    { date: "2026-08-08", value: 81 },
    { date: "2026-08-01", value: 80 },
  ]);
  assert.deepEqual(result, { days: 7, weeklyKg: 1, monthlyKg: null });
});

test("a partial week is not extrapolated into misleading rates", () => {
  const result = averageWeightChangeRates([
    { date: "2026-08-18", value: 89.5 },
    { date: "2026-08-21", value: 87 },
  ]);
  assert.deepEqual(result, { days: 3, weeklyKg: null, monthlyKg: null });
});

test("a full month exposes both observed rates", () => {
  const result = averageWeightChangeRates([
    { date: "2026-07-01", value: 90 },
    { date: "2026-07-31", value: 87 },
  ]);
  assert.deepEqual(result, { days: 30, weeklyKg: -0.7, monthlyKg: -3.04 });
});

test("average weight rate needs two different dates", () => {
  assert.equal(averageWeightChangeRates([{ date: "2026-08-01", value: 80 }]), null);
  assert.equal(averageWeightChangeRates([
    { date: "2026-08-01", value: 80 },
    { date: "2026-08-01", value: 79 },
  ]), null);
});
