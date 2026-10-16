import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { stepsByDay } from "../lib/health/calculations.ts";
import { HealthSyncError, nativeProvider, type NativeHealthBridge } from "../lib/health/providers.ts";
import { mergedMinutes, sleepNightKey, sleepNightsFromSamples } from "../lib/health/sleep-nights.ts";
import { describeSources, normalizeSourceDetails } from "../lib/health/sources.ts";
import { formatClockHours, healthCardModel } from "../lib/health/status.ts";
import { createHealthController, emptyHealthSnapshot, HEALTH_READY_EVENT, type HealthEnvironment, type HealthRepositoryPort, type HealthSnapshot } from "../lib/health/sync-controller.ts";
import type { DailySteps, HealthPermissionState, SleepSample } from "../lib/health/types.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the iOS scene boots the controller that registers the HealthKit plugin", async () => {
  const [scene, controller] = await Promise.all([
    source("ios/App/App/SceneDelegate.swift"),
    source("ios/App/App/StartViewController.swift"),
  ]);
  assert.match(scene, /rootViewController\s*=\s*StartViewController\(\)/);
  assert.doesNotMatch(scene, /rootViewController\s*=\s*CAPBridgeViewController\(\)/);
  assert.match(controller, /registerPluginInstance\(StartHealthPlugin\(\)\)/);
});

// 2026-10-14 10:00 in Israel.
const NOW = Date.parse("2026-10-14T07:00:00.000Z");
const TODAY = "2026-10-14";

const IPHONE = { sourceName: "iPhone של אלי", sourceBundleIdentifier: "com.apple.health.81B2", productType: "iPhone16,2", deviceName: "iPhone", manufacturer: "Apple Inc.", model: "iPhone", hardwareVersion: "iPhone16,2" };
const WATCH = { sourceName: "Apple Watch של אלי", sourceBundleIdentifier: "com.apple.health.C3D4", productType: "Watch7,1", deviceName: "Apple Watch", manufacturer: "Apple Inc.", model: "Watch", hardwareVersion: "Watch7,1" };
const OURA = { sourceName: "Oura", sourceBundleIdentifier: "com.ouraring.oura", deviceName: "Oura Ring", manufacturer: "Oura", model: "Gen3" };

// ── A fake page: window events, a bridge that can arrive late, timers we fire by hand.

function fakeEnv({ native = true, bridge }: { native?: boolean; bridge?: NativeHealthBridge } = {}) {
  const listeners = new Map<string, Set<() => void>>();
  const timers: (() => void)[] = [];
  const store = new Map<string, string>();
  const page = { bridge };
  const env: HealthEnvironment = {
    isNative: () => native,
    platform: () => (native ? "ios" : "web"),
    getBridge: () => page.bridge,
    addEventListener: (type, listener) => { listeners.set(type, (listeners.get(type) ?? new Set()).add(listener)); },
    removeEventListener: (type, listener) => { listeners.get(type)?.delete(listener); },
    setTimeout: (callback) => { timers.push(callback); return timers.length; },
    clearTimeout: (handle) => { timers[(handle as number) - 1] = () => {}; },
    now: () => NOW,
    storage: { get: (key) => store.get(key) ?? null, set: (key, value) => { store.set(key, value); } },
  };
  return {
    env,
    page,
    dispatch: (type: string) => { for (const listener of listeners.get(type) ?? []) listener(); },
    fireTimers: () => { for (const timer of timers.splice(0)) timer(); },
    listenerCount: (type: string) => listeners.get(type)?.size ?? 0,
  };
}

function fakeRepository(initial: Partial<HealthSnapshot> = {}, { failWrites = false } = {}) {
  let snapshot: HealthSnapshot = { ...emptyHealthSnapshot, ...initial };
  const calls = { load: 0, steps: 0, sleep: 0, details: 0 };
  const repository: HealthRepositoryPort = {
    load: async () => { calls.load += 1; return snapshot; },
    recordSteps: async (entries) => {
      calls.steps += 1;
      if (failWrites) throw new Error("PGRST500");
      const days = new Set(entries.map((entry) => entry.day));
      snapshot = { ...snapshot, entries: [...snapshot.entries.filter((entry) => !days.has(entry.day)), ...entries] };
    },
    recordSleep: async (entries) => {
      calls.sleep += 1;
      if (failWrites) throw new Error("PGRST500");
      const days = new Set(entries.map((entry) => entry.day));
      snapshot = { ...snapshot, sleep: [...snapshot.sleep.filter((entry) => !days.has(entry.day)), ...entries] };
    },
    recordDetails: async () => { calls.details += 1; },
  };
  return { repository, calls, current: () => snapshot };
}

