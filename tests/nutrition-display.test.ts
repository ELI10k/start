import assert from "node:assert/strict";
import test from "node:test";
import { displayCalories } from "../lib/nutrition/display.ts";

test("product calories always display as a whole number rounded upward", () => {
  assert.equal(displayCalories(64.6), 65);
  assert.equal(displayCalories(77.5), 78);
  assert.equal(displayCalories(113), 113);
  assert.equal(displayCalories("50.8"), 51);
});
