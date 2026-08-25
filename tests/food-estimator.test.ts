import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseNutritionEstimate } from "../lib/nutrition/food-estimator.ts";

test("parses a bounded nutrition estimate", () => {
  assert.deepEqual(parseNutritionEstimate('{"name":"3 עוגיות","calories":240,"protein":4,"carbs":32,"fat":11}'), {
    name: "3 עוגיות", calories: 240, protein: 4, carbs: 32, fat: 11,
  });
});

test("rejects malformed and nutritionally impossible estimates", () => {
  assert.equal(parseNutritionEstimate("not json"), null);
  assert.equal(parseNutritionEstimate('{"name":"עוגייה","calories":9999,"protein":1,"carbs":2,"fat":1}'), null);
  assert.equal(parseNutritionEstimate('{"name":"עוגייה","calories":900,"protein":1,"carbs":2,"fat":1}'), null);
});

test("photo estimation retries without unsupported reasoning parameters",async()=>{const source=await readFile(new URL("../lib/nutrition/food-estimator.ts",import.meta.url),"utf8");assert.match(source,/openai\/gpt-5-mini/);assert.match(source,/openai\/gpt-5\.4-mini/);assert.doesNotMatch(source,/temperature:/)});

// The estimator is one HTTP call to an external gateway. It fails for reasons
// that belong to the deployment rather than to the client - an expired token, a
// provider outage, an answer past the timeout - and refusing the save on any of
// those threw away the one thing that cannot be reconstructed later: what the
// person actually ate. The row is written either way; without figures it is
// stored unmeasured, which every screen already understands.
test("a failed estimate still records what was eaten, unmeasured", async () => {
  const source = await readFile(new URL("../app/actions/food-log.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /return \{ ok: false, message: "לא הצלחנו לחשב את הערכים כרגע/);
  assert.match(source, /estimateFailed = true/);
  // Nothing plausible is invented in place of the estimate.
  assert.match(source, /calories = null;\s*\n\s*protein = null;\s*\n\s*carbs = null;\s*\n\s*fat = null;/);
  // And the client is told the entry is not counted rather than left to assume.
  assert.match(source, /estimateFailed\s*\n?\s*\?\s*"נרשם/);
});