function fakeBridge({
  permission = "granted" as HealthPermissionState,
  steps = [{ day: TODAY, steps: 3743, sources: [WATCH, IPHONE] }] as { day: string; steps: number; sources?: unknown[] }[],
  samples = [
    { start: "2026-10-13T20:10:00.000Z", end: "2026-10-14T04:03:00.000Z", stage: "core", source: OURA },
  ] as unknown[] | null,
  failSteps = false,
  failSleep = false,
} = {}) {
  let current = permission;
  const calls = { steps: 0, sleep: 0, request: 0 };
  const bridge: NativeHealthBridge = {
    source: "healthkit",
    isAvailable: async () => true,
    getPermission: async () => current,
    requestPermission: async () => { calls.request += 1; current = current === "prompt" ? "granted" : current; return current; },
    readDailySteps: async () => { calls.steps += 1; if (failSteps) throw new Error("Protected health data is inaccessible"); return steps; },
    readDailySleep: async () => [],
    readSleepSamples: async () => { calls.sleep += 1; if (failSleep) throw new Error("HEALTH_READ_FAILED"); return samples; },
  };
  return { bridge, calls, setPermission: (next: HealthPermissionState) => { current = next; } };
}

const settle = async () => { for (let index = 0; index < 20; index += 1) await new Promise((resolve) => setImmediate(resolve)); };
const card = (controller: ReturnType<typeof createHealthController>, metric: "steps" | "sleep") => healthCardModel(controller.getState(), metric, TODAY, NOW);

// ── 1-4. Lifecycle: the bridge before, after, or racing the first render.

test("1. a screen that mounts before window.StartHealth is 'connecting', not disabled", async () => {
  const page = fakeEnv();
  const { repository } = fakeRepository();
  const controller = createHealthController({ env: page.env, repository });
  controller.subscribe(() => {});
  await settle();
  assert.equal(controller.getState().bridge, "pending");
  assert.notEqual(controller.getState().permission, "unavailable");
  assert.equal(card(controller, "steps").status, "initializing");
  assert.equal(card(controller, "sleep").status, "initializing");
});

test("2. the bridge attaching after mount is picked up and synced at once", async () => {
  const page = fakeEnv();
  const { repository, current } = fakeRepository();
  const controller = createHealthController({ env: page.env, repository });
  controller.subscribe(() => {});
  await settle();
  const native = fakeBridge();
  page.page.bridge = native.bridge;
  page.dispatch(HEALTH_READY_EVENT);
  await settle();
  assert.equal(controller.getState().bridge, "ready");
  assert.equal(controller.getState().permission, "granted");
  assert.equal(current().entries[0]?.steps, 3743);
  assert.equal(card(controller, "steps").status, "granted");
});

test("3. a ready event that fired before anyone listened is not needed", async () => {
  const page = fakeEnv();
  const native = fakeBridge();
  // The event fires into the void...
  page.page.bridge = native.bridge;
  page.dispatch(HEALTH_READY_EVENT);
  // ...and the cards mount afterwards.
  const { repository } = fakeRepository();
  const controller = createHealthController({ env: page.env, repository });
  controller.subscribe(() => {});
  await settle();
  assert.equal(controller.getState().bridge, "ready");
  assert.equal(native.calls.steps, 1);
});

test("4. StartHealth already present at mount syncs once, however many cards subscribe", async () => {
  const native = fakeBridge();
  const page = fakeEnv({ bridge: native.bridge });
  const { repository, calls } = fakeRepository();
  const controller = createHealthController({ env: page.env, repository });
  // Steps tile, sleep tile and the progress panel, all at once.
  controller.subscribe(() => {});
  controller.subscribe(() => {});
  controller.subscribe(() => {});
  void controller.sync();
  void controller.sync();
  await settle();
  assert.equal(native.calls.steps, 1, "one HealthKit read, not one per card");
  assert.equal(native.calls.sleep, 1);
  assert.equal(calls.steps, 1);
  assert.equal(page.listenerCount(HEALTH_READY_EVENT), 1);
});

