// Sunday is 0, matching israelWeekday and the day_index the reader picks by.
//
// Lives apart from the editor so the preview, the builder and any test can share
// one list: two copies of the days of the week is exactly the sort of thing that
// drifts by one and serves a client their Tuesday on a Monday.
export const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/**
 * Day 0 is Sunday and it is also the fallback, and the label has to say both.
 *
 * It read "ברירת מחדל" alone, and the chip row that offers days to add skips it
 * because it always exists - so a coach looking for ראשון found שני through שבת
 * and concluded Sunday was missing. It was never missing: israelWeekday returns
 * 0 on a Sunday and the reader serves day 0, so the default day IS the Sunday
 * menu, and is also what gets served on any day the coach did not write.
 */
export const dayLabel = (dayIndex: number) =>
  dayIndex === 0 ? "יום ראשון · ברירת מחדל" : `יום ${WEEKDAY_LABELS[dayIndex] ?? dayIndex}`;
