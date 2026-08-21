import { strict as assert } from "node:assert";
import test from "node:test";
import { buildGuidanceView, isRenderableImageUrl, normalizeGuidance, validateGuidance, youtubeThumbnailUrl } from "../lib/workouts/exercise-guidance.ts";
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
  assert.deepEqual([...view.missing], ["how-to", "cues", "mistakes", "muscles", "assisting-muscles", "equipment"]);
});

test("source execution notes stand in for how-to until the coach writes one", () => {
  const fromSource = buildGuidanceView(exercise({ executionNotes: "ירידה מבוקרת עד החזה" }));
  assert.equal(fromSource.sections.find((section) => section.key === "how-to")?.text, "ירידה מבוקרת עד החזה");
  const coachWritten = buildGuidanceView(exercise({ executionNotes: "מהמקור", howTo: "מהמאמן" }));
  assert.equal(coachWritten.sections.find((section) => section.key === "how-to")?.text, "מהמאמן");
});

test("primary and assisting muscles are shown separately without duplicates", () => {
  const view = buildGuidanceView(exercise({ primaryMuscleGroup: "חזה", secondaryMuscleGroups: ["יד אחורית", "חזה"] }));
  assert.deepEqual([...(view.sections.find((section) => section.key === "muscles")?.items ?? [])], ["חזה"]);
  assert.deepEqual([...(view.sections.find((section) => section.key === "assisting-muscles")?.items ?? [])], ["יד אחורית"]);
  assert.ok(!view.missing.includes("muscles"));
  assert.ok(!view.missing.includes("assisting-muscles"));
});

test("the approved YouTube demonstration supplies a real exercise image fallback", () => {
  // hqdefault, not maxresdefault: YouTube only generates the latter for videos
  // uploaded at HD, so most of this catalogue 404ed on first request and swapped
  // to hqdefault after - two requests and a visible flicker per exercise card.
  assert.equal(youtubeThumbnailUrl("https://www.youtube.com/watch?v=abcDEF_1234"), "https://i.ytimg.com/vi/abcDEF_1234/hqdefault.jpg");
  assert.equal(youtubeThumbnailUrl("https://youtu.be/abcDEF_1234"), "https://i.ytimg.com/vi/abcDEF_1234/hqdefault.jpg");
  assert.equal(youtubeThumbnailUrl("https://evil.example/watch?v=abcDEF_1234"), undefined);
  const view = buildGuidanceView(exercise({ video: { provider: "youtube", url: "https://youtu.be/abcDEF_1234" } }));
  assert.equal(view.imageUrl, "https://i.ytimg.com/vi/abcDEF_1234/hqdefault.jpg");
});

test("known compound movements receive conservative assisting-muscle labels", () => {
  const chest = buildGuidanceView(exercise({
    name: "לחיצת חזה במשקולות בודדות",
    normalizedName: "לחיצת חזה במשקולות בודדות",
    primaryMuscleGroup: "חזה",
    secondaryMuscleGroups: [],
  }));
  assert.deepEqual(chest.sections.find((section) => section.key === "assisting-muscles")?.items, ["יד אחורית", "כתף קדמית"]);

  const row = buildGuidanceView(exercise({
    name: "חתירה בפולי תחתון",
    normalizedName: "חתירה בפולי תחתון",
    primaryMuscleGroup: "גב",
    secondaryMuscleGroups: [],
  }));
  assert.deepEqual(row.sections.find((section) => section.key === "assisting-muscles")?.items, ["יד קדמית", "כתף אחורית"]);
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
