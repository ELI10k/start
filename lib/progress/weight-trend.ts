export type WeightTrendTone = "positive" | "negative" | "neutral";

export function weightTrendTone(
  changeKg: number,
  nutritionGoal: string | null | undefined,
): WeightTrendTone {
  if (changeKg === 0) return "neutral";

  const isCut = nutritionGoal === "gentle_cut" || nutritionGoal === "fast_cut";
  const isBulk = nutritionGoal === "lean_bulk" || nutritionGoal === "dirty_bulk";

  if (isCut) return changeKg < 0 ? "positive" : "negative";
  if (isBulk) return changeKg > 0 ? "positive" : "negative";
  return "neutral";
}
