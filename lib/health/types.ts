// Steps come from the platform's own health store - Apple HealthKit on iOS,
// Health Connect on Android. Both already merge phone, watch and ring into one
// figure per day, so LIFE FIT reads that figure rather than assembling its own.

export type HealthSource = "healthkit" | "health-connect" | "manual" | "test";

/**
 * One writer behind a figure, exactly as the health store described it -
 * HKSourceRevision for the app, HKDevice for the hardware. Nothing here is
 * guessed: a ring is called a ring only because the store named it.
 */
export type HealthSourceDevice = Readonly<{
  sourceName?: string;
  sourceBundleIdentifier?: string;
  productType?: string;
  deviceName?: string;
  manufacturer?: string;
  model?: string;
  hardwareVersion?: string;
}>;

/** Which writers stood behind one day's figure. Display and debugging only - never part of the value. */
export type HealthSourceDetails = Readonly<{ devices: readonly HealthSourceDevice[] }>;

/** `day` is a calendar date in the client's own timezone, never a UTC instant. */
export type DailySteps = Readonly<{ day: string; steps: number; source: HealthSource; recordedAt: string; details?: HealthSourceDetails }>;
export type DailySleep = Readonly<{ day: string; minutes: number; source: HealthSource; recordedAt: string; details?: HealthSourceDetails }>;

/** A raw asleep interval as HealthKit stored it, before nights are assembled. */
export type SleepSample = Readonly<{ start: string; end: string; stage: "asleep" | "core" | "deep" | "rem"; device?: HealthSourceDevice }>;

/**
 * Why a sync did not finish. Kept apart from "no data" on purpose: an empty
 * read and a failed read used to both arrive as an empty array, so a broken
 * HealthKit query looked like a client who had not walked.
 */
export type HealthErrorKind = "bridge-unavailable" | "permission-denied" | "permission-check-failed" | "read-failed" | "persist-failed" | "load-failed";

export type HealthPreferences = Readonly<{ dailyStepGoal: number; lastSyncAt?: string; lastSyncSource?: HealthSource }>;

// Every state the permission can be in, including the two that are not the
// user's doing: the platform has no health store at all (a browser, an old
// Android), or the app has not asked yet.
export type HealthPermissionState = "unknown" | "unavailable" | "prompt" | "granted" | "denied";

export type HealthAvailability = Readonly<{
  source: HealthSource | "none";
  permission: HealthPermissionState;
  /** Why steps are not showing, in the client's language. Empty when they are. */
  reason: string;
}>;

// What a platform adapter has to provide. Keeping it this small is what lets the
// web build, the test provider and the eventual native bridge share one screen.
export type HealthProvider = Readonly<{
  source: HealthSource | "none";
  /** Whether this platform can serve steps at all, before any permission is asked. */
  isAvailable: () => Promise<boolean>;
  getPermission: () => Promise<HealthPermissionState>;
  requestPermission: () => Promise<HealthPermissionState>;
  /** Inclusive range of calendar days, oldest first. */
  readDailySteps: (fromDay: string, toDay: string) => Promise<readonly DailySteps[]>;
  /** Minutes actually asleep, grouped by the day on which the sleep started. */
  readDailySleep: (fromDay: string, toDay: string) => Promise<readonly DailySleep[]>;
}>;

export type StepsTrendPoint = Readonly<{ day: string; steps: number; metGoal: boolean }>;

export type StepsSummary = Readonly<{
  today: number;
  goal: number;
  percentOfGoal: number;
  weeklyAverage: number;
  trend: readonly StepsTrendPoint[];
  daysMetGoal: number;
  lastSyncAt?: string;
  lastSyncSource?: HealthSource;
  hasData: boolean;
}>;
