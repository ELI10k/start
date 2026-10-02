import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeEquipment, canonicalizeMuscle, categorizeExercise } from "../scripts/lib/exercise-taxonomy.mjs";

test("exercise taxonomy keeps broad categories separate from precise equipment", () => {
  assert.equal(categorizeExercise({ id: "free-weight", name: "לחיצת חזה", category: "משקולות ומכונות", equipment: "משקולות יד" }), "משקולות");
  assert.equal(categorizeExercise({ id: "cable", name: "חתירה", category: "משקולות ומכונות", equipment: "כבל" }), "מכונות");
  assert.equal(categorizeExercise({ id: "bodyweight", name: "פלאנק", category: "ליבה", equipment: "משקל גוף" }), "משקל גוף");
  assert.equal(categorizeExercise({ id: "suspension", name: "חתירה ברצועות תלייה", category: "כוח", equipment: "רצועות תלייה" }), "TRX");
});

test("exercise taxonomy normalizes legacy equipment and muscle labels", () => {
  assert.equal(canonicalizeEquipment({ id: "cable", name: "חתירה", equipment: "פולי" }), "כבל פולי");
  assert.equal(canonicalizeEquipment({ id: "exercise-yt2erg", name: "קיק בק במשקולת בודדת" }), "משקולות יד");
  assert.equal(canonicalizeMuscle("ליבה"), "שרירי ליבה");
});
