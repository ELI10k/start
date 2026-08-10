// Steps come from the platform's own health store - Apple HealthKit on iOS,
// Health Connect on Android. Both already merge phone, watch and ring into one
// figure per day, so START reads that figure rather than assembling its own.

export type HealthSource = "healthkit" | "health-connect" | "manual" | "test";

/** `day` is a calendar date in the client's own timezone, never a UTC instant. */
export type DailySteps = Readonly<{ day: string; steps: number; source: HealthSource; recordedAt: string }>;

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
