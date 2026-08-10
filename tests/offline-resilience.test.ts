import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isOfflineError, nextConnectionState } from "../lib/offline/connection.ts";
import { isFreshCache, parseCache, type CachedSnapshot } from "../lib/workouts/snapshot-cache.ts";
import type { WorkoutRepositorySnapshot } from "../lib/workouts/types.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const snapshot = { exercises: [], programs: [], clients: [], assignments: [], activeSessions: [], completedWorkouts: [], coachNotes: [], notifications: [], workoutPreferences: [], scheduleChanges: [] } satisfies WorkoutRepositorySnapshot;
const cached = (patch: Partial<CachedSnapshot> = {}): CachedSnapshot => ({ version: 1, userId: "client-1", savedAt: 1_000, snapshot, ...patch });

test("a failed request marks the connection down, a successful one brings it back", () => {
  const online = { online: true, changedAt: 0 };
  const down = nextConnectionState(online, "request-failed", 10);
  assert.equal(down.online, false);
  assert.equal(down.changedAt, 10);
  assert.equal(nextConnectionState(down, "request-succeeded", 20).online, true);
  assert.equal(nextConnectionState(down, "browser-online", 20).online, true);
});

test("an unchanged state is returned identically, so subscribers do not re-render", () => {
  const state = { online: true, changedAt: 0 };
  assert.equal(nextConnectionState(state, "request-succeeded", 99), state);
});

test("network failures are told apart from server rejections", () => {
  assert.equal(isOfflineError(new Error("Failed to fetch")), true);
  assert.equal(isOfflineError(new Error("TypeError: NetworkError when attempting to fetch resource")), true);
  assert.equal(isOfflineError(new Error("not_authorized")), false);
  assert.equal(isOfflineError(new Error("assignment_not_active")), false);
});

test("a cache belonging to another account is never read", () => {
  assert.equal(isFreshCache(cached(), "client-1", 2_000), true);
  assert.equal(isFreshCache(cached(), "client-2", 2_000), false);
});

test("a stale cache expires rather than training against a replaced programme", () => {
  const eightDays = 8 * 24 * 60 * 60 * 1000;
  assert.equal(isFreshCache(cached({ savedAt: 0 }), "client-1", eightDays), false);
  assert.equal(isFreshCache(cached({ savedAt: 0 }), "client-1", 6 * 24 * 60 * 60 * 1000), true);
});

test("a truncated or foreign cache value is ignored, not thrown on", () => {
  assert.equal(parseCache(null), undefined);
  assert.equal(parseCache("{"), undefined);
  assert.equal(parseCache(JSON.stringify({ version: 2, userId: "client-1", savedAt: 1, snapshot })), undefined);
  assert.equal(parseCache(JSON.stringify({ version: 1, userId: "client-1", savedAt: 1, snapshot: { programs: [] } })), undefined);
  assert.ok(parseCache(JSON.stringify(cached())));
});

test("only a client's snapshot is written to the device", async () => {
  const cache = await source("lib/workouts/snapshot-cache.ts");
  assert.match(cache, /if \(role !== "client" \|\| !userId\) return;/);
  // Signing out has to take it off the device.
  const watcher = await source("components/auth/AuthSessionWatcher.tsx");
  assert.match(watcher, /clearSnapshotCache\(\)/);
});

test("the set is written to the device before the network is attempted", async () => {
  const provider = await source("components/workouts/WorkoutProvider.tsx");
  assert.match(provider, /saveSession:\(session\)=>\{setSnapshot\(\(current\)=>cache\(saveActiveWorkoutSession\(current,session\)\)\);pendingSession\.current=session/);
  // Reconnecting replays the newest state once, rather than draining a queue.
  assert.match(provider, /connectionStore\.subscribe\(\(\)=>\{\s*if\(connectionStore\.getSnapshot\(\)\.online&&pendingSession\.current\)flushSession\(\)/);
});

test("a completed workout is still guarded against a double submit", async () => {
  const provider = await source("components/workouts/WorkoutProvider.tsx");
  assert.match(provider, /completeSession:async\(workout\)=>\{if\(snapshot\.completedWorkouts\.some\(\(item\)=>item\.id===workout\.id\)\)return false/);
  const session = await source("components/workouts/client/WorkoutSession.tsx");
  assert.match(session, /if\(isCompleting\)return;setIsCompleting\(true\)/);
  assert.match(session, /if\(isStarting\)return;/);
});

test("losing the network shows a banner, not an error page", async () => {
  const banner = await source("components/client/OfflineBanner.tsx");
  assert.match(banner, /useSyncExternalStore/);
  assert.match(banner, /אין חיבור לאינטרנט/);
  const shell = await source("components/client/ClientShell.tsx");
  assert.match(shell, /<OfflineBanner \/>/);
});
