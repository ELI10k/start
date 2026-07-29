import assert from "node:assert/strict";
import test from "node:test";
import { getLatestWeighIn, summarizeProgress } from "../lib/progress/calculations.ts";
import type { WeighIn } from "../lib/progress/types.ts";

const entries: WeighIn[] = [
  { id: "2", clientId: "c", date: "2026-07-12", weightKg: 79.5, measurements: { waistCm: 88 } },
  { id: "1", clientId: "c", date: "2026-07-01", weightKg: 81, measurements: { waistCm: 90 } },
  { id: "3", clientId: "c", date: "2026-07-19", weightKg: 79, measurements: {} },
];
test("progress finds chronological start and latest safely", () => { assert.equal(getLatestWeighIn(entries)?.id, "3"); assert.deepEqual(summarizeProgress(entries), { latestWeight: 79, startingWeight: 81, weightChangeFromStart: -2, weightChangeFromPrevious: -0.5, latestWaist: 88, startingWaist: 90, waistChange: -2, weeklyTrend: "down" }); });
test("empty progress history returns an explicit empty summary", () => assert.deepEqual(summarizeProgress([]), { latestWeight: undefined, startingWeight: undefined, weightChangeFromStart: undefined, weightChangeFromPrevious: undefined, latestWaist: undefined, startingWaist: undefined, waistChange: undefined, weeklyTrend: "insufficient-data" }));
