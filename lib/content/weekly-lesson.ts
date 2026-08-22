export type LessonSource = Readonly<{
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  contentType: "article" | "video";
  estimatedMinutes: number | null;
  progressPercent: number;
  sortOrder: number;
}>;

/**
 * The Sunday-to-Saturday week a date falls in, counted from a fixed point.
 *
 * Fixed rather than per-client on purpose: the whole roster is on the same
 * lesson in the same week, so "did you watch this week's one" is a question a
 * coach can ask a group. A client who joins in week forty starts at whatever the
 * roster is on, and reads the rest through the library at their own pace.
 *
 * The epoch is a Sunday, so week boundaries land where the app's week does.
 */
const EPOCH = Date.UTC(2026, 0, 4); // Sunday, 4 January 2026.
export function weekIndex(dateKey: string): number {
  const at = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.floor((at - EPOCH) / (7 * 86400000)));
}

/**
 * This week's lesson: the library in course order, advanced by one a week.
 *
 * Ordered the way the library itself is - by course, then by the coach's order
 * inside it - so a client following along week by week reads the syllabus in the
 * sequence it was written, rather than whatever the newest upload happens to be.
 * It wraps at the end instead of running out.
 */
export function lessonForWeek(
  lessons: readonly LessonSource[],
  categoryOrder: readonly string[],
  dateKey: string,
): LessonSource | null {
  if (!lessons.length) return null;
  const rank = (categoryId: string) => {
    const found = categoryOrder.indexOf(categoryId);
    // A lesson whose course is missing from the ordering sorts last rather than
    // first: -1 would have quietly promoted it above every real course.
    return found === -1 ? categoryOrder.length : found;
  };
  const ordered = [...lessons].sort((a, b) =>
    rank(a.categoryId) - rank(b.categoryId)
    || a.sortOrder - b.sortOrder
    || a.title.localeCompare(b.title, "he"));
  return ordered[weekIndex(dateKey) % ordered.length];
}
