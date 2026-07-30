import { ISRAEL_TIME_ZONE } from "../date-time.ts";

export const INITIAL_NAVEL_MIN_CM = 30;
export const INITIAL_NAVEL_MAX_CM = 250;

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

export function parseOptionalInitialNavel(rawValue: FormDataEntryValue | null) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return { ok: true as const, value: null };
  const value = Number(raw);
  if (
    !Number.isFinite(value) ||
    value < INITIAL_NAVEL_MIN_CM ||
    value > INITIAL_NAVEL_MAX_CM
  ) {
    return {
      ok: false as const,
      message: `היקף הטבור חייב להיות בין ${INITIAL_NAVEL_MIN_CM} ל־${INITIAL_NAVEL_MAX_CM} ס״מ.`,
    };
  }
  return { ok: true as const, value };
}
