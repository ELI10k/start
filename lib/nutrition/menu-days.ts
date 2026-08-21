// Sunday is 0, matching israelWeekday and the day_index the reader picks by.
//
// Lives apart from the editor so the preview, the builder and any test can share
// one list: two copies of the days of the week is exactly the sort of thing that
// drifts by one and serves a client their Tuesday on a Monday.
export const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/** "ברירת מחדל" for day 0, which is what a client is served on any day the menu does not name. */
export const dayLabel = (dayIndex: number) =>
  dayIndex === 0 ? "ברירת מחדל" : `יום ${WEEKDAY_LABELS[dayIndex] ?? dayIndex}`;
