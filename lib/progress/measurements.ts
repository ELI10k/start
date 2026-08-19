// The one definition lives in lib/date-time.ts, alongside the timezone it uses.
// Re-exported here because the measurement screens have always imported it from
// this module.
export { israelDateKey } from "../date-time.ts";

export const INITIAL_NAVEL_MIN_CM = 30;
export const INITIAL_NAVEL_MAX_CM = 250;

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
