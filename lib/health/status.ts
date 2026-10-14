import { DEFAULT_SLEEP_GOAL_MINUTES, sleepByDay, stepsByDay } from "./calculations.ts";
import { describeSources } from "./sources.ts";
import type { HealthControllerState, HealthMetric } from "./sync-controller.ts";
import type { DailySleep, DailySteps, HealthSourceDetails } from "./types.ts";

// What a health card says about itself, as one of nine states - so the card
// never has to fade itself out to mean "something is not right". The figure
// stays readable in every one of them; only the status line changes.
export type HealthDisplayStatus =
  | "initializing" // native shell, plugin not attached yet
  | "prompt" // the client can be asked
  | "granted" // connected and fresh
  | "syncing" // a read is running
  | "denied" // refused; needs the Health app
  | "sync-error" // read or save failed; stored figure still shown
  | "empty" // connected, nothing recorded
  | "stale" // showing a stored figure that cannot be refreshed here
  | "unavailable"; // no health store on this device, and nothing stored

export type HealthAction = "connect" | "retry" | "settings" | "open" | "none";

export type HealthCardModel = Readonly<{
  status: HealthDisplayStatus;
  statusText: string;
  /** What a tap on the card does. */
  action: HealthAction;
  tone: "ok" | "muted" | "warn" | "error";
  /** "מקור: Oura דרך Apple Health" - null when nothing is shown yet. */
  sourceText: string | null;
  sourceNames: readonly string[];
  /** "עודכן היום 14:32" - null when there has never been a sync. */
  syncedText: string | null;
  hasValue: boolean;
}>;

const platformName = (platform: HealthControllerState["platform"]) => (platform === "android" ? "Health Connect" : "Apple Health");

const TIME = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" });
const DATE = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "Asia/Jerusalem" });
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jerusalem" });

export function formatSyncedAt(iso: string | undefined, now: number): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 1) return "עודכן עכשיו";
  if (minutes < 60) return `עודכן לפני ${minutes} דק׳`;
  const day = DAY_KEY.format(at);
  const today = DAY_KEY.format(now);
  const yesterday = DAY_KEY.format(now - 86_400_000);
  if (day === today) return `עודכן היום ${TIME.format(at)}`;
  if (day === yesterday) return `עודכן אתמול ${TIME.format(at)}`;
  return `עודכן ${DATE.format(at)}`;
}

/** The entry the card shows: today's steps; the most recent night of sleep. */
export function displayedEntry(state: HealthControllerState, metric: HealthMetric, today: string): DailySteps | DailySleep | undefined {
  if (metric === "steps") return stepsByDay(state.snapshot.entries).get(today);
  const nights = sleepByDay(state.snapshot.sleep);
  const latest = [...nights.keys()].filter((day) => day <= today).sort().at(-1);
  return latest ? nights.get(latest) : undefined;
}

function latestRecordedAt(entries: readonly (DailySteps | DailySleep)[]): string | undefined {
  return entries.map((entry) => entry.recordedAt).filter((value) => Number.isFinite(Date.parse(value))).sort().at(-1);
}

export function healthCardModel(state: HealthControllerState, metric: HealthMetric, today: string, now: number): HealthCardModel {
  const platform = platformName(state.platform);
  const entries = metric === "steps" ? state.snapshot.entries : state.snapshot.sleep;
  const entry = displayedEntry(state, metric, today);
  const hasValue = Boolean(entry && (metric === "steps" ? (entry as DailySteps).steps >= 0 : (entry as DailySleep).minutes > 0));
  const hasAnyData = entries.length > 0;
  const details: HealthSourceDetails | undefined = entry ? (state.liveDetails[metric][entry.day] ?? entry.details) : undefined;
  const sources = describeSources(details, entry?.source ?? (state.platform === "android" ? "health-connect" : "healthkit"));
  const syncedText = formatSyncedAt(state.lastSyncedAt[metric] ?? latestRecordedAt(entries), now);
  const error = state.errors[metric] ?? state.errors.load;

  const model = (status: HealthDisplayStatus, statusText: string, action: HealthAction, tone: HealthCardModel["tone"]): HealthCardModel => ({
    status,
    statusText,
    action,
    tone,
    sourceText: hasValue ? sources.text : null,
    sourceNames: hasValue ? sources.names : [],
    syncedText: hasAnyData || state.lastSyncedAt[metric] ? syncedText : null,
    hasValue,
  });

  if (state.syncing && state.bridge === "ready") return model("syncing", "מסנכרנים…", "none", "muted");
  if (state.bridge === "pending") return model("initializing", `מתחברים ל־${platform}…`, hasAnyData ? "open" : "none", "muted");
  if (state.bridge === "absent" || state.permission === "unavailable") {
    return hasAnyData
      ? model("stale", "נתון שמור · מתעדכן מהאפליקציה באייפון", "open", "muted")
      : model("unavailable", "זמין באפליקציה באייפון", "none", "muted");
  }
  if (error) return model("sync-error", "הסנכרון נכשל — נסו שוב", "retry", "error");
  if (state.permission === "denied") return model("denied", "נדרשת הרשאה", "settings", "warn");
  if (state.permission === "prompt" || state.permission === "unknown") {
    return state.permission === "unknown" && !state.loaded
      ? model("initializing", `מתחברים ל־${platform}…`, "none", "muted")
      : model("prompt", "לחצו לחיבור", "connect", "warn");
  }
  // HealthKit never says a read was refused - it returns nothing. So
  // "connected, nothing recorded" also covers a client who switched access
  // off, and the detail screen says where to check.
  if (!hasValue) return model("empty", "אין עדיין נתונים", "open", "muted");
  if (metric === "steps" && !state.lastSyncedAt.steps) return model("stale", "מוצג הנתון האחרון שנשמר", "retry", "muted");
  return model("granted", `מחובר ל־${platform}`, "open", "ok");
}

export const SLEEP_GOAL_MINUTES = DEFAULT_SLEEP_GOAL_MINUTES;

/** "9:53" - hours and minutes, the way a clock reads, without the word "hours" twice. */
export function formatClockHours(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
