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
 * The day a date falls on, counted from a fixed point.
 *
 * Keeping this date-based rather than request-based makes the tip stable for
 * the whole day: refreshing the dashboard does not unexpectedly swap it, while
 * the next calendar day advances every client to the next published item.
 */
const EPOCH = Date.UTC(2026, 0, 4);
export function dayIndex(dateKey: string): number {
  const at = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.floor((at - EPOCH) / 86400000));
}

/**
 * Today's tip: the library in course order, advanced by one every day.
 *
 * Ordered the way the library itself is - by course, then by the coach's order
 * inside it - so a client following along day by day reads the syllabus in the
 * sequence it was written, rather than whatever the newest upload happens to be.
 * It wraps at the end instead of running out.
 */
export function lessonForDay(
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
  return ordered[dayIndex(dateKey) % ordered.length];
}
