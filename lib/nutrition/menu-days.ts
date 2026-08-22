// Sunday is 0, matching israelWeekday and the day_index the reader picks by.
//
// Lives apart from the editor so the preview, the builder and any test can share
// one list: two copies of the days of the week is exactly the sort of thing that
// drifts by one and serves a client their Tuesday on a Monday.
export const WEEKDAY_LABELS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

/**
 * Every day is named after the day it is. Sunday included.
 *
 * Day 0 used to be labelled "ברירת מחדל", which is not a day of the week - so a
 * coach looking for ראשון found שני through שבת and concluded the app had no
 * Sunday. Being the fallback is not a different kind of day, it is what happens
 * to whichever day is lowest: getActiveClientMenu serves the exact weekday when
 * the coach wrote one and the lowest day present otherwise, so a menu with only
 * Sunday in it is served every day of the week, and a menu that gains Tuesday
 * keeps serving Sunday's on the other six. That rule is stated where the days
 * are added rather than smuggled into the name of one of them.
 */
export const dayLabel = (dayIndex: number) => `יום ${WEEKDAY_LABELS[dayIndex] ?? dayIndex}`;
