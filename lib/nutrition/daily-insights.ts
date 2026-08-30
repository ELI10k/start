export type NutritionFigures = Readonly<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}>;

export type DailyNutritionInsightInput = Readonly<{
  eaten: NutritionFigures;
  targets: Partial<NutritionFigures>;
  answeredMeals: number;
  unansweredMeals: number;
  measuredOutsideItems: number;
  unmeasuredOutsideItems: number;
  isToday: boolean;
  behavior?: Readonly<{
    week: Readonly<{ daysReported: number; mealsMarked: number; mealsSkipped: number; measuredOutsideItems: number; unmeasuredOutsideItems: number }>;
    month: Readonly<{ daysReported: number; mealsMarked: number; mealsSkipped: number; measuredOutsideItems: number; unmeasuredOutsideItems: number }>;
  }>;
}>;

export type DailyNutritionInsights = Readonly<{
  preserve: readonly string[];
  improve: readonly string[];
}>;

const positive = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * A short, deterministic nutrition review made only from the client's day.
 * It deliberately avoids diagnoses and does not criticise an unfinished day
 * for food that is still planned for later.
 */
export function dailyNutritionInsights(input: DailyNutritionInsightInput): DailyNutritionInsights {
  const preserve: string[] = [];
  const improve: string[] = [];
  const caloriesTarget = input.targets.calories;
  const proteinTarget = input.targets.protein;
  const behavior = input.behavior;

  if (behavior?.week.daysReported) {
    preserve.push(`השבוע נרשמה תזונה ב-${behavior.week.daysReported} מתוך 7 ימים, עם ${behavior.week.mealsMarked} ארוחות שסומנו.`);
  }
  if (behavior && behavior.month.daysReported >= 15) {
    preserve.push(`בחודש האחרון נשמר מעקב תזונה ב-${behavior.month.daysReported} מתוך 30 ימים.`);
  }

  if (input.answeredMeals > 0) {
    preserve.push(`${input.answeredMeals} ארוחות כבר עודכנו ונכנסו לסיכום היומי.`);
  }
  if (input.measuredOutsideItems > 0) {
    preserve.push(`${input.measuredOutsideItems} פריטים מחוץ לתפריט נרשמו עם ערכים מלאים.`);
  }
  if (positive(caloriesTarget) && input.eaten.calories > 0 && input.eaten.calories <= caloriesTarget * 1.05) {
    preserve.push(`הקלוריות שנרשמו נמצאות במסגרת היומית: ${Math.round(input.eaten.calories)} מתוך ${Math.round(caloriesTarget)} קל׳.`);
  }
  if (positive(proteinTarget) && input.eaten.protein >= proteinTarget * 0.8) {
    preserve.push(`נרשמו ${Math.round(input.eaten.protein)} גרם חלבון מתוך יעד של ${Math.round(proteinTarget)} גרם.`);
  }

  if (input.unmeasuredOutsideItems > 0) {
    improve.push(`להשלים ערכים ל-${input.unmeasuredOutsideItems} פריטים שנרשמו מחוץ לתפריט כדי שהסיכום יהיה מדויק.`);
  }
  if (behavior?.week.unmeasuredOutsideItems) {
    improve.push(`השבוע נשמרו ${behavior.week.unmeasuredOutsideItems} פריטים ללא ערכים; השלמתם תשפר את דיוק הדוח.`);
  }
  if (behavior && behavior.month.daysReported > 0 && behavior.month.daysReported < 15) {
    improve.push(`בחודש האחרון נרשמה תזונה רק ב-${behavior.month.daysReported} ימים; כדאי לעדכן באופן עקבי יותר.`);
  }
  if (positive(caloriesTarget) && input.eaten.calories > caloriesTarget * 1.05) {
    improve.push(`נרשמה חריגה של ${Math.round(input.eaten.calories - caloriesTarget)} קל׳ מהמסגרת היומית.`);
  }
  if (input.unansweredMeals > 0) {
    improve.push(`${input.unansweredMeals} ארוחות עדיין לא סומנו${input.isToday ? " היום" : " ביום הזה"}.`);
  } else if (positive(proteinTarget) && input.eaten.protein < proteinTarget * 0.8) {
    improve.push(`נרשמו ${Math.round(input.eaten.protein)} גרם חלבון מתוך יעד של ${Math.round(proteinTarget)} גרם.`);
  }

  return { preserve: preserve.slice(0, 3), improve: improve.slice(0, 3) };
}
