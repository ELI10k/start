// The whole event vocabulary, in one place. A closed list rather than free-form
// strings: an event nobody planned is an event nobody reads, and a typo produces
// a second series that silently splits the numbers.

export const ANALYTICS_EVENTS = [
  "login",
  "workout_started",
  "workout_completed",
  "meal_marked",
  // "the same as yesterday" - worth counting on its own, because if it is what
  // most clients press then the per-day choice is the wrong default.
  "selections_repeated",
  // "I ate a different amount" - how often a prescribed portion is not the
  // portion, which is a fact about the plans rather than about the clients.
  "portion_adjusted",
  "barcode_scanned",
  "manual_food_added",
  "check_in_submitted",
  "health_synced",
  "notification_opened",
  "error",
  "crash",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsValue = string | number | boolean;
export type AnalyticsProperties = Readonly<Record<string, AnalyticsValue>>;

// What a property is allowed to be. Anything else is dropped rather than
// truncated, because a half-kept value is harder to reason about than an absent one.
const MAX_KEYS = 12;
const MAX_KEY_LENGTH = 40;
const MAX_STRING_LENGTH = 64;

// Values that could carry something about a person rather than about the app.
// Free text is the obvious one; the rest are the shapes that tend to leak.
const SENSITIVE_KEY = /(email|mail|name|phone|token|secret|password|note|comment|text|body|title|address|barcode|weight|calorie|protein|photo|url)/i;
const EMAIL_LIKE = /@/;
const LONG_DIGITS = /\d{7,}/;

export function isSafeValue(value: unknown): value is AnalyticsValue {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  if (value.length > MAX_STRING_LENGTH) return false;
  // A string that looks like an address or an identifier is not a category.
  return !EMAIL_LIKE.test(value) && !LONG_DIGITS.test(value);
}

// Applied to every event before it leaves the device. The rule is that an event
// carries counts, durations, outcomes and short category labels - never content.
export function redactProperties(input: Record<string, unknown> | undefined): AnalyticsProperties {
  if (!input) return {};
  const output: Record<string, AnalyticsValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (Object.keys(output).length >= MAX_KEYS) break;
    if (!key || key.length > MAX_KEY_LENGTH) continue;
    if (SENSITIVE_KEY.test(key)) continue;
    if (!isSafeValue(value)) continue;
    output[key] = value;
  }
  return output;
}

// An error's message can quote whatever the user typed, so only its shape
// travels: where it happened, and a name if the throw had one.
export function describeError(error: unknown, where: string): AnalyticsProperties {
  const name = error instanceof Error && error.name ? error.name : "Error";
  return redactProperties({ where, kind: name.slice(0, MAX_STRING_LENGTH) });
}

export const isAnalyticsEvent = (value: string): value is AnalyticsEvent =>
  (ANALYTICS_EVENTS as readonly string[]).includes(value);
