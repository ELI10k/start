import { calendarDay, lastDays } from "./calculations.ts";
import { sleepNightsFromSamples } from "./sleep-nights.ts";
import { normalizeSourceDetails, normalizeSourceDevice } from "./sources.ts";
import type { DailySleep, DailySteps, HealthAvailability, HealthErrorKind, HealthPermissionState, HealthProvider, HealthSource, SleepSample } from "./types.ts";

/**
 * A failure that is not "no data". Carries a category for analytics and a
 * sentence for the client; the native message stays out of both, because it can
 * name a device or a person's health type.
 */
export class HealthSyncError extends Error {
  readonly kind: HealthErrorKind;
  constructor(kind: HealthErrorKind, options?: { cause?: unknown }) {
    super(kind, options);
    this.name = "HealthSyncError";
    this.kind = kind;
  }
}

export const healthErrorKind = (error: unknown, fallback: HealthErrorKind): HealthErrorKind =>
  error instanceof HealthSyncError ? error.kind : fallback;

// Three providers, one contract.
//
//   - unavailableProvider: what a browser gets. There is no health store to ask,
//     so the screen says so instead of showing an empty chart that looks broken.
//   - testProvider: deterministic days, for tests and for exercising the UI.
//   - nativeProvider: reads whatever the Capacitor bridge exposes on
//     window.StartHealth. It is written against a named contract so the native
//     side can be built to it, and it reports "unavailable" until it exists.

export const unavailableProvider: HealthProvider = {
  source: "none",
  isAvailable: async () => false,
  getPermission: async () => "unavailable",
  requestPermission: async () => "unavailable",
  readDailySteps: async () => [],
  readDailySleep: async () => [],
};

export function createTestProvider(steps: readonly number[], source: HealthSource = "test", permission: HealthPermissionState = "granted"): HealthProvider {
  let current = permission;
  return {
    source,
    isAvailable: async () => true,
    getPermission: async () => current,
    requestPermission: async () => {
      current = current === "prompt" ? "granted" : current;
      return current;
    },
    readDailySteps: async (fromDay, toDay) => {
      if (current !== "granted") return [];
      const days: DailySteps[] = [];
      for (let day = fromDay, index = 0; day <= toDay; day = shift(day), index += 1) {
        days.push({ day, steps: steps[index % Math.max(1, steps.length)] ?? 0, source, recordedAt: `${day}T20:00:00.000Z` });
      }
      return days;
    },
    readDailySleep: async (fromDay, toDay) => {
      if (current !== "granted") return [];
      const days: DailySleep[] = [];
      for (let day = fromDay; day <= toDay; day = shift(day)) {
        days.push({ day, minutes: 450, source, recordedAt: `${day}T08:00:00.000Z` });
      }
      return days;
    },
  };
}

const shift = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

// The contract the native shell has to satisfy. HealthKit and Health Connect
// differ in almost every detail except this shape, so the bridge normalises to
// calendar days in the device's own timezone and hands them over.
//
// `sources` on a step day and readSleepSamples are newer than the first
// TestFlight builds. An installed binary without them still works: steps arrive
// without a named writer ("Apple Health"), and sleep falls back to the nightly
// totals the old plugin computed.
export type NativeHealthBridge = Readonly<{
  source: HealthSource;
  isAvailable: () => Promise<boolean> | boolean;
  getPermission: () => Promise<HealthPermissionState> | HealthPermissionState;
  requestPermission: () => Promise<HealthPermissionState> | HealthPermissionState;
  readDailySteps: (fromDay: string, toDay: string) => Promise<readonly { day: string; steps: number; sources?: readonly unknown[] }[]>;
  readDailySleep: (fromDay: string, toDay: string) => Promise<readonly { day: string; minutes: number }[]>;
  readSleepSamples?: (fromDay: string, toDay: string) => Promise<readonly unknown[] | null>;
  openSettings?: () => Promise<boolean>;
}>;

declare global {
  interface Window { StartHealth?: NativeHealthBridge }
}

const STAGES = new Set(["asleep", "core", "deep", "rem"]);

