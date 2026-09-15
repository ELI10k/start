// The coach's working report, assembled from the client's own records.
//
// It is deliberately not a generator. Everything here is either a number the
// database holds or a statement derived from two or more of them, and every
// recommendation carries the figures it came from. The weekly summary that the
// AI coach writes is folded in where it exists, under its own heading, so a
// coach can always tell which lines were counted and which were written.
//
// Three rules run through all of it:
//   - a trend needs at least two points in time; one measurement is a number
//   - nothing is said about food, pain or training that the client did not report
//   - nothing here is a diagnosis, and a reported pain becomes a referral

export type ReportFact = Readonly<{ label: string; value: string }>;
export type ReportTrend = Readonly<{ label: string; direction: "up" | "down" | "flat"; outcome: "positive" | "negative" | "neutral"; detail: string; basis: string }>;
export type ReportPoint = Readonly<{ text: string; basis: string }>;

export type ClientReport = Readonly<{
  facts: readonly ReportFact[];
  trends: readonly ReportTrend[];
  missing: readonly string[];
  positives: readonly ReportPoint[];
  attention: readonly ReportPoint[];
  nutrition: readonly ReportPoint[];
  workouts: readonly ReportPoint[];
  questions: readonly string[];
  actions: readonly ReportPoint[];
  referral: string | null;
  weeklyClientMessage: string | null;
  clientMessage: string;
}>;

// Check-in ratings run 1-10 (202607280002). Four and below is the bottom of the
// scale; eight and above is the top of it.
const LOW_RATING = 4;
const HIGH_RATING = 8;

export type ReportInput = Readonly<{
  clientName?: string;
  weighIns: readonly { date: string; weight: number; navel: number | null }[];
  checkIns: readonly {
    submittedAt: string; adherence: number | null; energy: number | null;
    sleep: number | null; hunger: number | null; workoutsCompleted: number | null;
    mealPlanDays: number | null; notes: string | null;
  }[];
  hasMenu: boolean;
  menuCompletionPercent: number;
  menuPlannedMeals: number;
  hasProgram: boolean;
  programName: string | null;
  weeklyFrequency: number | null;
  weeklyCompletionPercent: number;
  lastWorkoutAt: string | null;
  goalLabel: string | null;
  calorieTarget: number | null;
  period?: Readonly<{ start: string; end: string; days: number }>;
  monthlyNutrition?: Readonly<{
    daysReported: number;
    mealsMarked: number;
    mealsEaten: number;
    mealsSkipped: number;
    outsideItems: number;
  }>;
  weeklyNutrition?: Readonly<{
    daysReported: number;
    mealsMarked: number;
    mealsEaten: number;
    mealsSkipped: number;
    outsideItems: number;
  }>;
  monthlyWorkouts?: Readonly<{
    completed: number;
    skipped: number;
    expected: number;
    completionPercent: number;
  }>;
  lifetimeProgress?: Readonly<{
    startDate: string;
    latestDate: string;
    startWeight: number;
    latestWeight: number;
    weightChange: number;
    startNavel: number | null;
    latestNavel: number | null;
    navelChange: number | null;
  }>;
}>;

// Words a client uses when something hurts. Matching one is not a diagnosis and
// is never treated as one - it only raises a referral.
const PAIN = /(כאב|כאבים|כואב|כואבת|פציעה|נפצע|צביטה|חד בגב|לא יכול להזיז)/;

const round = (value: number) => Math.round(value * 10) / 10;
const goalOutcome = (label: string | null, direction: "up" | "down" | "flat") => {
  if (direction === "flat") return "neutral" as const;
  if (label?.includes("חיטוב")) return direction === "down" ? "positive" as const : "negative" as const;
  if (label?.includes("מסה")) return direction === "up" ? "positive" as const : "negative" as const;
  return "neutral" as const;
};

