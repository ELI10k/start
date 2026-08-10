import { registerPlugin } from "@capacitor/core";
import type { HealthPermissionState } from "@/lib/health/types";

// The one custom plugin START needs. Apple HealthKit and Android Health Connect
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
  readDailySteps(options: { fromDay: string; toDay: string }): Promise<{ days: { day: string; steps: number }[] }>;
};

// Resolves to the native implementation on a device, and to a stub that reports
// "unavailable" everywhere else - which is exactly what the browser should see.
export const StartHealth = registerPlugin<StartHealthPlugin>("StartHealth", {
  web: async () => ({
    isAvailable: async () => ({ available: false }),
    getPermission: async () => ({ status: "unavailable" as const }),
    requestPermission: async () => ({ status: "unavailable" as const }),
    readDailySteps: async () => ({ days: [] }),
  }),
});