test("a native shell whose plugin never attaches stops waiting, and recovers if it does", async () => {
  const page = fakeEnv();
  const { repository } = fakeRepository();
  const controller = createHealthController({ env: page.env, repository });
  controller.subscribe(() => {});
  await settle();
  page.fireTimers();
  assert.equal(controller.getState().bridge, "absent");
  assert.equal(card(controller, "steps").status, "unavailable");
  page.page.bridge = fakeBridge().bridge;
  page.dispatch(HEALTH_READY_EVENT);
  await settle();
  assert.equal(card(controller, "steps").status, "granted");
});

test("an older iPhone bridge may reject availability while permission and reads still work", async () => {
  const native = fakeBridge();
  (native.bridge as { isAvailable: NativeHealthBridge["isAvailable"] }).isAvailable = async () => {
    throw new Error("plugin availability probe unavailable");
  };
  const page = fakeEnv({ bridge: native.bridge });
  const { repository, current } = fakeRepository();
  const events: Record<string, unknown>[] = [];
  const controller = createHealthController({
    env: page.env,
    repository,
    track: (_event, properties) => events.push(properties),
  });
  controller.subscribe(() => {});
  await settle();
  assert.equal(controller.getState().permission, "granted");
  assert.equal(current().entries[0]?.steps, 3743);
  assert.equal(card(controller, "sleep").status, "granted");
  assert.ok(events.some((event) => event.where === "health-availability-compat"));
});

test("returning from the background re-reads, so a ring's new steps arrive", async () => {
  const native = fakeBridge();
  const page = fakeEnv({ bridge: native.bridge });
  const { repository, current } = fakeRepository();
  const controller = createHealthController({ env: page.env, repository });
  controller.subscribe(() => {});
  await settle();
  (native.bridge as { readDailySteps: NativeHealthBridge["readDailySteps"] }).readDailySteps = async () => [{ day: TODAY, steps: 5120, sources: [OURA] }];
  page.dispatch(HEALTH_READY_EVENT); // NativeBridge sends this on appStateChange → active
  await settle();
  assert.equal(stepsByDay(current().entries).get(TODAY)?.steps, 5120);
});

// ── 5. Permission states.

test("5. prompt, granted, denied and unavailable are four different cards", async () => {
  const prompt = fakeBridge({ permission: "prompt" });
  const page = fakeEnv({ bridge: prompt.bridge });
  const controller = createHealthController({ env: page.env, repository: fakeRepository().repository });
  controller.subscribe(() => {});
  await settle();
  assert.equal(card(controller, "steps").status, "prompt");
  assert.equal(card(controller, "steps").action, "connect");
  assert.equal(prompt.calls.steps, 0, "nothing is read before the client agrees");
  await controller.sync({ ask: true });
  await settle();
  assert.equal(prompt.calls.request, 1);
  assert.equal(card(controller, "steps").status, "granted");

  const denied = fakeBridge({ permission: "denied" });
  const deniedController = createHealthController({ env: fakeEnv({ bridge: denied.bridge }).env, repository: fakeRepository().repository });
  deniedController.subscribe(() => {});
  await settle();
  assert.equal(card(deniedController, "steps").status, "denied");
  assert.equal(card(deniedController, "steps").action, "settings");

  const browser = createHealthController({ env: fakeEnv({ native: false }).env, repository: fakeRepository().repository });
  browser.subscribe(() => {});
  await settle();
  assert.equal(card(browser, "steps").status, "unavailable");
});

test("a card is never disabled and never faded to show its state", async () => {
  const [tile, css] = await Promise.all([source("components/client/HealthMetricTile.tsx"), source("app/globals.css")]);
  assert.doesNotMatch(tile, /disabled=/);
  assert.match(tile, /data-status=\{card\.status\}/);
  assert.doesNotMatch(css, /\.metric-tile--health[^{]*\{[^}]*opacity:\s*\.[0-6]/);
  assert.doesNotMatch(css, /\.metric-tile--button:disabled\s*\{[^}]*opacity/);
});

// ── 6-11. Sync outcomes.

test("6. a successful steps sync stores the merged figure and shows it", async () => {
  const native = fakeBridge();
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository: fakeRepository().repository });
  controller.subscribe(() => {});
  await settle();
  const model = card(controller, "steps");
  assert.equal(model.status, "granted");
  assert.equal(model.statusText, "מחובר");
  assert.equal(model.syncedText, "עודכן עכשיו");
});

