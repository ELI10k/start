"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics/client";
import { createHealthRepository } from "@/lib/health/repository";
import { createHealthController, emptyHealthSnapshot, type HealthController, type HealthControllerState } from "@/lib/health/sync-controller";

// The one controller every health card on the page shares. Created on first
// use in the browser, so a server render never touches window or Supabase.
let controller: HealthController | undefined;

type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string };

export function healthController(): HealthController {
  if (controller) return controller;
  const capacitor = () => (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  controller = createHealthController({
    env: {
      isNative: () => Boolean(capacitor()?.isNativePlatform?.()),
      platform: () => {
        const platform = (window as { StartNative?: { platform?: string } }).StartNative?.platform ?? capacitor()?.getPlatform?.();
        return platform === "ios" || platform === "android" ? platform : "web";
      },
      getBridge: () => window.StartHealth,
      addEventListener: (type, listener) => window.addEventListener(type, listener),
      removeEventListener: (type, listener) => window.removeEventListener(type, listener),
      setTimeout: (callback, ms) => window.setTimeout(callback, ms),
      clearTimeout: (handle) => window.clearTimeout(handle as number),
      now: () => Date.now(),
      storage: {
        get: (key) => window.localStorage.getItem(key),
        set: (key, value) => window.localStorage.setItem(key, value),
      },
    },
    repository: createHealthRepository(),
    track: (event, properties) => track(event, properties),
  });
  return controller;
}

const serverState: HealthControllerState = {
  bridge: "pending",
  platform: "web",
  permission: "unknown",
  syncing: false,
  loaded: false,
  snapshot: emptyHealthSnapshot,
  errors: {},
  lastSyncedAt: {},
  liveDetails: { steps: {}, sleep: {} },
};

const subscribe = (listener: () => void) => healthController().subscribe(listener);
const getSnapshot = () => healthController().getState();
const getServerSnapshot = () => serverState;

export function useHealthSync() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { state, controller: typeof window === "undefined" ? undefined : healthController() };
}

/** The clock "עודכן לפני 5 דק׳" is measured against, ticking once a minute. */
export function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
