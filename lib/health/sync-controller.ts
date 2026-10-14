import { calendarDay, lastDays, shiftDay, sleepToPersist, stepsToPersist } from "./calculations.ts";
import { HealthSyncError, healthErrorKind, nativeProvider, syncWindow, type NativeHealthBridge } from "./providers.ts";
import { sourceDetailsKey } from "./sources.ts";
import type { DailySleep, DailySteps, HealthErrorKind, HealthPermissionState, HealthPreferences, HealthSourceDetails } from "./types.ts";

// One health lifecycle for the whole app.
//
// The steps tile, the sleep tile and the progress panel each used to run their
// own copy of it: resolve the provider once on mount, and listen for a one-off
// "start:health-ready" event. On iOS the bridge is attached after hydration, so
// a tile that mounted first resolved the browser stub, wrote "unavailable" and
// disabled itself - and when the event had already fired before it subscribed,
// it stayed disabled with real data in it. Three copies also meant three
// parallel HealthKit reads and three rounds of writes on every launch.
//
// Readiness is now state, not an event: whether the bridge exists is read from
// window.StartHealth whenever anyone asks, a native shell that has not attached
// it yet is "pending" rather than "unavailable", and the event only wakes the
// controller up. Every consumer shares one snapshot and one in-flight sync.

export type HealthMetric = "steps" | "sleep";
export type BridgeState = "pending" | "ready" | "absent";

export type HealthSnapshot = Readonly<{ entries: readonly DailySteps[]; sleep: readonly DailySleep[]; preferences: HealthPreferences }>;
export const emptyHealthSnapshot: HealthSnapshot = { entries: [], sleep: [], preferences: { dailyStepGoal: 10000 } };

export type HealthRepositoryPort = Readonly<{
  load: (fromDay: string) => Promise<HealthSnapshot>;
  recordSteps: (entries: readonly DailySteps[]) => Promise<void>;
  recordSleep: (entries: readonly DailySleep[]) => Promise<void>;
  /** Best effort: the column may not exist yet, and a figure never waits on it. */
  recordDetails?: (metric: HealthMetric, entries: readonly (DailySteps | DailySleep)[]) => Promise<void>;
}>;

export type HealthEnvironment = Readonly<{
  /** True inside the Capacitor shell, known before any plugin loads. */
  isNative: () => boolean;
  platform: () => "ios" | "android" | "web";
  getBridge: () => NativeHealthBridge | undefined;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  now: () => number;
  storage?: Readonly<{ get: (key: string) => string | null; set: (key: string, value: string) => void }>;
}>;

export type HealthControllerState = Readonly<{
  bridge: BridgeState;
  platform: "ios" | "android" | "web";
  permission: HealthPermissionState;
  syncing: boolean;
  loaded: boolean;
  snapshot: HealthSnapshot;
  /** Per metric, so a failed sleep read does not paint the steps card red. */
  errors: Readonly<Partial<Record<HealthMetric | "load", HealthErrorKind>>>;
  lastSyncedAt: Readonly<Partial<Record<HealthMetric, string>>>;
  /** Writers seen on the last read, by day - shown even before the column that stores them exists. */
  liveDetails: Readonly<Record<HealthMetric, Readonly<Record<string, HealthSourceDetails>>>>;
}>;

export const HEALTH_READY_EVENT = "start:health-ready";
/** How long a native shell may take to attach the plugin before the card stops waiting. */
export const BRIDGE_READY_TIMEOUT_MS = 8000;
/** The history the detail screen can chart. Only the last seven days are re-read. */
export const HEALTH_HISTORY_DAYS = 31;
const STORAGE_KEY = "start:health-last-sync";

type Track = (event: "health_synced" | "error", properties: Record<string, string | number | boolean>) => void;

