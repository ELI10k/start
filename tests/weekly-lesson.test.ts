import assert from "node:assert/strict";
import test from "node:test";
import { dayIndex, lessonForDay } from "../lib/content/weekly-lesson.ts";

const lesson = (id: string, categoryId: string, sortOrder: number, title = id) => ({
  id, title, description: null, categoryId, categoryName: categoryId, categorySlug: categoryId,
  contentType: "article" as const, estimatedMinutes: null, progressPercent: 0, sortOrder,
});

test("the tip advances once per calendar day, and never goes negative", () => {
  assert.equal(dayIndex("2026-01-04"), 0);
  assert.equal(dayIndex("2026-01-05"), 1);
  assert.equal(dayIndex("2026-01-11"), 7);
  assert.equal(dayIndex("2025-06-01"), 0, "a date before the epoch clamps rather than wrapping");
  assert.equal(dayIndex("not-a-date"), 0);
});

test("lessons run in course order, then in the coach's order inside each course", () => {
  const lessons = [
    lesson("b2", "nutrition", 2),
    lesson("a1", "basics", 1),
    lesson("b1", "nutrition", 1),
    lesson("a2", "basics", 2),
  ];
  const order = ["basics", "nutrition"];
  const seen = ["2026-01-04", "2026-01-05", "2026-01-06", "2026-01-07"]
    .map((day) => lessonForDay(lessons, order, day)?.id);
  assert.deepEqual(seen, ["a1", "a2", "b1", "b2"]);
  // It wraps rather than running out.
  assert.equal(lessonForDay(lessons, order, "2026-01-08")?.id, "a1");
});

test("a lesson whose course is missing from the ordering sorts last, not first", () => {
  const lessons = [lesson("orphan", "gone", 1), lesson("first", "basics", 1)];
  assert.equal(lessonForDay(lessons, ["basics"], "2026-01-04")?.id, "first");
  assert.equal(lessonForDay(lessons, ["basics"], "2026-01-05")?.id, "orphan");
});

test("an empty library returns nothing rather than throwing", () => {
  assert.equal(lessonForDay([], [], "2026-01-04"), null);
});
