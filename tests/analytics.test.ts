import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ANALYTICS_EVENTS, describeError, isAnalyticsEvent, isSafeValue, redactProperties } from "../lib/analytics/events.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the event vocabulary is closed, and covers what the night asked for", () => {
  for (const event of ["login", "workout_started", "workout_completed", "meal_marked", "barcode_scanned", "manual_food_added", "check_in_submitted", "health_synced", "notification_opened", "error", "crash"]) {
    assert.ok(isAnalyticsEvent(event), `${event} is missing`);
  }
  assert.equal(isAnalyticsEvent("whatever_i_felt_like"), false);
  assert.equal(new Set(ANALYTICS_EVENTS).size, ANALYTICS_EVENTS.length);
});

test("a property that could carry a person is dropped, not truncated", () => {
  const redacted = redactProperties({
    email: "eli@example.com",
    clientName: "אלי",
    note: "הרגשתי חלש היום",
    barcode: "7290000066318",
    weightKg: 81.4,
    calories: 2100,
    photoUrl: "https://example.com/a.jpg",
    // What is allowed: counts, flags and short labels.
    sets: 12,
    completed: true,
    source: "healthkit",
  });
  assert.deepEqual(redacted, { sets: 12, completed: true, source: "healthkit" });
});

test("a value that looks like an address or an identifier is refused", () => {
  assert.equal(isSafeValue("healthkit"), true);
  assert.equal(isSafeValue(42), true);
  assert.equal(isSafeValue(false), true);
  assert.equal(isSafeValue("eli@example.com"), false);
  assert.equal(isSafeValue("7290000066318"), false);
  assert.equal(isSafeValue("x".repeat(65)), false);
  assert.equal(isSafeValue(Number.NaN), false);
  assert.equal(isSafeValue({ nested: true }), false);
  assert.equal(isSafeValue(null), false);
});

test("an event cannot grow unbounded", () => {
  const wide = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`k${index}`, index]));
  assert.equal(Object.keys(redactProperties(wide)).length, 12);
  assert.deepEqual(redactProperties(undefined), {});
});

test("an error contributes its shape, never its message", () => {
  const described = describeError(new TypeError("failed to parse eli@example.com"), "barcode-lookup");
  assert.deepEqual(described, { where: "barcode-lookup", kind: "TypeError" });
  // A thrown string has no name to report, and still must not leak.
  assert.deepEqual(describeError("boom eli@example.com", "somewhere"), { where: "somewhere", kind: "Error" });
});

test("nothing reads the event log back", async () => {
  const migration = await source("supabase/migrations/202608110005_analytics_events.sql");
  assert.match(migration, /for insert to authenticated\s+with check \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.match(migration, /grant insert on table public\.analytics_events to authenticated/);
  // No select policy and no select grant: a read would be surface with no purpose.
  assert.doesNotMatch(migration, /for select/);
  assert.doesNotMatch(migration, /grant select/);
});

test("measurement never becomes the reason something breaks", async () => {
  const client = await source("lib/analytics/client.ts");
  // Nothing a screen calls is awaited, and a failed send is swallowed.
  assert.match(client, /export const track = \(event: AnalyticsEvent, properties\?: Record<string, unknown>\) => analytics\.track\(event, properties\)/);
  assert.match(client, /if \(buffer\.length >= MAX_BUFFER\) buffer\.shift\(\)/);
  // Offline keeps the event; a rejected insert is dropped rather than retried forever.
  assert.match(client, /if \(isOfflineError\(error\)\) return;\s*buffer\.shift\(\)/);
});

test("the events are wired where they actually happen", async () => {
  const files = {
    "components/workouts/client/WorkoutSession.tsx": [/track\("workout_started"/, /track\("workout_completed"/],
    "components/client/MealStatusControl.tsx": [/event="meal_marked"/],
    "components/client/BarcodeScanner.tsx": [/track\("barcode_scanned"/, /event="manual_food_added"/],
    "components/client/PersistedCheckInForm.tsx": [/event="check_in_submitted"/],
    "components/client/StepsCard.tsx": [/track\("health_synced"/],
    "components/client/PushRegistration.tsx": [/track\("notification_opened"/],
    "components/auth/LoginForm.tsx": [/track\("login"/],
    "app/error.tsx": [/track\("error"/],
    "components/client/AnalyticsProvider.tsx": [/track\("crash"/],
  };
  for (const [path, patterns] of Object.entries(files)) {
    const text = await source(path);
    for (const pattern of patterns) assert.match(text, pattern, `${path} is missing ${pattern}`);
  }
});
