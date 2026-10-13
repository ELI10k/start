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

const EMPTY_NUTRITION = { calories: 0, protein: 0, carbohydrates: 0, fat: 0 } as const;

function shiftDay(day: string, delta: number): string {
  const value = new Date(`${day}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + delta);
  return value.toISOString().slice(0, 10);
}

/** The calendar week containing `anchorDay`, ordered from Sunday through Saturday. */
export function calendarNutritionWeek(days: readonly DailyNutritionTotal[], anchorDay: string): readonly DailyNutritionTotal[] {
  const anchor = new Date(`${anchorDay}T12:00:00Z`);
  const sunday = shiftDay(anchorDay, -anchor.getUTCDay());
  const byDay = new Map(days.map((day) => [day.day, day]));
  return Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(sunday, index);
    return byDay.get(day) ?? { day, ...EMPTY_NUTRITION };
  });
}

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