export function buildClientReport(input: ReportInput): ClientReport {
  const facts: ReportFact[] = [];
  const trends: ReportTrend[] = [];
  const missing: string[] = [];
  const positives: ReportPoint[] = [];
  const attention: ReportPoint[] = [];
  const nutrition: ReportPoint[] = [];
  const workouts: ReportPoint[] = [];
  const questions: string[] = [];
  const actions: ReportPoint[] = [];
  const monthly = Boolean(input.period);
  const periodLabel = input.period
    ? `${input.period.start} עד ${input.period.end} (${input.period.days} ימים)`
    : null;
  const average = (key: "adherence" | "energy" | "sleep" | "hunger") => {
    const values = input.checkIns
      .map((entry) => entry[key])
      .filter((value): value is number => typeof value === "number");
    return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  };

  // ---------------------------------------------------------------- 1. facts
  if (periodLabel) facts.push({ label: "תקופת הניתוח", value: periodLabel });
  facts.push({ label: monthly ? "מדידות משקל בחודש" : "מדידות משקל", value: String(input.weighIns.length) });
  facts.push({ label: monthly ? "צ׳ק־אינים בחודש" : "צ׳ק־אינים", value: String(input.checkIns.length) });
  facts.push({ label: "מטרה", value: input.goalLabel ?? "לא הוגדרה" });
  facts.push({ label: "יעד קלורי", value: input.calorieTarget ? `${input.calorieTarget} קל׳` : "לא חושב" });
  facts.push({ label: "תוכנית אימונים", value: input.programName ?? "לא שויכה" });
  if (input.weighIns[0]) facts.push({ label: "משקל אחרון", value: `${input.weighIns[0].weight} ק״ג` });
  if (input.monthlyNutrition) {
    facts.push({ label: "ימי תזונה שדווחו", value: `${input.monthlyNutrition.daysReported} מתוך ${input.period?.days ?? 30}` });
    facts.push({ label: "ארוחות שסומנו בחודש", value: String(input.monthlyNutrition.mealsMarked) });
  } else if (input.hasMenu) facts.push({ label: "סימון ארוחות היום", value: `${input.menuCompletionPercent}%` });
  if (input.monthlyWorkouts) facts.push({ label: "אימונים בחודש", value: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} מתוכננים` });

  if (!input.weighIns.length) missing.push("אין מדידות משקל");
  if (!input.checkIns.length) missing.push("אין צ׳ק־אינים");
  if (!input.hasMenu) missing.push("אין תפריט פעיל, ולכן אין נתוני עמידה בתזונה");
  if (!input.hasProgram) missing.push("אין תוכנית אימונים משויכת");
  if (!input.goalLabel) missing.push("לא הוגדרה מטרה תזונתית");
  if (!input.calorieTarget) missing.push("אין יעד קלורי מחושב — חסרים נתוני קליטה");

  // --------------------------------------------------------------- 2. trends
  // Two points or nothing. A single weigh-in has no direction.
  if (input.weighIns.length >= 2) {
    const latest = input.weighIns[0];
    const previous = monthly ? input.weighIns[input.weighIns.length - 1] : input.weighIns[1];
    const change = round(latest.weight - previous.weight);
    trends.push({
      label: "משקל",
      direction: change > 0.2 ? "up" : change < -0.2 ? "down" : "flat",
      outcome: goalOutcome(input.goalLabel, change > 0.2 ? "up" : change < -0.2 ? "down" : "flat"),
      detail: `${change > 0 ? "+" : ""}${change} ק״ג`,
      basis: `בין ${previous.date} (${previous.weight} ק״ג) ל-${latest.date} (${latest.weight} ק״ג)`,
    });
  } else if (input.weighIns.length === 1) {
    missing.push("יש מדידת משקל אחת בלבד, ולכן אין עדיין מגמת משקל");
  }

  const navelPoints = input.weighIns.filter((entry) => entry.navel !== null);
  if (navelPoints.length >= 2) {
    const previousNavel = monthly ? navelPoints[navelPoints.length - 1] : navelPoints[1];
    const change = round((navelPoints[0].navel as number) - (previousNavel.navel as number));
    trends.push({
      label: "היקף טבור",
      direction: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
      outcome: input.goalLabel?.includes("חיטוב")
        ? goalOutcome(input.goalLabel, change > 0.5 ? "up" : change < -0.5 ? "down" : "flat")
        : change < -0.5 ? "positive" : "neutral",
      detail: `${change > 0 ? "+" : ""}${change} ס״מ`,
      basis: `בין ${previousNavel.date} ל-${navelPoints[0].date}`,
    });
  }

  const adherenceScores = input.checkIns.map((entry) => entry.adherence).filter((value): value is number => typeof value === "number");
  if (adherenceScores.length >= 2) {
    const midpoint = Math.ceil(adherenceScores.length / 2);
    const recent = monthly ? adherenceScores.slice(0, midpoint) : [adherenceScores[0]];
    const earlier = monthly ? adherenceScores.slice(midpoint) : [adherenceScores[1]];
    const recentAverage = round(recent.reduce((sum, value) => sum + value, 0) / recent.length);
    const earlierAverage = round(earlier.reduce((sum, value) => sum + value, 0) / earlier.length);
    const change = recentAverage - earlierAverage;
    trends.push({
      label: "היצמדות מדווחת",
      direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
      outcome: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
      detail: `${earlierAverage} → ${recentAverage} מתוך 10`,
      basis: monthly ? `השוואת חצי החודש הראשון לחצי החודש האחרון` : `שני הצ׳ק־אינים האחרונים`,
    });
  }

  // ------------------------------------------- 3/4. what is going well, and not
  const latestCheckIn = input.checkIns[0];
  const adherenceAverage = average("adherence");
  const energyAverage = average("energy");
  const sleepAverage = average("sleep");
  const hungerAverage = average("hunger");
  if (monthly && input.checkIns.length) {
    if (adherenceAverage !== null && adherenceAverage >= HIGH_RATING) positives.push({ text: "היצמדות גבוהה לאורך החודש", basis: `ממוצע ${adherenceAverage}/10 על פני ${input.checkIns.length} צ׳ק־אינים` });
    if (energyAverage !== null && energyAverage >= HIGH_RATING) positives.push({ text: "רמת אנרגיה טובה לאורך החודש", basis: `ממוצע ${energyAverage}/10 על פני ${input.checkIns.length} צ׳ק־אינים` });
    if (sleepAverage !== null && sleepAverage <= LOW_RATING) attention.push({ text: "השינה נמוכה באופן עקבי החודש", basis: `ממוצע ${sleepAverage}/10 על פני ${input.checkIns.length} צ׳ק־אינים` });
    if (hungerAverage !== null && hungerAverage >= HIGH_RATING) attention.push({ text: "רעב גבוה לאורך החודש", basis: `ממוצע ${hungerAverage}/10 על פני ${input.checkIns.length} צ׳ק־אינים` });
    if (adherenceAverage !== null && adherenceAverage <= LOW_RATING) attention.push({ text: "היצמדות נמוכה לאורך החודש", basis: `ממוצע ${adherenceAverage}/10 על פני ${input.checkIns.length} צ׳ק־אינים` });
  } else if (latestCheckIn) {
    if ((latestCheckIn.adherence ?? 0) >= HIGH_RATING) positives.push({ text: "היצמדות גבוהה בצ׳ק־אין האחרון", basis: `היצמדות ${latestCheckIn.adherence}/10` });
    if ((latestCheckIn.energy ?? 0) >= HIGH_RATING) positives.push({ text: "רמת אנרגיה טובה", basis: `אנרגיה ${latestCheckIn.energy}/10` });
    // Out of ten. Every rating moved to 1-10 in 202607280002 and this file kept
    // both the old thresholds and the old denominator, so "שינה <= 2" almost
    // never fired on a scale that starts being poor at 4, "רעב >= 4" fired for
    // any client who was not starving, and every basis line understated the
    // figure it was quoting by half.
    if (latestCheckIn.sleep !== null && latestCheckIn.sleep <= LOW_RATING) attention.push({ text: "שינה נמוכה בדיווח האחרון", basis: `שינה ${latestCheckIn.sleep}/10` });
    if (latestCheckIn.hunger !== null && latestCheckIn.hunger >= HIGH_RATING) attention.push({ text: "רעב גבוה מדווח", basis: `רעב ${latestCheckIn.hunger}/10` });
    if (latestCheckIn.adherence !== null && latestCheckIn.adherence <= LOW_RATING) attention.push({ text: "היצמדות נמוכה בצ׳ק־אין האחרון", basis: `היצמדות ${latestCheckIn.adherence}/10` });
  }
  if (input.monthlyWorkouts && input.monthlyWorkouts.completionPercent >= 80) {
    positives.push({ text: "עקביות טובה באימונים לאורך החודש", basis: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} אימונים · ${input.monthlyWorkouts.completionPercent}%` });
  } else if (input.monthlyWorkouts && input.monthlyWorkouts.completionPercent < 50) {
    attention.push({ text: "פחות ממחצית מאימוני החודש הושלמו", basis: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} אימונים · ${input.monthlyWorkouts.completionPercent}%` });
  } else if (input.hasProgram && input.weeklyCompletionPercent >= 100) {
    positives.push({ text: "תוכנית האימונים הושלמה השבוע", basis: `${input.weeklyCompletionPercent}% מהאימונים המתוכננים` });
  }
  if (input.monthlyNutrition) {
    const reportingPercent = Math.round((input.monthlyNutrition.daysReported / Math.max(1, input.period?.days ?? 30)) * 100);
    if (reportingPercent >= 70) positives.push({ text: "דיווח תזונתי עקבי לאורך החודש", basis: `${input.monthlyNutrition.daysReported} ימי דיווח מתוך ${input.period?.days ?? 30} · ${reportingPercent}%` });
    if (reportingPercent < 50) attention.push({ text: "חסר מספיק תיעוד תזונתי לניתוח אמין", basis: `${input.monthlyNutrition.daysReported} ימי דיווח מתוך ${input.period?.days ?? 30} · ${reportingPercent}%` });
    if (input.monthlyNutrition.mealsSkipped > 0) attention.push({ text: "ארוחות סומנו כלא נאכלו במהלך החודש", basis: `${input.monthlyNutrition.mealsSkipped} ארוחות מתוך ${input.monthlyNutrition.mealsMarked} שסומנו` });
  }
  if (!monthly && input.hasProgram && input.weeklyCompletionPercent < 50) {
    attention.push({ text: "פחות ממחצית האימונים השבועיים הושלמו", basis: `${input.weeklyCompletionPercent}% מתוך ${input.weeklyFrequency ?? "?"} בשבוע` });
  }
  if (!monthly && input.hasMenu && input.menuPlannedMeals > 0 && input.menuCompletionPercent < 50) {
    attention.push({ text: "רוב ארוחות היום אינן מסומנות", basis: `${input.menuCompletionPercent}% מתוך ${input.menuPlannedMeals} ארוחות היום` });
  }

  // ------------------------------------------------------- 5/6. what to change
  // Every line names the figures behind it. Where the figures are missing the
  // recommendation is not made at all.
  const weightTrend = trends.find((trend) => trend.label === "משקל");
  if (weightTrend && input.goalLabel) {
    nutrition.push({
      text: `לבדוק אם קצב שינוי המשקל תואם למטרה „${input.goalLabel}” לפני שינוי בקלוריות`,
      basis: `מגמת משקל ${weightTrend.detail} · ${weightTrend.basis}`,
    });
  }
  if (input.monthlyNutrition && input.monthlyNutrition.daysReported < 15) {
    nutrition.push({ text: "לפני שינוי בתפריט — לחזק דיווח יומי כדי לזהות דפוס אמיתי", basis: `${input.monthlyNutrition.daysReported} ימי תזונה מדווחים ב־${input.period?.days ?? 30} ימים` });
  } else if (input.hasMenu && input.menuCompletionPercent < 50 && input.menuPlannedMeals > 0) {
    nutrition.push({ text: "לפני שינוי ביעד — לבדוק מה מונע סימון של הארוחות", basis: `סימון ${input.menuCompletionPercent}% היום` });
  }
  if (!input.hasMenu) nutrition.push({ text: "לבנות תפריט, אחרת אין מה למדוד מול היעד", basis: "אין תפריט פעיל" });
  if ((monthly ? hungerAverage : latestCheckIn?.hunger) !== undefined && (monthly ? hungerAverage : latestCheckIn?.hunger) !== null && Number(monthly ? hungerAverage : latestCheckIn?.hunger) >= HIGH_RATING) {
    nutrition.push({ text: "לשקול חלוקה מחדש של הארוחות או העלאת חלבון וסיבים", basis: monthly ? `ממוצע רעב חודשי ${hungerAverage}/10` : `רעב ${latestCheckIn?.hunger}/10 בצ׳ק־אין האחרון` });
  }

  if (!input.hasProgram) workouts.push({ text: "לשייך תוכנית אימונים", basis: "אין תוכנית משויכת" });
  else if (input.monthlyWorkouts) {
    if (input.monthlyWorkouts.completionPercent < 50) workouts.push({ text: "להתאים את תדירות האימונים ליכולת ההתמדה בפועל", basis: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} אימונים בחודש · ${input.monthlyWorkouts.skipped} דולגו` });
    else if (input.monthlyWorkouts.completionPercent >= 80) workouts.push({ text: "אפשר לשקול התקדמות מדורגת בעומס או בנפח", basis: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} אימונים בחודש · ${input.monthlyWorkouts.completionPercent}%` });
  } else if (input.weeklyCompletionPercent < 50) {
    workouts.push({ text: "לשקול הפחתת תדירות שבועית לרמה שהלקוח באמת עומד בה", basis: `${input.weeklyCompletionPercent}% השלמה מול ${input.weeklyFrequency ?? "?"} אימונים בשבוע` });
  } else if (input.weeklyCompletionPercent >= 100 && input.hasProgram) {
    workouts.push({ text: "אפשר לשקול העלאת עומס או נפח", basis: `השלמה מלאה של ${input.weeklyFrequency ?? "?"} אימונים בשבוע` });
  }
  if (!input.lastWorkoutAt && input.hasProgram) {
    workouts.push({ text: "לברר מה עוצר את תחילת האימונים", basis: "אין אף אימון שהושלם" });
  }

  // ------------------------------------------------------------- 7. questions
  if ((monthly ? sleepAverage : latestCheckIn?.sleep) !== null && (monthly ? sleepAverage : latestCheckIn?.sleep) !== undefined && Number(monthly ? sleepAverage : latestCheckIn?.sleep) <= LOW_RATING) questions.push("מה משפיע על השינה במהלך החודש האחרון?");
  if (input.monthlyNutrition?.mealsSkipped || (!monthly && input.hasMenu && input.menuCompletionPercent < 50)) questions.push("אילו ארוחות הכי קשה לעמוד בהן, ולמה?");
  if ((input.monthlyWorkouts?.completionPercent ?? input.weeklyCompletionPercent) < 50 && input.hasProgram) questions.push("מה מנע להגיע לאימונים במהלך החודש — זמן, עומס או משהו אחר?");
  if (!input.checkIns.length) questions.push("האם יש חסם בהגשת הצ׳ק־אין השבועי?");
  if (weightTrend?.direction === "flat") questions.push("האם חל שינוי בהרגלים בשבועיים האחרונים?");

  // --------------------------------------------------------------- 8. actions
  if (missing.length) actions.push({ text: "להשלים את הנתונים החסרים לפני החלטות", basis: missing.join(" · ") });
  for (const item of [...nutrition, ...workouts].slice(0, 3)) actions.push(item);

  // ------------------------------------------------------------- the referral
  // Reported pain is never interpreted here. It is repeated back and sent on.
  const painful = input.checkIns.find((entry) => entry.notes && PAIN.test(entry.notes));
  const referral = painful
    ? "הלקוח דיווח על כאב בצ׳ק־אין. אין כאן אבחנה — יש להפנות לבדיקה אצל איש מקצוע רפואי לפני המשך העמסה."
    : null;

  const firstName = input.clientName?.trim().split(/\s+/)[0] || "אלוף";
  const lifetime = input.lifetimeProgress;
  const lifetimeDirection = lifetime
    ? lifetime.weightChange > 0.2 ? "up" : lifetime.weightChange < -0.2 ? "down" : "flat"
    : "flat";
  const lifetimeOutcome = goalOutcome(input.goalLabel, lifetimeDirection);
  const processStartLabel = lifetime?.startDate.split("-").reverse().join(".");
  const lifetimeLine = lifetime
    ? `מתחילת התהליך ב־${processStartLabel} ${lifetimeDirection === "down" ? `ירדת ${Math.abs(lifetime.weightChange)} ק״ג` : lifetimeDirection === "up" ? `עלית ${Math.abs(lifetime.weightChange)} ק״ג` : "שמרת על משקל יציב"} — מ־${lifetime.startWeight} ל־${lifetime.latestWeight} ק״ג${lifetime.navelChange !== null ? `, ובנוסף ${lifetime.navelChange < 0 ? `ירדת ${Math.abs(lifetime.navelChange)} ס״מ` : lifetime.navelChange > 0 ? `עלית ${Math.abs(lifetime.navelChange)} ס״מ` : "נשארת יציב"} בהיקף הטבור` : ""}`
    : null;
  const trendForClient = (trend: ReportTrend) => {
    const amount = trend.detail.replace(/^[-+]/, "");
    if (trend.label === "משקל") return `${trend.direction === "down" ? "ירידה" : trend.direction === "up" ? "עלייה" : "יציבות"} של ${amount} במשקל${trend.outcome === "positive" ? " — בדיוק בכיוון של המטרה שלנו" : ""}`;
    if (trend.label === "היקף טבור") return `${trend.direction === "down" ? "ירידה" : trend.direction === "up" ? "עלייה" : "יציבות"} של ${amount} בהיקף הטבור${trend.outcome === "positive" ? " — התקדמות יפה" : ""}`;
    return `ההיצמדות השתנתה מ־${trend.detail.replace(" → ", " ל־")}`;
  };
  const preservationText = [
    ...(lifetimeLine && lifetimeOutcome === "positive" ? [lifetimeLine] : []),
    ...trends.filter((trend) => trend.outcome === "positive").map(trendForClient),
    ...(input.monthlyWorkouts && input.monthlyWorkouts.completionPercent >= 80
      ? [`השלמת ${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} אימונים החודש — עקביות חזקה`]
      : []),
    ...(input.monthlyNutrition && input.monthlyNutrition.daysReported >= 24
      ? [`מילאת נתוני תזונה ב־${input.monthlyNutrition.daysReported} מתוך ${input.period?.days ?? 30} ימים — מעקב מצוין`]
      : []),
    ...(input.checkIns.length >= 4 ? [`מילאת ${input.checkIns.length} צ׳ק־אינים החודש ושמרת על מעקב רציף`] : []),
    ...(sleepAverage !== null && sleepAverage >= 7 ? [`ממוצע השינה החודשי היה ${sleepAverage}/10 — נתון טוב שכדאי לשמור עליו`] : []),
    ...positives.map((point) => point.text),
  ].filter((text, index, rows) => rows.indexOf(text) === index);
  const preservation = (preservationText.length ? preservationText : ["עצם המעקב והדיווח נותנים לנו בסיס טוב להמשיך לעבוד מדויק יותר"])
    .slice(0, 6)
    .map((text) => `✅ ${text}`);
  const improvementText = [
    ...(lifetimeLine && lifetimeOutcome === "negative" ? [`להחזיר את מגמת המשקל לכיוון המטרה שלנו. ${lifetimeLine}`] : []),
    ...trends.filter((trend) => trend.outcome === "negative").map(trendForClient),
    ...(input.monthlyWorkouts && input.monthlyWorkouts.completionPercent < 80
      ? [`להקפיד להשלים את האימונים המתוכננים ולמלא בסיום משקלים, חזרות ורמת מאמץ — החודש הושלמו ${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected}`]
      : []),
    ...(input.monthlyNutrition && input.monthlyNutrition.daysReported < 24
      ? [`למלא בכל יום מה נאכל מתוך התפריט, כמויות וארוחות שלא נאכלו — החודש מולאו ${input.monthlyNutrition.daysReported} מתוך ${input.period?.days ?? 30} ימים`]
      : []),
    ...(sleepAverage !== null && sleepAverage < 7 ? [`לתת יותר תשומת לב לשגרת השינה — הממוצע החודשי היה ${sleepAverage}/10`] : []),
    ...(monthly && input.checkIns.length < 4 ? [`למלא Check-in מלא בכל שבוע, כולל שינה, רעב, אנרגיה והיצמדות — החודש מולאו ${input.checkIns.length}`] : []),
    ...(adherenceAverage !== null && adherenceAverage < 8 ? [`לחזק את העקביות היומיומית — ממוצע ההיצמדות החודשי היה ${adherenceAverage}/10`] : []),
  ].filter((text, index, rows) => rows.indexOf(text) === index);
  const improvement = improvementText.slice(0, 6).map((text) => `🎯 ${text}`);
  const weeklyCheckIn = input.checkIns[0];
  const weeklyDate = weeklyCheckIn?.submittedAt.slice(0, 10).split("-").reverse().join(".");
  const weeklyGood = [
    weeklyCheckIn ? `מילאת את הצ׳ק־אין השבועי בזמן ונתת לי תמונה ברורה של השבוע` : null,
    typeof weeklyCheckIn?.adherence === "number" && weeklyCheckIn.adherence >= 8 ? `ההיצמדות השבועית הייתה ${weeklyCheckIn.adherence}/10 — עבודה חזקה` : null,
    typeof weeklyCheckIn?.energy === "number" && weeklyCheckIn.energy >= 8 ? `רמת האנרגיה הייתה ${weeklyCheckIn.energy}/10 — נתון מצוין` : null,
    typeof weeklyCheckIn?.sleep === "number" && weeklyCheckIn.sleep >= 8 ? `השינה הייתה ${weeklyCheckIn.sleep}/10 — תמשיך לשמור על השגרה הזאת` : null,
    input.hasProgram && input.weeklyCompletionPercent >= 80 ? `השלמת ${input.weeklyCompletionPercent}% מאימוני השבוע — עקביות יפה` : null,
    input.weeklyNutrition && input.weeklyNutrition.daysReported >= 6 ? `מילאת תזונה ב־${input.weeklyNutrition.daysReported} מתוך 7 ימים — מעקב מצוין` : null,
  ].filter((value): value is string => Boolean(value));
  const weeklyImprove = [
    typeof weeklyCheckIn?.adherence === "number" && weeklyCheckIn.adherence < 8 ? `לחזק את ההיצמדות לתוכנית — השבוע דירגת אותה ${weeklyCheckIn.adherence}/10` : null,
    typeof weeklyCheckIn?.sleep === "number" && weeklyCheckIn.sleep < 7 ? `לתת יותר תשומת לב לשינה — השבוע היא הייתה ${weeklyCheckIn.sleep}/10` : null,
    typeof weeklyCheckIn?.energy === "number" && weeklyCheckIn.energy < 7 ? `לשים לב לאנרגיה במהלך היום — השבוע היא הייתה ${weeklyCheckIn.energy}/10` : null,
    typeof weeklyCheckIn?.hunger === "number" && weeklyCheckIn.hunger >= 8 ? `לעדכן אותי בזמן כשיש רעב גבוה — השבוע הוא היה ${weeklyCheckIn.hunger}/10` : null,
    input.hasProgram && input.weeklyCompletionPercent < 80 ? `להשלים את האימונים המתוכננים ולמלא משקלים וחזרות — השבוע הושלמו ${input.weeklyCompletionPercent}%` : null,
    input.weeklyNutrition && input.weeklyNutrition.daysReported < 6 ? `למלא בכל יום מה נאכל, כמויות וארוחות שלא נאכלו — השבוע מולאו ${input.weeklyNutrition.daysReported} מתוך 7 ימים` : null,
  ].filter((value): value is string => Boolean(value));
  const weeklyClientMessage = weeklyCheckIn ? [
    `היי ${firstName}, מה נשמע?`,
    `עברתי על הצ׳ק־אין שמילאת ב־${weeklyDate} ועל נתוני השבוע האחרון.`,
    "",
    "דברים לשימור:",
    ...weeklyGood.slice(0, 5).map((text) => `✅ ${text}`),
    ...(weeklyImprove.length ? ["", "דברים לשיפור השבוע:", ...weeklyImprove.slice(0, 5).map((text) => `🎯 ${text}`)] : []),
    "",
    "המטרה השבוע היא להמשיך את מה שעובד ולשפר נקודה אחת בכל פעם. אני איתך, ממשיכים לעבוד 💪",
    "אלי",
  ].join("\n") : null;
  const clientMessage = [
    `היי ${firstName}, מה נשמע?`,
    "עברתי לעומק על החודש האחרון שלך ורוצה לעשות לך סדר:",
    "",
    "דברים לשימור:",
    ...preservation,
    "",
    "קודם כל כל הכבוד על העבודה וההשקעה. כל דבר טוב שעשית החודש הוא בסיס שאנחנו ממשיכים לבנות עליו.",
    ...(improvement.length ? ["", "דברים לשיפור:", ...improvement] : []),
    "",
    "המטרה שלנו לחודש הקרוב היא להמשיך את הדברים הטובים ולשפר כל פעם נקודה אחת, בלי לחפש מושלם. עקביות מנצחת הכול.",
    "אני איתך לאורך כל הדרך. ממשיכים לעבוד 💪",
    "אלי",
  ].join("\n");

  return { facts, trends, missing, positives, attention, nutrition, workouts, questions, actions, referral, weeklyClientMessage, clientMessage };
}
