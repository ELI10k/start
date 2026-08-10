import { countPhrase, factCoverage, hasAnyFacts, percent, type WeeklyFacts } from "./weekly-facts.ts";

// The deterministic writer. Every line it produces names a number that came from
// the week it is describing, which is what stops a summary reading like a
// horoscope. Three rules hold throughout:
//
//   - Nothing is said about a signal the client did not report.
//   - Nothing is inferred about health. A weight change is a weight change; it
//     is never a diagnosis, a cause or a warning.
//   - When there is too little to go on, that is the summary.

export type WeeklySummary = Readonly<{
  status: "ready" | "insufficient_data";
  provider: string;
  wentWell: readonly string[];
  needsWork: readonly string[];
  actions: readonly string[];
  facts: WeeklyFacts;
}>;

export const INSUFFICIENT_LINE = "לא נרשמו השבוע מספיק נתונים כדי לכתוב סיכום. אימונים, ארוחות, משקל או צ׳ק-אין יופיעו כאן בשבוע הבא.";

export function composeWeeklySummary(facts: WeeklyFacts, provider = "rules"): WeeklySummary {
  if (!hasAnyFacts(facts)) {
    return { status: "insufficient_data", provider, wentWell: [], needsWork: [], actions: [], facts };
  }

  const wentWell: string[] = [];
  const needsWork: string[] = [];
  const actions: string[] = [];

  const { workouts, nutrition, steps, weight, measurements, checkIns } = facts;

  if (workouts) {
    const rate = percent(workouts.completed, workouts.planned);
    if (workouts.planned > 0 && workouts.completed >= workouts.planned) {
      wentWell.push(`השלמת את כל ${countPhrase(workouts.planned, "האימון", "האימונים")} שתוכננו השבוע.`);
    } else if (rate >= 70) {
      wentWell.push(`השלמת ${workouts.completed} מתוך ${workouts.planned} אימונים (${rate}%).`);
    } else if (workouts.planned > 0) {
      needsWork.push(`הושלמו ${workouts.completed} מתוך ${workouts.planned} אימונים (${rate}%).`);
      actions.push(`לקבוע מראש את הימים של ${countPhrase(workouts.planned - workouts.completed, "האימון", "האימונים")} שנותרו, לפני תחילת השבוע.`);
    }
    if (workouts.skipped > 0) needsWork.push(`דילגת על ${countPhrase(workouts.skipped, "תרגיל", "תרגילים")} במהלך האימונים.`);
    if (workouts.previousCompleted !== undefined && workouts.completed > workouts.previousCompleted) {
      wentWell.push(`עלייה מ-${workouts.previousCompleted} אימונים בשבוע שעבר ל-${workouts.completed} השבוע.`);
    }
    if (workouts.volumeKg > 0) wentWell.push(`נפח האימונים השבוע: ${Math.round(workouts.volumeKg).toLocaleString("he-IL")} ק״ג.`);
  }

  if (nutrition) {
    const rate = percent(nutrition.mealsEaten, nutrition.mealsPlanned);
    if (nutrition.daysReported >= 6) wentWell.push(`דיווחת תזונה ב-${countPhrase(nutrition.daysReported, "יום", "ימים")} השבוע.`);
    else if (nutrition.daysReported <= 3) {
      needsWork.push(`תזונה דווחה ב-${countPhrase(nutrition.daysReported, "יום", "ימים")} בלבד מתוך שבעה.`);
      actions.push("לסמן ״נאכל״ או ״לא נאכל״ בסוף כל יום, גם ביום שלא עבר לפי התוכנית.");
    }
    if (nutrition.mealsPlanned > 0 && rate >= 80) wentWell.push(`${rate}% מהארוחות שתוכננו סומנו כנאכלו.`);
    else if (nutrition.mealsPlanned > 0 && rate < 60) {
      needsWork.push(`${rate}% בלבד מהארוחות שתוכננו סומנו כנאכלו.`);
      actions.push("לבחור את הארוחה אחת שנפלה הכי הרבה פעמים השבוע ולהכין אותה מראש.");
    }
    if (nutrition.freeCalorieDays >= 4) needsWork.push(`קלוריות חופשיות נוצלו ב-${countPhrase(nutrition.freeCalorieDays, "יום", "ימים")}.`);
  }

  if (steps) {
    if (steps.daysReported === 0) {
      // Nothing to praise or criticise - the phone simply did not report.
    } else if (steps.daysMetGoal >= 5) {
      wentWell.push(`עמדת ביעד הצעדים ב-${countPhrase(steps.daysMetGoal, "יום", "ימים")}, בממוצע ${steps.average.toLocaleString("he-IL")} צעדים.`);
    } else if (steps.average < steps.goal * 0.7) {
      needsWork.push(`ממוצע הצעדים היומי היה ${steps.average.toLocaleString("he-IL")} מול יעד ${steps.goal.toLocaleString("he-IL")}.`);
      actions.push("להוסיף הליכה קצרה בימים שאין בהם אימון, כדי לצמצם את הפער מול היעד היומי.");
    }
    if (steps.previousAverage !== undefined && steps.average > steps.previousAverage * 1.1) {
      wentWell.push(`הצעדים עלו מ-${steps.previousAverage.toLocaleString("he-IL")} בממוצע בשבוע שעבר ל-${steps.average.toLocaleString("he-IL")}.`);
    }
  }

  // Weight is reported, never interpreted. No cause, no target, no verdict.
  if (weight) {
    if (weight.entries === 0) {
      needsWork.push("לא נרשמה שקילה השבוע.");
      actions.push("להישקל פעם אחת בשבוע, באותו יום ובאותה שעה.");
    } else if (weight.changeKg !== undefined && Math.abs(weight.changeKg) >= 0.1) {
      const direction = weight.changeKg > 0 ? "עלייה" : "ירידה";
      wentWell.push(`נרשמו ${countPhrase(weight.entries, "שקילה", "שקילות")}. ${direction} של ${Math.abs(weight.changeKg).toFixed(1)} ק״ג מול השבוע הקודם.`);
    } else {
      wentWell.push(`נרשמו ${countPhrase(weight.entries, "שקילה", "שקילות")} השבוע.`);
    }
  }

  if (measurements?.entries) {
    wentWell.push(measurements.changedSites.length
      ? `עודכנו היקפים: ${measurements.changedSites.join(", ")}.`
      : `נרשמו ${countPhrase(measurements.entries, "מדידת היקפים", "מדידות היקפים")}.`);
  }

  if (checkIns) {
    if (checkIns.submitted > 0) wentWell.push(`הוגש צ׳ק-אין${checkIns.reviewed > 0 ? " והמאמן הגיב עליו" : ", ממתין לתגובת המאמן"}.`);
    else {
      needsWork.push("לא הוגש צ׳ק-אין השבוע.");
      actions.push("להגיש צ׳ק-אין עד יום ראשון, כדי שהשבוע הבא ייבנה על נתונים עדכניים.");
    }
  }

  // A week with signals but nothing notable in either direction still gets an
  // honest line rather than filler praise.
  if (!wentWell.length && !needsWork.length) {
    return { status: "insufficient_data", provider, wentWell: [], needsWork: [], actions: [], facts };
  }

  // Written in words rather than digits on purpose: every figure in a summary
  // has to be traceable to the week, and this one describes the summary itself.
  const coverage = factCoverage(facts);
  if (coverage.sparse) {
    needsWork.push(`הסיכום נכתב מ${coverage.present === 1 ? "מקור נתונים אחד" : "שני מקורות נתונים"} בלבד.`);
  }

  // Two or three actions. More than three is a list nobody follows.
  if (!actions.length) actions.push("לשמור על אותה מסגרת שבועית, ולהוסיף אימון אחד לשבוע הבא.");

  return {
    status: "ready",
    provider,
    wentWell: wentWell.slice(0, 4),
    needsWork: needsWork.slice(0, 4),
    actions: actions.slice(0, 3),
    facts,
  };
}