export function createHealthController({ env, repository, track = () => {}, readyTimeoutMs = BRIDGE_READY_TIMEOUT_MS }: {
  env: HealthEnvironment;
  repository: HealthRepositoryPort;
  track?: Track;
  readyTimeoutMs?: number;
}) {
  let state: HealthControllerState = {
    bridge: "pending",
    platform: "web",
    permission: "unknown",
    syncing: false,
    loaded: false,
    snapshot: emptyHealthSnapshot,
    errors: {},
    lastSyncedAt: readStoredSync(env),
    liveDetails: { steps: {}, sleep: {} },
  };
  const listeners = new Set<() => void>();
  let started = false;
  let readyTimer: unknown;
  let inFlight: Promise<void> | null = null;
  let queued: { ask: boolean } | null = null;
  let inFlightHadBridge = false;

  const set = (patch: Partial<HealthControllerState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };

  const today = () => calendarDay(env.now());

  const load = async () => {
    try {
      const snapshot = await repository.load(shiftDay(today(), -(HEALTH_HISTORY_DAYS - 1)));
      const errors = { ...state.errors };
      delete errors.load;
      set({ snapshot, loaded: true, errors });
      return snapshot;
    } catch (error) {
      set({ loaded: true, errors: { ...state.errors, load: "load-failed" } });
      track("error", { where: "health-load", kind: healthErrorKind(error, "load-failed") });
      return state.snapshot;
    }
  };

  // Re-reads window.StartHealth every time: readiness is a fact about the
  // page right now, not about the moment a component happened to mount.
  const refreshBridge = (): NativeHealthBridge | undefined => {
    const bridge = env.getBridge();
    const platform = env.platform();
    if (bridge) {
      if (readyTimer !== undefined) { env.clearTimeout(readyTimer); readyTimer = undefined; }
      if (state.bridge !== "ready" || state.platform !== platform) set({ bridge: "ready", platform });
      return bridge;
    }
    if (!env.isNative()) {
      if (state.bridge !== "absent") set({ bridge: "absent", platform, permission: "unavailable" });
      return undefined;
    }
    // Native, plugin not attached yet. This is the bootstrap window, and it is
    // not a verdict: the card says it is connecting, and stays pressable.
    if (state.bridge === "ready") set({ bridge: "pending", platform });
    if (state.bridge === "pending" && readyTimer === undefined && started) {
      readyTimer = env.setTimeout(() => {
        readyTimer = undefined;
        if (!env.getBridge()) {
          set({ bridge: "absent", permission: "unavailable" });
          track("error", { where: "health-bridge", kind: "bridge-unavailable" });
        }
      }, readyTimeoutMs);
    }
    return undefined;
  };

  const run = async (ask: boolean) => {
    const bridge = refreshBridge();
    if (!state.loaded) await load();
    if (!bridge) {
      if (ask && state.bridge === "absent") track("error", { where: "health-sync", kind: "bridge-unavailable" });
      return;
    }
    const provider = nativeProvider(bridge);
    set({ syncing: true });
    try {
      let permission: HealthPermissionState;
      try {
        if (!(await provider.isAvailable())) {
          // The plugin answered, and the device has no health store (an iPad,
          // an old Android). That one is final.
          set({ permission: "unavailable", errors: withoutMetricErrors(state.errors) });
          return;
        }
        permission = await provider.getPermission();
        if (ask && (permission === "prompt" || permission === "unknown" || permission === "denied")) {
          permission = await provider.requestPermission();
        }
      } catch (error) {
        const kind = healthErrorKind(error, "permission-check-failed");
        set({ errors: { ...state.errors, steps: kind, sleep: kind } });
        track("error", { where: "health-permission", kind });
        return;
      }
      set({ permission });
      if (permission !== "granted") {
        set({ errors: withoutMetricErrors(state.errors) });
        if (permission === "denied") track("error", { where: "health-permission", kind: "permission-denied" });
        return;
      }

      const current = state.loaded ? state.snapshot : await load();
      const day = today();
      const range = syncWindow(day);
      const [steps, sleep] = await Promise.all([
        syncMetric("steps", () => provider.readDailySteps(range.fromDay, range.toDay), (incoming) => stepsToPersist(incoming, current.entries, day), repository.recordSteps, current.entries),
        syncMetric("sleep", () => provider.readDailySleep(range.fromDay, range.toDay), (incoming) => sleepToPersist(incoming, current.sleep, day), repository.recordSleep, current.sleep),
      ]);
      if (steps.written || sleep.written || steps.detailsWritten || sleep.detailsWritten) await load();
      // What HealthKit just said is shown whether or not it was saved: a failed
      // save keeps its error state, but the card still has today's figure.
      set({
        snapshot: {
          ...state.snapshot,
          entries: overlay(state.snapshot.entries, steps.incoming),
          sleep: overlay(state.snapshot.sleep, sleep.incoming),
        },
      });

      const nowIso = new Date(env.now()).toISOString();
      const errors = { ...state.errors };
      const lastSyncedAt = { ...state.lastSyncedAt };
      for (const [metric, outcome] of [["steps", steps], ["sleep", sleep]] as const) {
        if (outcome.error) errors[metric] = outcome.error;
        else { delete errors[metric]; lastSyncedAt[metric] = nowIso; }
      }
      set({
        errors,
        lastSyncedAt,
        liveDetails: { steps: { ...state.liveDetails.steps, ...steps.details }, sleep: { ...state.liveDetails.sleep, ...sleep.details } },
      });
      writeStoredSync(env, lastSyncedAt);
      track("health_synced", {
        source: provider.source,
        stepsRead: steps.read,
        sleepRead: sleep.read,
        daysWritten: steps.written + sleep.written,
        stepsFailed: Boolean(steps.error),
        sleepFailed: Boolean(sleep.error),
      });
    } finally {
      set({ syncing: false });
    }
  };

  async function syncMetric<T extends DailySteps | DailySleep>(
    metric: HealthMetric,
    read: () => Promise<readonly T[]>,
    changed: (incoming: readonly T[]) => readonly T[],
    record: (entries: readonly T[]) => Promise<void>,
    known: readonly T[],
  ): Promise<{ read: number; written: number; detailsWritten: number; error?: HealthErrorKind; details: Record<string, HealthSourceDetails>; incoming: readonly T[] }> {
    let incoming: readonly T[];
    try {
      incoming = await read();
    } catch (error) {
      const kind = healthErrorKind(error, "read-failed");
      track("error", { where: `health-read-${metric}`, kind });
      return { read: 0, written: 0, detailsWritten: 0, error: kind, details: {}, incoming: [] };
    }
    const details: Record<string, HealthSourceDetails> = {};
    for (const entry of incoming) if (entry.details) details[entry.day] = entry.details;
    const toWrite = changed(incoming);
    try {
      if (toWrite.length) await record(toWrite);
    } catch (error) {
      track("error", { where: `health-persist-${metric}`, kind: "persist-failed" });
      return { read: incoming.length, written: 0, detailsWritten: 0, error: error instanceof HealthSyncError ? error.kind : "persist-failed", details, incoming };
    }
    // Writers change without the figure changing (a ring connected mid-day),
    // so their record is compared on its own.
    const stored = new Map(known.map((entry) => [`${entry.day}|${entry.source}`, sourceDetailsKey(entry.details)]));
    const detailChanges = incoming.filter((entry) => entry.details && stored.get(`${entry.day}|${entry.source}`) !== sourceDetailsKey(entry.details));
    let detailsWritten = 0;
    if (detailChanges.length && repository.recordDetails) {
      try {
        await repository.recordDetails(metric, detailChanges);
        detailsWritten = detailChanges.length;
      } catch {
        // Not shown to the client: the figure saved, and the writer's name is
        // still on screen from this read.
        track("error", { where: `health-details-${metric}`, kind: "persist-failed" });
      }
    }
    return { read: incoming.length, written: toWrite.length, detailsWritten, details, incoming };
  }

  const sync = ({ ask = false }: { ask?: boolean } = {}): Promise<void> => {
    if (inFlight) {
      // Several cards mounting together, or a ready event during a read, join
      // the read already running. Two cases run once more after it: a tap
      // (it may need to ask for permission), and a bridge that attached after
      // the running sync had already found none.
      if (ask || (!inFlightHadBridge && env.getBridge())) queued = { ask: Boolean(queued?.ask) || ask };
      return inFlight;
    }
    inFlightHadBridge = Boolean(env.getBridge());
    inFlight = run(ask)
      .catch((error) => { track("error", { where: "health-sync", kind: healthErrorKind(error, "read-failed") }); })
      .finally(() => {
        inFlight = null;
        const next = queued;
        queued = null;
        if (next) void sync(next);
      });
    return inFlight;
  };

  const onReady = () => {
    refreshBridge();
    void sync();
  };

  const start = () => {
    if (started) return;
    started = true;
    env.addEventListener(HEALTH_READY_EVENT, onReady);
    refreshBridge();
    void sync();
  };

  const stop = () => {
    if (!started) return;
    started = false;
    env.removeEventListener(HEALTH_READY_EVENT, onReady);
    if (readyTimer !== undefined) { env.clearTimeout(readyTimer); readyTimer = undefined; }
  };

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      start();
      return () => { listeners.delete(listener); };
    },
    sync,
    start,
    stop,
    /** Opens the Health app's permission list when the installed binary can. */
    openSettings: async () => {
      const bridge = env.getBridge();
      if (!bridge?.openSettings) return false;
      try { return Boolean(await bridge.openSettings()); } catch { return false; }
    },
    historyDays: (count: number) => lastDays(today(), count),
  };
}

