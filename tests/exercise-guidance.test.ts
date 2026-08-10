import { strict as assert } from "node:assert";
import test from "node:test";
import { buildGuidanceView, isRenderableImageUrl, normalizeGuidance, validateGuidance } from "../lib/workouts/exercise-guidance.ts";
import type { Exercise } from "../lib/workouts/types.ts";

const exercise = (patch: Partial<Exercise> = {}): Exercise => ({
  id: "exercise-1",
  name: "לחיצת חזה במוט",
  normalizedName: "לחיצת חזה במוט",
  aliases: [],
  secondaryMuscleGroups: [],
  cues: [],
  commonMistakes: [],
  sourceWorkbooks: [],
  sourceReferences: [],
  status: "active",
  ...patch,
});

test("an exercise with no guidance produces no invented sections", () => {
  const view = buildGuidanceView(exercise());
  assert.equal(view.hasAnyContent, false);
  assert.equal(view.sections.length, 0);
  assert.deepEqual([...view.missing], ["how-to", "cues", "mistakes", "muscles", "equipment"]);
});

test("source execution notes stand in for how-to until the coach writes one", () => {
  const fromSource = buildGuidanceView(exercise({ executionNotes: "ירידה מבוקרת עד החזה" }));
  assert.equal(fromSource.sections.find((section) => section.key === "how-to")?.text, "ירידה מבוקרת עד החזה");
  const coachWritten = buildGuidanceView(exercise({ executionNotes: "מהמקור", howTo: "מהמאמן" }));
  assert.equal(coachWritten.sections.find((section) => section.key === "how-to")?.text, "מהמאמן");
});

test("muscles merge the primary and secondary groups without duplicates", () => {
  const view = buildGuidanceView(exercise({ primaryMuscleGroup: "חזה", secondaryMuscleGroups: ["יד אחורית", "חזה"] }));
  assert.deepEqual([...(view.sections.find((section) => section.key === "muscles")?.items ?? [])], ["חזה", "יד אחורית"]);
  assert.ok(!view.missing.includes("muscles"));
});

test("only https images are rendered", () => {
  assert.equal(isRenderableImageUrl("https://cdn.example.com/press.jpg"), true);
  assert.equal(isRenderableImageUrl("http://cdn.example.com/press.jpg"), false);
  assert.equal(isRenderableImageUrl("javascript:alert(1)"), false);
  assert.equal(isRenderableImageUrl("/local/press.jpg"), false);
  assert.equal(isRenderableImageUrl(undefined), false);
  assert.equal(buildGuidanceView(exercise({ imageUrl: "http://cdn.example.com/x.jpg" })).imageUrl, undefined);
});

test("normalization trims, drops blanks and de-duplicates", () => {
  const guidance = normalizeGuidance({ cues: ["  גב ניטרלי  ", "גב ניטרלי", "   ", "מרפקים 45°"], commonMistakes: [], howTo: "   " });
  assert.deepEqual([...guidance.cues], ["גב ניטרלי", "מרפקים 45°"]);
  assert.equal(guidance.howTo, undefined);
});

test("more than six cues is refused rather than silently truncated", () => {
  const tooMany = validateGuidance({ cues: ["1", "2", "3", "4", "5", "6", "7"], commonMistakes: [] });
  assert.equal(tooMany.valid, false);
  const fine = validateGuidance({ cues: ["1", "2"], commonMistakes: ["3"] });
  assert.equal(fine.valid, true);
});

test("a non-https image is reported to the coach instead of being dropped quietly", () => {
  const result = validateGuidance({ imageUrl: "http://example.com/a.jpg", cues: [], commonMistakes: [] });
  assert.equal(result.valid, false);
  assert.match(result.message ?? "", /https/);
});
