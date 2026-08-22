import assert from "node:assert/strict";
import test from "node:test";
import { lessonForWeek, weekIndex } from "../lib/content/weekly-lesson.ts";

const lesson = (id: string, categoryId: string, sortOrder: number, title = id) => ({
  id, title, description: null, categoryId, categoryName: categoryId, categorySlug: categoryId,
  contentType: "article" as const, estimatedMinutes: null, progressPercent: 0, sortOrder,
});

test("the week advances by one on each Sunday, and never goes negative", () => {
  // 2026-01-04 is the epoch Sunday.
  assert.equal(weekIndex("2026-01-04"), 0);
  assert.equal(weekIndex("2026-01-10"), 0, "Saturday is still week zero");
  assert.equal(weekIndex("2026-01-11"), 1, "the next Sunday opens week one");
  assert.equal(weekIndex("2025-06-01"), 0, "a date before the epoch clamps rather than wrapping");
  assert.equal(weekIndex("not-a-date"), 0);
});

test("lessons run in course order, then in the coach's order inside each course", () => {
  const lessons = [
    lesson("b2", "nutrition", 2),
    lesson("a1", "basics", 1),
    lesson("b1", "nutrition", 1),
    lesson("a2", "basics", 2),
  ];
  const order = ["basics", "nutrition"];
  const seen = ["2026-01-04", "2026-01-11", "2026-01-18", "2026-01-25"]
    .map((day) => lessonForWeek(lessons, order, day)?.id);
  assert.deepEqual(seen, ["a1", "a2", "b1", "b2"]);
  // It wraps rather than running out.
  assert.equal(lessonForWeek(lessons, order, "2026-02-01")?.id, "a1");
});

test("a lesson whose course is missing from the ordering sorts last, not first", () => {
  const lessons = [lesson("orphan", "gone", 1), lesson("first", "basics", 1)];
  assert.equal(lessonForWeek(lessons, ["basics"], "2026-01-04")?.id, "first");
  assert.equal(lessonForWeek(lessons, ["basics"], "2026-01-11")?.id, "orphan");
});

test("an empty library returns nothing rather than throwing", () => {
  assert.equal(lessonForWeek([], [], "2026-01-04"), null);
});