export type HealthController = ReturnType<typeof createHealthController>;

/** Stored rows, with whatever was just read replacing the same day and source. */
function overlay<T extends DailySteps | DailySleep>(stored: readonly T[], incoming: readonly T[]): readonly T[] {
  if (!incoming.length) return stored;
  const fresh = new Map(incoming.map((entry) => [`${entry.day}|${entry.source}`, entry]));
  const kept = stored.filter((entry) => !fresh.has(`${entry.day}|${entry.source}`));
  return [...kept, ...fresh.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function withoutMetricErrors(errors: HealthControllerState["errors"]): HealthControllerState["errors"] {
  const next = { ...errors };
  delete next.steps;
  delete next.sleep;
  return next;
}

function readStoredSync(env: HealthEnvironment): HealthControllerState["lastSyncedAt"] {
  try {
    const raw = env.storage?.get(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    const result: Partial<Record<HealthMetric, string>> = {};
    for (const metric of ["steps", "sleep"] as const) {
      if (typeof parsed[metric] === "string" && Number.isFinite(Date.parse(parsed[metric] as string))) result[metric] = parsed[metric] as string;
    }
    return result;
  } catch {
    return {};
  }
}

function writeStoredSync(env: HealthEnvironment, value: HealthControllerState["lastSyncedAt"]) {
  try { env.storage?.set(STORAGE_KEY, JSON.stringify(value)); } catch { /* private mode */ }
}