test("7. a successful sleep sync shows the compact reference wording", async () => {
  const native = fakeBridge();
  const { repository, current } = fakeRepository();
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository });
  controller.subscribe(() => {});
  await settle();
  assert.equal(current().sleep[0]?.day, TODAY, "the night belongs to the morning it ended on");
  assert.equal(formatClockHours(current().sleep[0]!.minutes), "7:53");
  assert.equal(formatClockHours(593), "9:53");
  assert.equal(formatClockHours(480), "8:00");
  const tile = await source("components/client/SleepMetricTile.tsx");
  assert.match(tile, /unit="שעות"/);
  assert.match(tile, /goal=\{`מתוך \$\{Math\.floor\(SLEEP_GOAL_MINUTES \/ 60\)\} שעות`\}/);
  assert.match(tile, /detail=\{\(\) => "הנתון האחרון שנקלט"\}/);
});

test("8. a HealthKit read failure is an error, not an empty week", async () => {
  const native = fakeBridge({ failSteps: true });
  const events: Record<string, unknown>[] = [];
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository: fakeRepository().repository, track: (_event, properties) => events.push(properties) });
  controller.subscribe(() => {});
  await settle();
  assert.equal(controller.getState().errors.steps, "read-failed");
  assert.equal(card(controller, "steps").status, "sync-error");
  assert.equal(card(controller, "steps").statusText, "הסנכרון נכשל");
  assert.equal(card(controller, "steps").action, "retry");
  // Sleep read fine and is not painted red by the steps failure.
  assert.equal(card(controller, "sleep").status, "granted");
  assert.ok(events.some((event) => event.kind === "read-failed"));
  // The provider itself no longer turns a throw into [].
  await assert.rejects(nativeProvider(native.bridge).readDailySteps("2026-10-08", TODAY), (error: unknown) => error instanceof HealthSyncError && error.kind === "read-failed");
});

test("9. a failed save is reported as a persistence failure", async () => {
  const native = fakeBridge();
  const events: Record<string, unknown>[] = [];
  const { repository } = fakeRepository({}, { failWrites: true });
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository, track: (_event, properties) => events.push(properties) });
  controller.subscribe(() => {});
  await settle();
  assert.equal(controller.getState().errors.steps, "persist-failed");
  assert.equal(card(controller, "steps").status, "sync-error");
  assert.deepEqual(events.filter((event) => event.kind === "persist-failed").map((event) => event.where).sort(), ["health-persist-sleep", "health-persist-steps"]);
  // The figure HealthKit returned is still on the card beside "נסו שוב".
  assert.equal(card(controller, "steps").hasValue, true);
  assert.equal(stepsByDay(controller.getState().snapshot.entries).get(TODAY)?.steps, 3743);
});

test("analytics tells the four failures apart", async () => {
  const kinds = new Set<unknown>();
  const record = (_event: string, properties: Record<string, unknown>) => { kinds.add(properties.kind); };
  const absent = createHealthController({ env: fakeEnv({ native: false }).env, repository: fakeRepository().repository, track: record });
  absent.subscribe(() => {});
  await absent.sync({ ask: true });
  const denied = createHealthController({ env: fakeEnv({ bridge: fakeBridge({ permission: "denied" }).bridge }).env, repository: fakeRepository().repository, track: record });
  denied.subscribe(() => {});
  const readFail = createHealthController({ env: fakeEnv({ bridge: fakeBridge({ failSleep: true }).bridge }).env, repository: fakeRepository().repository, track: record });
  readFail.subscribe(() => {});
  const saveFail = createHealthController({ env: fakeEnv({ bridge: fakeBridge().bridge }).env, repository: fakeRepository({}, { failWrites: true }).repository, track: record });
  saveFail.subscribe(() => {});
  await settle();
  for (const kind of ["bridge-unavailable", "permission-denied", "read-failed", "persist-failed"]) assert.ok(kinds.has(kind), kind);
});

