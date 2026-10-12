import assert from "node:assert/strict";
import test from "node:test";
import { displayCalories } from "../lib/nutrition/display.ts";

test("displayed calories are always whole numbers rounded upward", () => {
  assert.equal(displayCalories(275.3), 276);
  assert.equal(displayCalories(275), 275);
  assert.equal(displayCalories("318.75"), 319);
});
