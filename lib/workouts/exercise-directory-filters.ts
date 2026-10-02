import type { Exercise } from "./types.ts";

export const EXERCISE_CATEGORIES = ["משקולות", "מכונות", "משקל גוף", "TRX"] as const;
export type ExerciseCategoryFilter = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISE_DIFFICULTIES = [
  { value: "מתחילים", label: "מתחילים" },
  { value: "בינוני", label: "בינוני" },
  { value: "מתקדמים", label: "מתקדמת" },
] as const;

const MUSCLE_ORDER = [
  "חזה",
  "חזה עליון",
  "חזה אמצעי",
  "חזה תחתון",
  "גב",
  "רחב גבי",
  "טרפזים",
  "כתף קדמית",
  "כתף אמצעית",
  "כתף אחורית",
  "כתפיים",
  "יד קדמית",
  "יד אחורית",
  "אמות",
  "בטן",
  "שרירי ליבה",
  "מכופפי הירך",
  "ישבן",
  "ארבע ראשי",
  "המסטרינג",
  "מקרבים",
  "מרחיקים",
  "רגליים",
  "תאומים",
  "כל הגוף",
] as const;

const muscleRank = new Map<string, number>(MUSCLE_ORDER.map((muscle, index) => [muscle, index]));

export function sortMuscles(values: readonly string[]): string[] {
  return [...values].sort((a, b) => {
    const rankDifference = (muscleRank.get(a) ?? Number.MAX_SAFE_INTEGER) - (muscleRank.get(b) ?? Number.MAX_SAFE_INTEGER);
    return rankDifference || a.localeCompare(b, "he");
  });
}

export function matchesExerciseCategory(exercise: Exercise, selected: ExerciseCategoryFilter): boolean {
  const text = [exercise.name, exercise.category, exercise.equipment, ...exercise.sourceWorkbooks].filter(Boolean).join(" ").toLocaleLowerCase("he");

  if (selected === "TRX") return /\btrx\b/i.test(text);
  if (selected === "משקל גוף") return /משקל גוף/.test(text) && !/\btrx\b/i.test(text);

  const isMachine = /מכונ|כבל|פולי|סמית|לחיצת רגליים|פשיטת ברכיים|כפיפת ברכיים/.test(text);
  if (selected === "מכונות") return isMachine;

  return !isMachine && !/משקל גוף|\btrx\b/i.test(text);
}
