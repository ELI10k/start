export const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

export function formatIsraelDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat("he-IL", {
    ...options,
    timeZone: ISRAEL_TIME_ZONE,
  }).format(new Date(value));
}

export function formatIsraelDateTime(value: string | number | Date) {
  return formatIsraelDate(value, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatIsraelTime(value: string | number | Date) {
  return formatIsraelDate(value, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// The calendar day as Israel reckons it. Every "today" in the product has to go
// through here: `new Date().toISOString().slice(0,10)` is the UTC day, and in
// summer Israel runs three hours ahead of it, so between midnight and 03:00 the
// UTC day is still yesterday - the client opened the nutrition screen at 01:00
// and saw yesterday's meals, already marked.
export function israelDateKey(value: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Sunday is 0, matching getUTCDay, but resolved in Israel time so a menu built
// for "Saturday" is served on Saturday in Israel and not from 03:00 onwards.
export function israelWeekday(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
}

// The hour of the day in Israel, 0-23. Anything that asks "is it late enough
// that an unanswered day is going to stay unanswered?" needs the clock the
// client is living by, not the server's.
export function israelHour(value: Date = new Date()) {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(value));
}

// How many whole days have passed since a timestamp. Lives here rather than
// inline in a screen because reading the clock is not something a component may
// do during render - and because "is this late?" is the same question wherever
// it is asked.
export function daysSince(value: string | number | Date, now: Date = new Date()) {
  return Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000);
}
