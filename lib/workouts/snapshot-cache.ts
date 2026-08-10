import type { WorkoutRepositorySnapshot } from "./types.ts";

// A client mid-set in a basement should not lose the workout because the phone
// dropped the network. The last snapshot Supabase returned is kept verbatim in
// localStorage so a reload offline still has the programme, the exercises and
// the session in progress.
//
// Deliberately narrow:
//   - clients only. A coach's snapshot carries every client's data, and a coach
//     works online at a desk; caching it would put other people's records on
//     whatever device happened to be signed in.
//   - keyed by user id, so switching accounts never reads someone else's cache.
//   - expires, so a phone that was last online a fortnight ago does not train
//     against a programme that has since been replaced.

const KEY = "start.workouts.snapshot.v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedSnapshot = Readonly<{ version: 1; userId: string; savedAt: number; snapshot: WorkoutRepositorySnapshot }>;

export function isFreshCache(cache: CachedSnapshot | undefined, userId: string, now: number): cache is CachedSnapshot {
  if (!cache || cache.version !== 1 || !cache.userId) return false;
  if (cache.userId !== userId) return false;
  return now - cache.savedAt <= MAX_AGE_MS && cache.savedAt <= now;
}

// Shape check rather than a schema: the cache is written by this same build, so
// the risk is a truncated or hand-edited value, not a foreign format.
export function parseCache(raw: string | null): CachedSnapshot | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<CachedSnapshot>;
    if (value?.version !== 1 || typeof value.userId !== "string" || typeof value.savedAt !== "number") return undefined;
    const snapshot = value.snapshot as WorkoutRepositorySnapshot | undefined;
    if (!snapshot || !Array.isArray(snapshot.programs) || !Array.isArray(snapshot.exercises) || !Array.isArray(snapshot.activeSessions)) return undefined;
    return { version: 1, userId: value.userId, savedAt: value.savedAt, snapshot };
  } catch {
    return undefined;
  }
}

export function writeSnapshotCache(userId: string, role: "coach" | "client", snapshot: WorkoutRepositorySnapshot, now = Date.now()): void {
  if (typeof window === "undefined") return;
  if (role !== "client" || !userId) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, userId, savedAt: now, snapshot } satisfies CachedSnapshot));
  } catch {
    // Private mode or a full quota. The live session still works; only the
    // offline fallback is unavailable, and that is not worth an error to the user.
  }
}

export function readSnapshotCache(userId: string, now = Date.now()): WorkoutRepositorySnapshot | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const cache = parseCache(window.localStorage.getItem(KEY));
    return isFreshCache(cache, userId, now) ? cache.snapshot : undefined;
  } catch {
    return undefined;
  }
}

// The signed-in user is not known when a load fails before auth resolves, so the
// last user id is kept alongside the cache.
const USER_KEY = "start.workouts.user.v1";
export function rememberCachedUser(userId: string, role: "coach" | "client"): void {
  if (typeof window === "undefined") return;
  try {
    if (role === "client" && userId) window.localStorage.setItem(USER_KEY, userId);
    else window.localStorage.removeItem(USER_KEY);
  } catch { /* see above */ }
}
export function lastCachedUser(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(USER_KEY) ?? ""; } catch { return ""; }
}

export function clearSnapshotCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch { /* see above */ }
}