function normalizeSleepSamples(rows: readonly unknown[]): SleepSample[] {
  const samples: SleepSample[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const { start, end, stage, source } = row as Record<string, unknown>;
    if (typeof start !== "string" || typeof end !== "string" || typeof stage !== "string" || !STAGES.has(stage)) continue;
    samples.push({ start, end, stage: stage as SleepSample["stage"], device: normalizeSourceDevice(source) });
  }
  return samples;
}

export function nativeProvider(bridge: NativeHealthBridge): HealthProvider {
  return {
    source: bridge.source,
    isAvailable: async () => {
      try { return Boolean(await bridge.isAvailable()); } catch (cause) { throw new HealthSyncError("bridge-unavailable", { cause }); }
    },
    // A permission check that throws is not "unavailable" - that word is kept
    // for a device with no health store, and it used to disable the card for
    // good. It is a failed check, and the client can try again.
    getPermission: async () => {
      try { return await bridge.getPermission(); } catch (cause) { throw new HealthSyncError("permission-check-failed", { cause }); }
    },
    requestPermission: async () => {
      try { return await bridge.requestPermission(); } catch (cause) { throw new HealthSyncError("permission-check-failed", { cause }); }
    },
    // A bridge that throws mid-read is a failed sync, not a zero-step day. It
    // used to come back as an empty array, and the screen showed "no data".
    readDailySteps: async (fromDay, toDay) => {
      let rows: Awaited<ReturnType<NativeHealthBridge["readDailySteps"]>>;
      try { rows = await bridge.readDailySteps(fromDay, toDay); } catch (cause) { throw new HealthSyncError("read-failed", { cause }); }
      const recordedAt = new Date().toISOString();
      return (Array.isArray(rows) ? rows : [])
        .filter((row) => typeof row?.day === "string" && Number.isFinite(row?.steps))
        .map((row) => ({
          day: row.day,
          steps: Math.max(0, Math.round(row.steps)),
          source: bridge.source,
          recordedAt,
          details: normalizeSourceDetails(row.sources),
        }));
    },
    readDailySleep: async (fromDay, toDay) => {
      const recordedAt = new Date().toISOString();
      if (bridge.readSleepSamples) {
        let samples: readonly unknown[] | null = null;
        try { samples = await bridge.readSleepSamples(fromDay, toDay); } catch (cause) { throw new HealthSyncError("read-failed", { cause }); }
        // null means this binary predates the method; anything else is the answer.
        if (samples) return sleepNightsFromSamples(normalizeSleepSamples(samples), { fromDay, toDay }, bridge.source as HealthSource, recordedAt);
      }
      let rows: Awaited<ReturnType<NativeHealthBridge["readDailySleep"]>>;
      try { rows = await bridge.readDailySleep(fromDay, toDay); } catch (cause) { throw new HealthSyncError("read-failed", { cause }); }
      return (Array.isArray(rows) ? rows : [])
        .filter((row) => typeof row?.day === "string" && Number.isFinite(row?.minutes))
        .map((row) => ({ day: row.day, minutes: Math.max(0, Math.round(row.minutes)), source: bridge.source, recordedAt }));
    },
  };
}

export function resolveHealthProvider(): HealthProvider {
  if (typeof window === "undefined" || !window.StartHealth) return unavailableProvider;
  return nativeProvider(window.StartHealth);
}

const REASONS: Record<HealthPermissionState, string> = {
  unknown: "",
  unavailable: "המכשיר הזה לא חשוף ל-Apple Health או ל-Health Connect. באפליקציה באייפון הנתונים יופיעו אוטומטית.",
  prompt: "כדי להציג צעדים צריך לאשר גישה לנתוני הבריאות במכשיר.",
  granted: "",
  denied: "הגישה לנתוני הבריאות נדחתה. אפשר לאשר אותה מחדש בהגדרות המכשיר.",
};

export function describeAvailability(source: HealthSource | "none", permission: HealthPermissionState): HealthAvailability {
  return { source, permission, reason: REASONS[permission] };
}

// The window a sync asks for. Seven days is what the screen shows; asking for
// more would write history nobody reads.
export function syncWindow(today: string = calendarDay()): Readonly<{ fromDay: string; toDay: string }> {
  const days = lastDays(today, 7);
  return { fromDay: days[0], toDay: days[days.length - 1] };
}