test("10. stored figures stay on screen while a sync fails", async () => {
  const stored: DailySteps = { day: TODAY, steps: 2210, source: "healthkit", recordedAt: "2026-10-14T05:00:00.000Z" };
  const native = fakeBridge({ failSteps: true });
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository: fakeRepository({ entries: [stored] }).repository });
  controller.subscribe(() => {});
  await settle();
  const model = card(controller, "steps");
  assert.equal(model.status, "sync-error");
  assert.equal(model.hasValue, true);
  assert.equal(stepsByDay(controller.getState().snapshot.entries).get(TODAY)?.steps, 2210);
});

test("11. access granted with no samples is 'no data yet', never a zero", async () => {
  const native = fakeBridge({ steps: [], samples: [] });
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository: fakeRepository().repository });
  controller.subscribe(() => {});
  await settle();
  for (const metric of ["steps", "sleep"] as const) {
    const model = card(controller, metric);
    assert.equal(model.status, "empty");
    assert.equal(model.statusText, "אין עדיין נתונים");
    assert.equal(model.hasValue, false);
  }
  const tile = await source("components/client/HealthMetricTile.tsx");
  assert.match(tile, /\{figure \?\? "—"\}/);
  const panel = await source("components/client/HealthProgressPanel.tsx");
  // No chart of zeroes when nothing reported.
  assert.match(panel, /values\.some\(\(point\) => point\.reported\) \? <Bars/);
  assert.match(panel, /reported\.length \? <Bars/);
});

// ── 12-16. Where the figure came from.

test("12. iPhone alone", () => {
  assert.equal(describeSources(normalizeSourceDetails([IPHONE])).text, "מקור: iPhone");
});

test("13. Apple Watch alone", () => {
  assert.equal(describeSources(normalizeSourceDetails([WATCH])).text, "מקור: Apple Watch");
});

test("14. a ring is named by what HealthKit says wrote it", () => {
  assert.equal(describeSources(normalizeSourceDetails([OURA])).text, "מקור: Oura דרך Apple Health");
  assert.equal(describeSources(normalizeSourceDetails([{ sourceName: "Ultrahuman", sourceBundleIdentifier: "com.ultrahuman.app" }])).text, "מקור: Ultrahuman דרך Apple Health");
  assert.equal(describeSources(normalizeSourceDetails([{ sourceName: "RingConn", sourceBundleIdentifier: "com.ringconn.app" }])).text, "מקור: RingConn דרך Apple Health");
});

test("15. several writers", () => {
  const summary = describeSources(normalizeSourceDetails([WATCH, IPHONE, OURA]));
  assert.equal(summary.text, "מקור: מספר מכשירים דרך Apple Health");
  assert.deepEqual(summary.names, ["Apple Watch", "iPhone", "Oura"]);
});

test("16. nothing specific falls back to Apple Health, and nothing is guessed", () => {
  assert.equal(describeSources(undefined).text, "מקור: Apple Health");
  assert.equal(describeSources(normalizeSourceDetails([])).text, "מקור: Apple Health");
  // An Apple writer with no model: not guessed to be a watch or a phone.
  assert.equal(describeSources(normalizeSourceDetails([{ sourceBundleIdentifier: "com.apple.health.X" }])).text, "מקור: Apple Health");
  // Junk from the bridge is dropped, long values are bounded.
  const cleaned = normalizeSourceDetails([{ sourceName: "x".repeat(300), extra: { nested: true } }, 42, null]);
  assert.equal(cleaned?.devices.length, 1);
  assert.equal(cleaned?.devices[0].sourceName?.length, 80);
  assert.equal("extra" in (cleaned?.devices[0] ?? {}), false);
});

test("steps and sleep keep their own sources", async () => {
  const native = fakeBridge();
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository: fakeRepository().repository });
  controller.subscribe(() => {});
  await settle();
  assert.equal(card(controller, "steps").sourceText, "מקור: מספר מכשירים דרך Apple Health");
  assert.equal(card(controller, "sleep").sourceText, "מקור: Oura דרך Apple Health");
});

test("an older binary without source metadata still shows its figures", async () => {
  const native = fakeBridge({ steps: [{ day: TODAY, steps: 812 }], samples: null });
  (native.bridge as { readDailySleep: NativeHealthBridge["readDailySleep"] }).readDailySleep = async () => [{ day: TODAY, minutes: 420 }];
  const controller = createHealthController({ env: fakeEnv({ bridge: native.bridge }).env, repository: fakeRepository().repository });
  controller.subscribe(() => {});
  await settle();
  assert.equal(card(controller, "steps").sourceText, "מקור: Apple Health");
  assert.equal(card(controller, "sleep").hasValue, true);
});

