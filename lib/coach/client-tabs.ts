// The client file's sections, as data.
//
// Kept out of the component so the list and the guard can be imported anywhere -
// including by tests, which cannot load a .tsx module.

export const CLIENT_TABS = [
  { id: "overview", label: "סקירה" },
  { id: "intake", label: "נתוני קליטה" },
  { id: "nutrition", label: "תזונה" },
  { id: "workouts", label: "אימונים" },
  { id: "progress", label: "Check-ins והתקדמות" },
  { id: "messages", label: "הודעות" },
  { id: "report", label: "דוח שיפור" },
  { id: "notes", label: "הערות מאמן" },
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number]["id"];

/** Anything that is not one of the eight falls back to the overview. */
export const isClientTab = (value: unknown): value is ClientTab =>
  typeof value === "string" && CLIENT_TABS.some((tab) => tab.id === value);
