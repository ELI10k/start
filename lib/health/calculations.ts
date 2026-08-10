import { ISRAEL_TIME_ZONE } from "../date-time.ts";
import type { DailySteps, HealthPreferences, HealthSource, StepsSummary, StepsTrendPoint } from "./types.ts";

// A step count belongs to the day the client walked it, in the timezone they
// were standing in. Deriving the day from a UTC instant puts an evening walk in
// Israel on the following day for two hours every night, which is exactly when
// people walk.
export function calendarDay(value: Date | string | number = new Date(), timeZone = ISRAEL_TIME_ZONE): string {
  // en-CA renders ISO-shaped YYYY-MM-DD, which sorts and compares as a string.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

export function shiftDay(day: string, deltaDays: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function lastDays(today: string, count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => shiftDay(today, index - (count - 1)));
}

// Two sources reporting the same day are not added together: a phone in a pocket
// and a watch on the wrist saw the same walk. The larger figure wins, because
// the more complete tracker is the one that saw more of the day.
export function stepsByDay(entries: readonly DailySteps[]): ReadonlyMap<string, DailySteps> {
  const best = new Map<string, DailySteps>();
  for (const entry of entries) {
    if (entry.steps < 0) continue;
    const current = best.get(entry.day);
    if (!current || entry.steps > current.steps) best.set(entry.day, entry);
  }
  return best;
}

const DEFAULT_GOAL = 10000;

export function summarizeSteps(entries: readonly DailySteps[], preferences: Partial<HealthPreferences> | undefined, todayValue: string = calendarDay()): StepsSummary {
  const goal = clampGoal(preferences?.dailyStepGoal);
  const byDay = stepsByDay(entries);
  const days = lastDays(todayValue, 7);
  const trend: StepsTrendPoint[] = days.map((day) => {
    const steps = byDay.get(day)?.steps ?? 0;
    return { day, steps, metGoal: steps >= goal };
  });
  const today = byDay.get(todayValue)?.steps ?? 0;

  // The average is over the days that actually reported. Counting a day the
  // phone was off as a zero would report a drop the client did not have.
  const reported = trend.filter((point) => byDay.has(point.day));
  const weeklyAverage = reported.length ? Math.round(reported.reduce((total, point) => total + point.steps, 0) / reported.length) : 0;

  return {
    today,
    goal,
    percentOfGoal: goal > 0 ? Math.min(999, Math.round((today / goal) * 100)) : 0,
    weeklyAverage,
    trend,
    daysMetGoal: trend.filter((point) => point.metGoal).length,
    lastSyncAt: preferences?.lastSyncAt,
    lastSyncSource: preferences?.lastSyncSource,
    hasData: reported.length > 0,
  };
}

export function clampGoal(goal: number | undefined): number {
  if (!Number.isFinite(goal ?? NaN)) return DEFAULT_GOAL;
  return Math.min(50000, Math.max(1000, Math.round(goal as number)));
}

// A sync writes one row per day per source, so re-reading the same window is
// idempotent. This filters what is worth sending: days whose figure has not
// changed do not need a round trip, and a day in the future is a clock error.
export function stepsToPersist(incoming: readonly DailySteps[], known: readonly DailySteps[], today: string): readonly DailySteps[] {
  const existing = new Map(known.map((entry) => [`${entry.day}|${entry.source}`, entry.steps]));
  const seen = new Set<string>();
  const result: DailySteps[] = [];
  for (const entry of incoming) {
    const key = `${entry.day}|${entry.source}`;
    if (entry.day > today) continue;
    if (!Number.isFinite(entry.steps) || entry.steps < 0 || entry.steps > 200000) continue;
    if (existing.get(key) === entry.steps) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export const SOURCE_LABELS: Record<HealthSource | "none", string> = {
  healthkit: "Apple Health",
  "health-connect": "Health Connect",
  manual: "הזנה ידנית",
  test: "מקור בדיקה",
  none: "לא זוהה מקור",
};