// ── 17. No double counting.

test("17. metadata never changes the figure, and a ring and a watch on one night count once", async () => {
  // Steps: HealthKit's merged aggregate is the figure, whatever writers are listed.
  const provider = nativeProvider(fakeBridge({ steps: [{ day: TODAY, steps: 3743, sources: [WATCH, IPHONE, OURA] }] }).bridge);
  const [steps] = await provider.readDailySteps("2026-10-08", TODAY);
  assert.equal(steps.steps, 3743);
  assert.equal(steps.details?.devices.length, 3);

  // Sleep: the watch's stage samples and the ring's night overlap. One writer
  // is chosen (staged, third-party first), and its samples are merged.
  const night: SleepSample[] = [
    { start: "2026-10-13T20:00:00.000Z", end: "2026-10-13T23:30:00.000Z", stage: "core", device: WATCH },
    { start: "2026-10-13T23:00:00.000Z", end: "2026-10-14T03:30:00.000Z", stage: "deep", device: WATCH },
    { start: "2026-10-13T20:15:00.000Z", end: "2026-10-14T03:45:00.000Z", stage: "core", device: OURA },
    { start: "2026-10-14T01:00:00.000Z", end: "2026-10-14T02:00:00.000Z", stage: "rem", device: OURA },
  ];
  const [chosen, ...rest] = sleepNightsFromSamples(night, { fromDay: "2026-10-08", toDay: TODAY }, "healthkit", "2026-10-14T07:00:00.000Z");
  assert.equal(rest.length, 0, "one night, not one per writer");
  assert.equal(chosen.day, TODAY);
  assert.equal(chosen.minutes, 450, "the ring's 7:30, not 7:30 + 7:30");
  assert.equal(chosen.details?.devices[0].sourceName, "Oura");
  assert.equal(mergedMinutes(night.filter((sample) => sample.device === WATCH)), 450);
});

test("a night is not cut in two at midnight", () => {
  // 23:00 → 07:00 Israel time, written as stage samples either side of midnight.
  const samples: SleepSample[] = [
    { start: "2026-10-13T20:00:00.000Z", end: "2026-10-13T21:30:00.000Z", stage: "core", device: WATCH },
    { start: "2026-10-13T21:30:00.000Z", end: "2026-10-14T04:00:00.000Z", stage: "deep", device: WATCH },
  ];
  const nights = sleepNightsFromSamples(samples, { fromDay: "2026-10-08", toDay: TODAY }, "healthkit", "x");
  assert.deepEqual(nights.map((night) => [night.day, night.minutes]), [[TODAY, 480]]);
  // A nap at 14:00 stays on its own day; a night starting at 22:00 belongs to the next morning.
  assert.equal(sleepNightKey("2026-10-14T11:00:00.000Z"), "2026-10-14");
  assert.equal(sleepNightKey("2026-10-14T19:00:00.000Z"), "2026-10-15");
});

test("an Apple fallback does not beat a detailed ring night, and overlapping stages are merged", () => {
  const nights = sleepNightsFromSamples([
    { start: "2026-10-13T20:00:00.000Z", end: "2026-10-14T05:00:00.000Z", stage: "asleep", device: IPHONE },
    { start: "2026-10-13T20:30:00.000Z", end: "2026-10-14T02:00:00.000Z", stage: "core", device: OURA },
    { start: "2026-10-13T22:00:00.000Z", end: "2026-10-14T04:00:00.000Z", stage: "deep", device: OURA },
  ], { fromDay: "2026-10-08", toDay: TODAY }, "healthkit", "x");
  assert.equal(nights[0].minutes, 450);
  assert.equal(nights[0].details?.devices[0].sourceName, "Oura");
});

// ── Native and storage contracts.

