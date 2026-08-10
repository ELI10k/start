import { calendarDay, shiftDay } from "../health/calculations.ts";

// The week a Saturday-evening summary describes: the Sunday that opened it
// through the Saturday it is being written on, in Asia/Jerusalem. Israel's week
// starts on Sunday, and the summary is written before midnight on the last day
// of that week - so "today" belongs to the week being summarised, not the next one.

export type WeekWindow = Readonly<{ start: string; end: string; previousStart: string }>;

export function israelWeek(now: Date | string = new Date()): WeekWindow {
  const today = calendarDay(now);
  // Day of week from the calendar date itself, so the server's timezone cannot
  // shift it: 1970-01-04 was a Sunday, which makes the arithmetic below exact.
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse("1970-01-04T00:00:00Z")) / 86_400_000);
  const start = shiftDay(today, -(((days % 7) + 7) % 7));
  return { start, end: shiftDay(start, 6), previousStart: shiftDay(start, -7) };
}

// Saturday, 20:00 Israel time. The cron fires hourly and this is the gate, so a
// missed hour retries rather than skipping the week.
export function isSummaryHour(now: Date | string = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", hour12: false }).formatToParts(new Date(now));
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "-1");
  return weekday === "Sat" && hour === 20;
}
