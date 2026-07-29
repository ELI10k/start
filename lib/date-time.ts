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