test("the iOS plugin reads writers from HKSourceRevision and HKDevice, and rejects failed reads", async () => {
  const swift = await source("ios/App/App/StartHealthPlugin.swift");
  assert.match(swift, /sample\.sourceRevision/);
  assert.match(swift, /revision\.source\.bundleIdentifier/);
  assert.match(swift, /revision\.productType/);
  assert.match(swift, /device\.manufacturer/);
  assert.match(swift, /device\.hardwareVersion/);
  assert.match(swift, /CAPPluginMethod\(name: "readSleepSamples"/);
  assert.match(swift, /CAPPluginMethod\(name: "openSettings"/);
  assert.match(swift, /call\.reject\("read_failed", "HEALTH_READ_FAILED"\)/);
  assert.doesNotMatch(swift, /if let error \{\s*CAPLog\.print\("StartHealth read failed[^}]*call\.resolve\(\["days": \[\]\]\)/);
  // The figure is still HealthKit's merged statistic.
  assert.match(swift, /options: \.cumulativeSum/);
});

test("the bridge exposes the new methods and tolerates an older binary", async () => {
  const bridge = await source("components/native/NativeBridge.tsx");
  assert.match(bridge, /readSleepSamples: async/);
  assert.match(bridge, /if \(unimplemented\(error\)\) return null/);
  assert.match(bridge, /openSettings: async/);
});

test("source metadata is a forward-only, optional column", async () => {
  const [migration, repository] = await Promise.all([
    source("supabase/migrations/20261014120000_health_source_details.sql"),
    source("lib/health/repository.ts"),
  ]);
  assert.match(migration, /alter table public\.health_steps add column if not exists source_details jsonb;/);
  assert.match(migration, /alter table public\.health_sleep add column if not exists source_details jsonb;/);
  assert.doesNotMatch(migration, /not null/);
  assert.doesNotMatch(migration, /drop table|drop column(?! if exists source_details)/);
  // Until it is applied the figures still load.
  assert.match(repository, /select\(`day,\$\{value\},source,recorded_at`\)/);
  assert.match(repository, /MISSING_COLUMN = new Set\(\["42703", "PGRST204"\]\)/);
});

test("the three health screens share one controller instead of three lifecycles", async () => {
  for (const file of ["components/client/StepsMetricTile.tsx", "components/client/SleepMetricTile.tsx", "components/client/HealthProgressPanel.tsx"]) {
    const text = await source(file);
    assert.doesNotMatch(text, /resolveHealthProvider|addEventListener\("start:health-ready"/, file);
    assert.match(text, /useHealthSync|<HealthMetricTile/, file);
  }
});

// ── Layout: the home screen scrolls, clears the bar once, and never clips a figure.

const homeCss = async () => {
  const css = await source("app/globals.css");
  const start = css.indexOf("/* The client home screen.");
  const end = css.indexOf(".premium-card__description {");
  assert.ok(start > 0 && end > start, "home block found");
  // Rules only: the comments describe what used to be there.
  const rules = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");
  return { css: rules(css), home: rules(css.slice(start, end)), raw: css };
};

test("26. a regular iPhone home keeps every card reachable above the fixed navigation", async () => {
  const { css, home } = await homeCss();
  assert.match(css, /@media \(max-width: 767px\) and \(min-height: 760px\)[\s\S]*?body:has\(\.client-app-shell--home\)[^{]*\{[^}]*overflow:\s*hidden/);
  assert.match(home, /\.client-app-shell--home \{[\s\S]*?height:\s*100dvh;[\s\S]*?overflow:\s*hidden/);
  assert.match(home, /\.client-app-shell--home \.client-app-content \{[\s\S]*?overflow-y:\s*auto/);
  assert.match(home, /\.client-app-shell--home \.client-app-content \{[\s\S]*?overscroll-behavior-y:\s*contain/);
  assert.doesNotMatch(home, /\.client-app-shell--home \.client-app-content \{[^}]*overflow:\s*hidden/);
  assert.doesNotMatch(home, /position:\s*fixed/);
  assert.doesNotMatch(home, /touch-action:\s*none/);
});

test("24. each responsive home layout clears the tab bar exactly once", async () => {
  const { css, home } = await homeCss();
  assert.match(css, /--nav-clearance: calc\(5\.25rem \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(home, /\.client-app-shell--home \{ padding-bottom: 0; \}/);
  assert.match(home, /padding-bottom: calc\(var\(--nav-clearance\) \+ \.75rem\)/);
  const bottomClearances = home.match(/padding-bottom:\s*calc\(var\(--nav-clearance\)[^;]+;/g) ?? [];
  assert.equal(bottomClearances.length, 2, "base and compact-phone clearance");
  assert.ok(bottomClearances.every((rule) => (rule.match(/var\(--nav-clearance\)/g) ?? []).length === 1));
  assert.match(home, /min-height: calc\(2\.75rem \+ env\(safe-area-inset-top\)\)/);
});

test("quick actions restore the substantial 12 October cards and stay equal", async () => {
  const { home } = await homeCss();
  const actions = home.slice(home.indexOf(".quick-actions-grid"));
  assert.doesNotMatch(actions, /(?:min-)?height:\s*[^;]*(?:dvh|vh)/, "action height is not tied to the viewport");
  assert.match(home, /\.quick-actions-grid \{[^}]*grid-auto-rows: 1fr/);
  assert.match(home, /\.quick-action-card \{[^}]*min-height: 7rem/);
  assert.match(home, /\.quick-action-card__icon,[\s\S]*?width: 3\.4rem; height: 3\.4rem/);
  // The 12 October card kept its secondary line on one calm line.
  assert.match(home.slice(home.indexOf(".quick-action-card__meta {")), /^[^}]*text-overflow: ellipsis/);
});

test("health cards match the supplied reference: wide, compact, and summary-led", async () => {
  const { css } = await homeCss();
  const tile = await source("components/client/HealthMetricTile.tsx");
  assert.match(css, /\.dashboard-metrics--fit > \.metric-tile--health \{ grid-column: span 3; \}/);
  assert.match(css, /\.health-tile__figure \{[^}]*display: flex/);
  assert.match(tile, /<span className="health-tile__summary">\{detail\(state, today\)\}<\/span>/);
  assert.match(tile, /card\.status === "sync-error"[\s\S]*אין עדיין נתונים/);
  assert.doesNotMatch(tile, /health-tile__meta/);
  assert.match(css, /data-metric="sleep"[^}]*\.health-tile__figure[\s\S]*?font-size:\s*clamp\(\.74rem, 3\.3vw, \.88rem\)/);
});

test("Health detail screens hide the technical failure but retain sync now", async () => {
  const panel = await source("components/client/HealthProgressPanel.tsx");
  assert.doesNotMatch(panel, /"sync-error": "לא הצלחנו/);
  assert.match(panel, /card\.status !== "sync-error" \?/);
  assert.match(panel, /: "סנכרון עכשיו"/);
});

test("27. figures never ellipsise or break, goals may wrap", async () => {
  const { raw } = await homeCss();
  const fit = raw.slice(raw.indexOf("/* The home figures:"), raw.indexOf("/* Progress metrics stay on one screen")).replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(fit, /\.metric-tile__value \{[^}]*white-space: nowrap/);
  assert.match(fit, /\.metric-tile__value \{[^}]*text-overflow: clip/);
  assert.match(fit, /\.metric-tile__goal \{[^}]*white-space: normal/);
  assert.doesNotMatch(fit, /ellipsis/);
});

test("18. numbers are isolated for RTL, and value and goal are separate lines", async () => {
  const [page, tile] = await Promise.all([source("app/page.tsx"), source("components/client/HealthMetricTile.tsx")]);
  assert.match(tile, /<bdi>\{figure \?\? "—"\}<\/bdi>/);
  assert.match(page, /value=\{<bdi>\{completed\.length\}<\/bdi>\}/);
  assert.match(page, /detail=\{`מתוך \$\{meals\.length\}`\}/);
  assert.doesNotMatch(page, /value=\{`\$\{completed\.length\} מתוך/);
  const steps = await source("components/client/StepsMetricTile.tsx");
  assert.match(steps, /goal=\{`מתוך \$\{goal\}`\}/);
});

test("25. home navigation targets are unchanged", async () => {
  const [page, widget] = await Promise.all([source("app/page.tsx"), source("components/workouts/client/DashboardWorkoutWidget.tsx")]);
  for (const href of ['href="/nutrition"', 'href="/check-in"', 'href="/progress"']) assert.ok(page.includes(href), href);
  assert.match(widget, /href=\{active \? `\/workouts\/\$\{active\.programId\}\/\$\{active\.dayId\}` : "\/workouts"\}/);
  assert.match(page, /<HomeDailyTip/);
  assert.match(page, /<ProgressPulse/);
});
