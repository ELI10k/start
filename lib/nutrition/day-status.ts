export type NutritionDayStatus = "complete" | "missed" | "neutral";

export const NUTRITION_DAY_COMPLETION_RATIO = 0.9;

/**
 * A day is complete when its recorded intake reaches 90% of its calorie bank.
 * Today stays neutral because more food can still be recorded; only a finished
 * calendar day can be called missed. A missing target is neutral rather than a
 * guessed failure.
 */
export function nutritionDayStatus({
  day,
  today,
  calories,
  calorieTarget,
}: Readonly<{
  day: string;
  today: string;
  calories: number;
  calorieTarget: number | null | undefined;
}>): NutritionDayStatus {
  if (day >= today || !calorieTarget || calorieTarget <= 0) return "neutral";
  return calories >= calorieTarget * NUTRITION_DAY_COMPLETION_RATIO
    ? "complete"
    : "missed";
}
