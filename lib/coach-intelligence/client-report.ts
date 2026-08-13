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
export type ReportTrend = Readonly<{ label: string; direction: "up" | "down" | "flat"; detail: string; basis: string }>;
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
}>;

export type ReportInput = Readonly<{
  weighIns: readonly { date: string; weight: number; navel: number | null }[];
  checkIns: readonly {
    submittedAt: string; adherence: number | null; energy: number | null;
    sleep: number | null; hunger: number | null; workoutsCompleted: number | null;
    mealPlanDays: number | null; notes: string | null;
  }[];
  hasMenu: boolean;
  menuCompletionPercent: number;
  menuPlannedItems: number;
  hasProgram: boolean;
  programName: string | null;
  weeklyFrequency: number | null;
  weeklyCompletionPercent: number;
  lastWorkoutAt: string | null;
  goalLabel: string | null;
  calorieTarget: number | null;
}>;

// Words a client uses when something hurts. Matching one is not a diagnosis and
// is never treated as one - it only raises a referral.
const PAIN = /(כאב|כאבים|כואב|כואבת|פציעה|נפצע|צביטה|חד בגב|לא יכול להזיז)/;

const round = (value: number) => Math.round(value * 10) / 10;

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

  // ---------------------------------------------------------------- 1. facts
  facts.push({ label: "מדידות משקל", value: String(input.weighIns.length) });
  facts.push({ label: "צ׳ק־אינים", value: String(input.checkIns.length) });
  facts.push({ label: "מטרה", value: input.goalLabel ?? "לא הוגדרה" });
  facts.push({ label: "יעד קלורי", value: input.calorieTarget ? `${input.calorieTarget} קל׳` : "לא חושב" });
  facts.push({ label: "תוכנית אימונים", value: input.programName ?? "לא שויכה" });
  if (input.weighIns[0]) facts.push({ label: "משקל אחרון", value: `${input.weighIns[0].weight} ק״ג` });
  if (input.hasMenu) facts.push({ label: "סימון ארוחות היום", value: `${input.menuCompletionPercent}%` });

  if (!input.weighIns.length) missing.push("אין מדידות משקל");
  if (!input.checkIns.length) missing.push("אין צ׳ק־אינים");
  if (!input.hasMenu) missing.push("אין תפריט פעיל, ולכן אין נתוני עמידה בתזונה");
  if (!input.hasProgram) missing.push("אין תוכנית אימונים משויכת");
  if (!input.goalLabel) missing.push("לא הוגדרה מטרה תזונתית");
  if (!input.calorieTarget) missing.push("אין יעד קלורי מחושב — חסרים נתוני קליטה");

  // --------------------------------------------------------------- 2. trends
  // Two points or nothing. A single weigh-in has no direction.
  if (input.weighIns.length >= 2) {
    const [latest, previous] = input.weighIns;
    const change = round(latest.weight - previous.weight);
    trends.push({
      label: "משקל",
      direction: change > 0.2 ? "up" : change < -0.2 ? "down" : "flat",
      detail: `${change > 0 ? "+" : ""}${change} ק״ג`,
      basis: `בין ${previous.date} (${previous.weight} ק״ג) ל-${latest.date} (${latest.weight} ק״ג)`,
    });
  } else if (input.weighIns.length === 1) {
    missing.push("יש מדידת משקל אחת בלבד, ולכן אין עדיין מגמת משקל");
  }

  const navelPoints = input.weighIns.filter((entry) => entry.navel !== null);
  if (navelPoints.length >= 2) {
    const change = round((navelPoints[0].navel as number) - (navelPoints[1].navel as number));
    trends.push({
      label: "היקף טבור",
      direction: change > 0.5 ? "up" : change < -0.5 ? "down" : "flat",
      detail: `${change > 0 ? "+" : ""}${change} ס״מ`,
      basis: `בין ${navelPoints[1].date} ל-${navelPoints[0].date}`,
    });
  }

  const adherenceScores = input.checkIns.map((entry) => entry.adherence).filter((value): value is number => typeof value === "number");
  if (adherenceScores.length >= 2) {
    const change = adherenceScores[0] - adherenceScores[1];
    trends.push({
      label: "היצמדות מדווחת",
      direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
      detail: `${adherenceScores[1]} → ${adherenceScores[0]} מתוך 5`,
      basis: `שני הצ׳ק־אינים האחרונים`,
    });
  }

  // ------------------------------------------- 3/4. what is going well, and not
  const latestCheckIn = input.checkIns[0];
  if (latestCheckIn) {
    if ((latestCheckIn.adherence ?? 0) >= 4) positives.push({ text: "היצמדות גבוהה בצ׳ק־אין האחרון", basis: `היצמדות ${latestCheckIn.adherence}/5` });
    if ((latestCheckIn.energy ?? 0) >= 4) positives.push({ text: "רמת אנרגיה טובה", basis: `אנרגיה ${latestCheckIn.energy}/5` });
    if (latestCheckIn.sleep !== null && latestCheckIn.sleep <= 2) attention.push({ text: "שינה נמוכה בדיווח האחרון", basis: `שינה ${latestCheckIn.sleep}/5` });
    if (latestCheckIn.hunger !== null && latestCheckIn.hunger >= 4) attention.push({ text: "רעב גבוה מדווח", basis: `רעב ${latestCheckIn.hunger}/5` });
    if (latestCheckIn.adherence !== null && latestCheckIn.adherence <= 2) attention.push({ text: "היצמדות נמוכה בצ׳ק־אין האחרון", basis: `היצמדות ${latestCheckIn.adherence}/5` });
  }
  if (input.hasProgram && input.weeklyCompletionPercent >= 100) {
    positives.push({ text: "תוכנית האימונים הושלמה השבוע", basis: `${input.weeklyCompletionPercent}% מהאימונים המתוכננים` });
  }
  if (input.hasProgram && input.weeklyCompletionPercent < 50) {
    attention.push({ text: "פחות ממחצית האימונים השבועיים הושלמו", basis: `${input.weeklyCompletionPercent}% מתוך ${input.weeklyFrequency ?? "?"} בשבוע` });
  }
  if (input.hasMenu && input.menuPlannedItems > 0 && input.menuCompletionPercent < 50) {
    attention.push({ text: "רוב פריטי התפריט אינם מסומנים כנאכלו", basis: `${input.menuCompletionPercent}% מתוך ${input.menuPlannedItems} פריטים היום` });
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
  if (input.hasMenu && input.menuCompletionPercent < 50 && input.menuPlannedItems > 0) {
    nutrition.push({ text: "לפני שינוי ביעד — לבדוק מה מונע סימון של הארוחות", basis: `סימון ${input.menuCompletionPercent}% היום` });
  }
  if (!input.hasMenu) nutrition.push({ text: "לבנות תפריט, אחרת אין מה למדוד מול היעד", basis: "אין תפריט פעיל" });
  if (latestCheckIn?.hunger !== undefined && latestCheckIn?.hunger !== null && latestCheckIn.hunger >= 4) {
    nutrition.push({ text: "לשקול חלוקה מחדש של הארוחות או העלאת חלבון וסיבים", basis: `רעב ${latestCheckIn.hunger}/5 בצ׳ק־אין האחרון` });
  }

  if (!input.hasProgram) workouts.push({ text: "לשייך תוכנית אימונים", basis: "אין תוכנית משויכת" });
  else if (input.weeklyCompletionPercent < 50) {
    workouts.push({ text: "לשקול הפחתת תדירות שבועית לרמה שהלקוח באמת עומד בה", basis: `${input.weeklyCompletionPercent}% השלמה מול ${input.weeklyFrequency ?? "?"} אימונים בשבוע` });
  } else if (input.weeklyCompletionPercent >= 100 && input.hasProgram) {
    workouts.push({ text: "אפשר לשקול העלאת עומס או נפח", basis: `השלמה מלאה של ${input.weeklyFrequency ?? "?"} אימונים בשבוע` });
  }
  if (!input.lastWorkoutAt && input.hasProgram) {
    workouts.push({ text: "לברר מה עוצר את תחילת האימונים", basis: "אין אף אימון שהושלם" });
  }

  // ------------------------------------------------------------- 7. questions
  if (latestCheckIn?.sleep !== null && latestCheckIn?.sleep !== undefined && latestCheckIn.sleep <= 2) questions.push("מה משפיע על השינה בשבועות האחרונים?");
  if (input.hasMenu && input.menuCompletionPercent < 50) questions.push("אילו ארוחות הכי קשה לעמוד בהן, ולמה?");
  if (input.hasProgram && input.weeklyCompletionPercent < 50) questions.push("מה מונע להגיע לאימונים — זמן, עומס או משהו אחר?");
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

  return { facts, trends, missing, positives, attention, nutrition, workouts, questions, actions, referral };
}
