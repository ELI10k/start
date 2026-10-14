import { registerPlugin } from "@capacitor/core";
import type { HealthPermissionState } from "@/lib/health/types";

// The one custom plugin LIFE FIT needs. Apple HealthKit and Android Health Connect
// have almost nothing in common at the API level, so the contract is written in
// terms of what the app actually wants: whether steps are readable, whether the
// user has agreed, and a range of calendar days.
//
// Days are the device's own calendar days. Handing back instants and converting
// here would reintroduce the timezone bug the steps layer exists to avoid.
export type StartHealthPlugin = {
  isAvailable(): Promise<{ available: boolean }>;
  getPermission(): Promise<{ status: HealthPermissionState }>;
  requestPermission(): Promise<{ status: HealthPermissionState }>;
  /** `sources`: every writer HealthKit says contributed to the day (HKSourceRevision + HKDevice). The figure is still the merged aggregate. */
  readDailySteps(options: { fromDay: string; toDay: string }): Promise<{ days: { day: string; steps: number; sources?: NativeHealthSource[] }[] }>;
  readDailySleep(options: { fromDay: string; toDay: string }): Promise<{ days: { day: string; minutes: number }[] }>;
  /** Raw asleep intervals with their writer; nights are assembled in lib/health/sleep-nights.ts. */
  readSleepSamples(options: { fromDay: string; toDay: string }): Promise<{ samples: { start: string; end: string; stage: "asleep" | "core" | "deep" | "rem"; source: NativeHealthSource }[] }>;
  /** Opens the Health app (where read access is managed), or the app's own settings. */
  openSettings(): Promise<{ opened: boolean }>;
};

export type NativeHealthSource = {
  sourceName?: string;
  sourceBundleIdentifier?: string;
  productType?: string;
  deviceName?: string;
  manufacturer?: string;
  model?: string;
  hardwareVersion?: string;
};

// Resolves to the native implementation on a device, and to a stub that reports
// "unavailable" everywhere else - which is exactly what the browser should see.
export const StartHealth = registerPlugin<StartHealthPlugin>("StartHealth", {
  web: async () => ({
    isAvailable: async () => ({ available: false }),
    getPermission: async () => ({ status: "unavailable" as const }),
    requestPermission: async () => ({ status: "unavailable" as const }),
    readDailySteps: async () => ({ days: [] }),
    readDailySleep: async () => ({ days: [] }),
    readSleepSamples: async () => ({ samples: [] }),
    openSettings: async () => ({ opened: false }),
  }),
});
