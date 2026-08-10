import { calendarDay, lastDays } from "./calculations.ts";
import type { DailySteps, HealthAvailability, HealthPermissionState, HealthProvider, HealthSource } from "./types.ts";

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
export type NativeHealthBridge = Readonly<{
  source: HealthSource;
  isAvailable: () => Promise<boolean> | boolean;
  getPermission: () => Promise<HealthPermissionState> | HealthPermissionState;
  requestPermission: () => Promise<HealthPermissionState> | HealthPermissionState;
  readDailySteps: (fromDay: string, toDay: string) => Promise<readonly { day: string; steps: number }[]>;
}>;

declare global {
  interface Window { StartHealth?: NativeHealthBridge }
}

export function nativeProvider(bridge: NativeHealthBridge): HealthProvider {
  return {
    source: bridge.source,
    isAvailable: async () => {
      try { return Boolean(await bridge.isAvailable()); } catch { return false; }
    },
    getPermission: async () => {
      try { return await bridge.getPermission(); } catch { return "unavailable"; }
    },
    requestPermission: async () => {
      try { return await bridge.requestPermission(); } catch { return "denied"; }
    },
    readDailySteps: async (fromDay, toDay) => {
      try {
        const rows = await bridge.readDailySteps(fromDay, toDay);
        const recordedAt = new Date().toISOString();
        return rows
          .filter((row) => typeof row?.day === "string" && Number.isFinite(row?.steps))
          .map((row) => ({ day: row.day, steps: Math.max(0, Math.round(row.steps)), source: bridge.source, recordedAt }));
      } catch {
        // A bridge that throws mid-read is a failed sync, not a zero-step day.
        return [];
      }
    },
  };
}

export function resolveHealthProvider(): HealthProvider {
  if (typeof window === "undefined" || !window.StartHealth) return unavailableProvider;
  return nativeProvider(window.StartHealth);
}

const REASONS: Record<HealthPermissionState, string> = {
  unknown: "",
  unavailable: "המכשיר הזה לא חשוף ל-Apple Health או ל-Health Connect. באפליקציה במכשיר הצעדים יופיעו אוטומטית.",
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
