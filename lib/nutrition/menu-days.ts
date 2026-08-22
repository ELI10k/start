// Sunday is 0, matching israelWeekday and the day_index the reader picks by.
//
// Lives apart from the editor so the preview, the builder and any test can share
// one list: two copies of the days of the week is exactly the sort of thing that
// drifts by one and serves a client their Tuesday on a Monday.
export const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/**
 * The base day is called what it does: it is served all week.
 *
 * It was "ברירת מחדל", which is not a day, and then "יום ראשון", which is only
 * a seventh of the truth - a menu holding just this day is served every day of
 * the week, not on Sundays. getActiveClientMenu serves the exact weekday where
 * the coach wrote one and falls back to the lowest day present otherwise, so
 * day 0 is the whole week until another day is added and the six that are still
 * unwritten afterwards.
 *
 * The collision this leaves is real and is not fixable with a word: day 0 is
 * also the index israelWeekday returns on a Sunday, so a coach cannot give
 * Sunday something different from the rest of the week without a schema change.
 * Naming it for the job it actually does beats naming it for the job it cannot.
 */
export const dayLabel = (dayIndex: number) =>
  dayIndex === 0 ? "כל השבוע" : `יום ${WEEKDAY_LABELS[dayIndex] ?? dayIndex}`;
