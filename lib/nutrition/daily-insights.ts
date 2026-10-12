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
  eatenFoodNames?: readonly string[];
  progress?: Readonly<{
    measurements: number;
    spanDays: number;
    weightChange: number | null;
    navelChange: number | null;
  }>;
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

const difference = (actual: number, target: number) => Math.round(Math.abs(actual - target));
const meaningfullyLow = (actual: number, target: number) => actual < target * 0.9;
const meaningfullyHigh = (actual: number, target: number) => actual > target * 1.1;
const FRIED_FOOD = /מטוגן|מטוגנת|מטוגנים|שניצל|צ['׳]?יפס|סופגני|פלאפל/i;

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
  const carbsTarget = input.targets.carbs;
  const fatTarget = input.targets.fat;
  const behavior = input.behavior;
  const completeDay = input.unansweredMeals === 0 && input.answeredMeals > 0;
  const friedFoods = (input.eatenFoodNames ?? []).filter((name) => FRIED_FOOD.test(name));

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
  if (input.progress && input.progress.measurements >= 2 && input.progress.spanDays >= 14 && input.progress.weightChange !== null && input.progress.navelChange !== null && input.progress.weightChange <= 0 && input.progress.navelChange <= 0 && (input.progress.weightChange < 0 || input.progress.navelChange < 0)) {
    preserve.push("מגמת המשקל והיקף הטבור בתקופה שנבדקה תומכת בהמשך המסגרת הנוכחית.");
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
    improve.push(`שים לב: נרשמה חריגה של ${Math.round(input.eaten.calories - caloriesTarget)} קל׳ מהמסגרת היומית. כדאי לבדוק את הבחירות והכמויות בתוך הארוחות המתוכננות, בלי לקזז בארוחה אחרת באופן עצמאי.`);
  }
  if (input.unansweredMeals > 0) {
    improve.push(`${input.unansweredMeals} ארוחות עדיין לא סומנו${input.isToday ? " היום" : " ביום הזה"}.`);
  }

  if (completeDay) {
    if (positive(carbsTarget) && positive(fatTarget) && meaningfullyLow(input.eaten.carbs, carbsTarget) && meaningfullyHigh(input.eaten.fat, fatTarget)) {
      const friedCue = friedFoods.length
        ? " בין מה שנרשם הופיע גם מזון מטוגן, ולכן כדאי לשים לב במיוחד לחלופות אפויות או צלויות."
        : " בבחירות הבאות כדאי להעדיף בתוך הארוחות המתוכננות חלופות עם פחות שומן.";
      improve.push(`שים לב: הפחמימות נמוכות ב־${difference(input.eaten.carbs, carbsTarget)} גרם מהיעד, אבל השומן גבוה ב־${difference(input.eaten.fat, fatTarget)} גרם. אין צורך להפחית פחמימות נוספות.${friedCue}`);
    } else if (positive(fatTarget) && meaningfullyHigh(input.eaten.fat, fatTarget)) {
      const friedCue = friedFoods.length
        ? " בין מה שנרשם הופיע גם מזון מטוגן; בבחירות הבאות כדאי להעדיף את החלופה האפויה או הצלויה שבתפריט."
        : " בבחירות הבאות כדאי להעדיף בתוך הארוחות המתוכננות חלופות עם פחות שומן.";
      improve.push(`שים לב: השומן שנרשם גבוה ב־${difference(input.eaten.fat, fatTarget)} גרם מהיעד.${friedCue}`);
    } else if (positive(carbsTarget) && meaningfullyHigh(input.eaten.carbs, carbsTarget)) {
      improve.push(`שים לב: הפחמימות שנרשמו גבוהות ב־${difference(input.eaten.carbs, carbsTarget)} גרם מהיעד. בבחירות הבאות כדאי להיצמד לכמויות ולחלופות שכבר הוגדרו בתפריט.`);
    }
    if (positive(proteinTarget) && meaningfullyLow(input.eaten.protein, proteinTarget)) {
      improve.push(`שים לב: החלבון שנרשם נמוך ב־${difference(input.eaten.protein, proteinTarget)} גרם מהיעד. בבחירות הבאות כדאי להעדיף את חלופות החלבון שכבר קיימות בארוחות, בלי להוסיף ארוחה או להגדיל את סך האוכל.`);
    }
  }

  if (input.progress && input.progress.measurements >= 2 && input.progress.spanDays >= 14 && input.progress.weightChange !== null && input.progress.navelChange !== null && input.progress.weightChange > 0 && input.progress.navelChange > 0) {
    improve.push("גם המשקל וגם היקף הטבור עלו בתקופה שנבדקה. זהו איתות לבחון את דפוס האכילה לאורך השבוע, ולא להסיק מסקנה או לקצץ מזון לפי יום אחד.");
  }

  return { preserve: preserve.slice(0, 3), improve: improve.slice(0, 3) };
}
