export type DailyNutritionTotal = Readonly<{
  day: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}>;

export type NutritionTargets = Readonly<{
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
}>;

export function nutritionMacroPercentages(total: Pick<DailyNutritionTotal, "protein" | "carbohydrates" | "fat">) {
  const energy = {
    protein: total.protein * 4,
    carbohydrates: total.carbohydrates * 4,
    fat: total.fat * 9,
  };
  const sum = energy.protein + energy.carbohydrates + energy.fat;
  if (!sum) return { protein: 0, carbohydrates: 0, fat: 0 };
  const protein = Math.round((energy.protein / sum) * 100);
  const carbohydrates = Math.round((energy.carbohydrates / sum) * 100);
  return { protein, carbohydrates, fat: 100 - protein - carbohydrates };
}

export function nutritionTargetPercentages(targets: NutritionTargets) {
  return nutritionMacroPercentages({
    protein: targets.protein ?? 0,
    carbohydrates: targets.carbohydrates ?? 0,
    fat: targets.fat ?? 0,
  });
}

export function sumNutrition(days: readonly DailyNutritionTotal[]) {
  return days.reduce(
    (total, day) => ({
      calories: total.calories + day.calories,
      protein: total.protein + day.protein,
      carbohydrates: total.carbohydrates + day.carbohydrates,
      fat: total.fat + day.fat,
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
  );
}
