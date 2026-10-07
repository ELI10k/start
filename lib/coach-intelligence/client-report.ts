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
  overview: Readonly<{ status: string; statusTone: "positive" | "attention" | "neutral"; focus: string; coverage: string; highlights: readonly ReportFact[] }>;
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
  workoutQuality?: Readonly<{
    sessions: readonly { date: string; volume: number; durationSeconds: number; difficulty: number | null; energy: number | null }[];
    previousSessionCount: number;
    previousAverageVolume: number | null;
  }>;
  previousPeriod?: Readonly<{
    weighIns: readonly { date: string; weight: number }[];
    checkIns: readonly { adherence: number | null; energy: number | null; sleep: number | null; hunger: number | null }[];
    steps: readonly number[];
    sleep: readonly number[];
    workoutsCompleted: number;
  }>;
  previousActions?: readonly string[];
  health?: Readonly<{
    steps: readonly { day: string; steps: number }[];
    sleep: readonly { day: string; minutes: number }[];
    stepGoal: number;
    sleepGoalMinutes?: number;
    lastSyncAt: string | null;
    connection: "connected" | "not-connected";
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
const formatDate = (value: string) => value.split("-").reverse().join(".");
const averageNumbers = (values: readonly number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const coverageLabel = (count: number, total: number) => `${count} מתוך ${total} ימים · ${Math.round(count / Math.max(1, total) * 100)}%`;
const confidenceLabel = (count: number, expected: number) => count >= expected * .7 ? "כיסוי טוב" : count >= expected * .4 ? "כיסוי חלקי" : "כיסוי נמוך";
const standardDeviation = (values: readonly number[]) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length));
};
const pearson = (pairs: readonly [number, number][]) => {
  if (pairs.length < 7) return null;
  const xMean = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const yMean = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  const numerator = pairs.reduce((sum, pair) => sum + (pair[0] - xMean) * (pair[1] - yMean), 0);
  const denominator = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair[0] - xMean) ** 2, 0) * pairs.reduce((sum, pair) => sum + (pair[1] - yMean) ** 2, 0));
  return denominator ? numerator / denominator : null;
};
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
    ? `${formatDate(input.period.start)} עד ${formatDate(input.period.end)} (${input.period.days} ימים)`
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
  facts.push({ label: "יעד קלורי", value: input.calorieTarget ? `${input.calorieTarget} קל׳` : "אין מספיק נתונים לחישוב" });
  facts.push({ label: "תוכנית אימונים", value: input.programName ?? "לא שויכה" });
  if (input.weighIns[0]) facts.push({ label: "משקל אחרון", value: `${input.weighIns[0].weight} ק״ג` });
  if (input.monthlyNutrition) {
    facts.push({ label: "ימי תזונה שדווחו", value: `${input.monthlyNutrition.daysReported} מתוך ${input.period?.days ?? 30}` });
    facts.push({ label: "ארוחות שסומנו בחודש", value: String(input.monthlyNutrition.mealsMarked) });
  } else if (input.hasMenu) facts.push({ label: "סימון ארוחות היום", value: `${input.menuCompletionPercent}%` });
  if (input.monthlyWorkouts) facts.push({ label: "אימונים בחודש", value: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} מתוכננים` });
  const qualitySessions=input.workoutQuality?.sessions??[];
  const recordedVolumes=qualitySessions.map((entry)=>entry.volume).filter((value)=>value>0);
  const averageVolume=averageNumbers(recordedVolumes);
  const recordedDifficulty=qualitySessions.map((entry)=>entry.difficulty).filter((value):value is number=>value!==null);
  if(qualitySessions.length) {
    facts.push({label:"נפח אימון ממוצע",value:recordedVolumes.length?`${averageVolume.toLocaleString("he-IL")} ק״ג על פני ${recordedVolumes.length} אימונים`:"לא תועד נפח"});
    facts.push({label:"קושי מורגש באימונים",value:recordedDifficulty.length?`${round(recordedDifficulty.reduce((sum,value)=>sum+value,0)/recordedDifficulty.length)}/5 על פני ${recordedDifficulty.length} אימונים`:"לא דווח"});
  }
  if(input.previousActions?.length) facts.push({label:"פעולות מהדוח הקודם",value:`${input.previousActions.length} פעולות לבדיקה חוזרת`});

  const healthDays = input.period?.days ?? 30;
  const stepRows = input.health?.steps ?? [];
  const sleepRows = input.health?.sleep ?? [];
  const stepAverage = averageNumbers(stepRows.map((entry) => entry.steps));
  const sleepAverageMinutes = averageNumbers(sleepRows.map((entry) => entry.minutes));
  const stepGoal = input.health?.stepGoal ?? 10000;
  const sleepGoal = input.health?.sleepGoalMinutes ?? 480;
  const stepGoalDays = stepRows.filter((entry) => entry.steps >= stepGoal).length;
  const sleepGoalDays = sleepRows.filter((entry) => entry.minutes >= sleepGoal).length;
  if (input.health) {
    facts.push({ label: "צעדים — ממוצע יומי", value: stepRows.length ? `${stepAverage.toLocaleString("he-IL")} מול יעד ${stepGoal.toLocaleString("he-IL")}` : "אין נתונים" });
    facts.push({ label: "כיסוי נתוני צעדים", value: `${coverageLabel(stepRows.length, healthDays)} · ${confidenceLabel(stepRows.length, healthDays)}` });
    facts.push({ label: "ימים שבהם יעד הצעדים הושג", value: `${stepGoalDays} מתוך ${stepRows.length} ימים מדווחים` });
    facts.push({ label: "משך שינה — ממוצע", value: sleepRows.length ? `${Math.floor(sleepAverageMinutes / 60)}:${String(sleepAverageMinutes % 60).padStart(2, "0")} שעות` : "אין נתונים" });
    facts.push({ label: "כיסוי נתוני שינה", value: `${coverageLabel(sleepRows.length, healthDays)} · ${confidenceLabel(sleepRows.length, healthDays)}` });
    facts.push({ label: "לילות שבהם יעד השינה הושג", value: `${sleepGoalDays} מתוך ${sleepRows.length} לילות מדווחים` });
  }

  if (!input.weighIns.length) missing.push("אין מדידות משקל");
  if (!input.checkIns.length) missing.push("אין צ׳ק־אינים");
  if (!input.hasMenu) missing.push("אין תפריט פעיל, ולכן אין נתוני עמידה בתזונה");
  if (!input.hasProgram) missing.push("אין תוכנית אימונים משויכת");
  if (!input.goalLabel) missing.push("לא הוגדרה מטרה תזונתית");
  if (!input.calorieTarget) missing.push("אין יעד קלורי מחושב — חסרים נתוני קליטה");
  if (!input.health || input.health.connection === "not-connected") missing.push("נתוני בריאות אינם מחוברים או טרם סונכרנו");
  else {
    if (!stepRows.length) missing.push("אין נתוני צעדים ב־30 הימים האחרונים");
    if (!sleepRows.length) missing.push("אין נתוני משך שינה ב־30 הימים האחרונים");
    if (stepRows.length > 0 && stepRows.length < healthDays * .4) missing.push(`כיסוי צעדים נמוך — ${stepRows.length} מתוך ${healthDays} ימים`);
    if (sleepRows.length > 0 && sleepRows.length < healthDays * .4) missing.push(`כיסוי שינה נמוך — ${sleepRows.length} מתוך ${healthDays} לילות`);
  }

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
      basis: `בין ${formatDate(previous.date)} (${previous.weight} ק״ג) ל-${formatDate(latest.date)} (${latest.weight} ק״ג)`,
    });
    const elapsedDays=Math.max(1,Math.round((new Date(`${latest.date}T12:00:00Z`).getTime()-new Date(`${previous.date}T12:00:00Z`).getTime())/86_400_000));
    const weeklyPercent=round(change/previous.weight*100*7/elapsedDays);
    facts.push({label:"קצב שינוי משקל",value:`${weeklyPercent>0?"+":""}${weeklyPercent}% ממשקל הגוף לשבוע`});
    if(input.goalLabel?.includes("חיטוב")&&Math.abs(weeklyPercent)>1) attention.push({text:"קצב הירידה במשקל מהיר ודורש בדיקת התאוששות וביצועים",basis:`${weeklyPercent}% ממשקל הגוף לשבוע בין ${formatDate(previous.date)} ל־${formatDate(latest.date)}`});
    if(input.goalLabel?.includes("מסה")&&weeklyPercent>0.75) attention.push({text:"קצב העלייה במשקל מהיר ביחס למטרת מסה מבוקרת",basis:`+${weeklyPercent}% ממשקל הגוף לשבוע`});
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
      basis: `בין ${formatDate(previousNavel.date)} ל-${formatDate(navelPoints[0].date)}`,
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

  const ratingTrend = (key: "energy" | "sleep" | "hunger", label: string, higherIsBetter: boolean) => {
    const scores = input.checkIns.map((entry) => entry[key]).filter((value): value is number => typeof value === "number");
    if (scores.length < 2) return;
    const midpoint = Math.ceil(scores.length / 2);
    const recent = round(scores.slice(0, midpoint).reduce((sum, value) => sum + value, 0) / midpoint);
    const earlierValues = scores.slice(midpoint);
    const earlier = round(earlierValues.reduce((sum, value) => sum + value, 0) / earlierValues.length);
    const change = recent - earlier;
    const improved = higherIsBetter ? change > 0 : change < 0;
    trends.push({ label, direction: change > 0 ? "up" : change < 0 ? "down" : "flat", outcome: change === 0 ? "neutral" : improved ? "positive" : "negative", detail: `${earlier} → ${recent} מתוך 10`, basis: `השוואת חצי החודש הראשון לחצי החודש האחרון · ${scores.length} צ׳ק־אינים` });
  };
  ratingTrend("energy", "אנרגיה מדווחת", true);
  ratingTrend("sleep", "איכות שינה מדווחת", true);
  ratingTrend("hunger", "רעב מדווח", false);

  const dailyTrend = (rows: readonly { day: string; value: number }[], label: string, unit: string, threshold: number) => {
    if (rows.length < 8) return;
    const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
    const midpoint = Math.ceil(sorted.length / 2);
    const earlier = averageNumbers(sorted.slice(0, midpoint).map((entry) => entry.value));
    const recent = averageNumbers(sorted.slice(midpoint).map((entry) => entry.value));
    const change = recent - earlier;
    trends.push({ label, direction: change > threshold ? "up" : change < -threshold ? "down" : "flat", outcome: change > threshold ? "positive" : change < -threshold ? "negative" : "neutral", detail: `${earlier.toLocaleString("he-IL")} → ${recent.toLocaleString("he-IL")} ${unit}`, basis: `השוואת ${midpoint} הימים המדווחים הראשונים ל־${sorted.length - midpoint} האחרונים` });
  };
  dailyTrend(stepRows.map((entry) => ({ day: entry.day, value: entry.steps })), "צעדים", "צעדים בממוצע", 250);
  dailyTrend(sleepRows.map((entry) => ({ day: entry.day, value: entry.minutes })), "משך שינה", "דקות בממוצע", 15);

  if(recordedVolumes.length>=4){
    const midpoint=Math.ceil(recordedVolumes.length/2);const earlier=averageNumbers(recordedVolumes.slice(0,midpoint));const recent=averageNumbers(recordedVolumes.slice(midpoint));const change=recent-earlier;
    trends.push({label:"נפח אימון",direction:change>averageVolume*.05?"up":change<averageVolume*-.05?"down":"flat",outcome:change>averageVolume*.05?"positive":change<averageVolume*-.05?"negative":"neutral",detail:`${earlier.toLocaleString("he-IL")} → ${recent.toLocaleString("he-IL")} ק״ג`,basis:`השוואת ${midpoint} האימונים הראשונים ל־${recordedVolumes.length-midpoint} האחרונים`});
  }
  const previous=input.previousPeriod;
  const compareAverage=(label:string,current:readonly number[],prior:readonly number[],unit:string,higherIsBetter=true)=>{
    if(current.length<2||prior.length<2)return;const now=averageNumbers(current);const before=averageNumbers(prior);const change=now-before;
    trends.push({label:`${label} מול החודש הקודם`,direction:change>0?"up":change<0?"down":"flat",outcome:change===0?"neutral":higherIsBetter===(change>0)?"positive":"negative",detail:`${before.toLocaleString("he-IL")} → ${now.toLocaleString("he-IL")} ${unit}`,basis:`החודש הנוכחי מול 30 הימים שקדמו לו`});
  };
  if(previous){
    compareAverage("צעדים",stepRows.map((entry)=>entry.steps),previous.steps,"צעדים");
    compareAverage("משך שינה",sleepRows.map((entry)=>entry.minutes),previous.sleep,"דקות");
    if(previous.workoutsCompleted>0&&qualitySessions.length>0) trends.push({label:"אימונים מול החודש הקודם",direction:qualitySessions.length>previous.workoutsCompleted?"up":qualitySessions.length<previous.workoutsCompleted?"down":"flat",outcome:qualitySessions.length>previous.workoutsCompleted?"positive":qualitySessions.length<previous.workoutsCompleted?"negative":"neutral",detail:`${previous.workoutsCompleted} → ${qualitySessions.length} אימונים`,basis:"השוואת 30 הימים הנוכחיים ל־30 הימים שקדמו להם"});
  }
  const stepsDeviation=standardDeviation(stepRows.map((entry)=>entry.steps));
  const sleepDeviation=standardDeviation(sleepRows.map((entry)=>entry.minutes));
  if(stepRows.length>=12&&stepsDeviation>stepAverage*.45) attention.push({text:"הצעדים אינם עקביים בין הימים",basis:`סטיית תקן ${stepsDeviation.toLocaleString("he-IL")} סביב ממוצע ${stepAverage.toLocaleString("he-IL")} · ${stepRows.length} ימים`});
  if(sleepRows.length>=12&&sleepDeviation>75) attention.push({text:"משך השינה תנודתי בין הלילות",basis:`סטיית תקן ${sleepDeviation} דקות · ${sleepRows.length} לילות`});
  const sleepByDate=new Map(sleepRows.map((entry)=>[entry.day,entry.minutes]));
  const stepSleepCorrelation=pearson(stepRows.flatMap((entry)=>sleepByDate.has(entry.day)?[[entry.steps,sleepByDate.get(entry.day)!] as [number,number]]:[]));
  if(stepSleepCorrelation!==null&&Math.abs(stepSleepCorrelation)>=.45) facts.push({label:"קשר צעדים–שינה",value:`${stepSleepCorrelation>0?"קשר חיובי":"קשר הפוך"} בינוני (${round(stepSleepCorrelation)}) · תצפית בלבד`});

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
  if(recordedVolumes.length>=4){const first=averageNumbers(recordedVolumes.slice(0,Math.ceil(recordedVolumes.length/2)));const last=averageNumbers(recordedVolumes.slice(Math.ceil(recordedVolumes.length/2)));if(last>first*1.05)positives.push({text:"נפח האימון התקדם במהלך החודש",basis:`ממוצע ${first.toLocaleString("he-IL")} → ${last.toLocaleString("he-IL")} ק״ג`});if(last<first*.9)attention.push({text:"נפח האימון ירד במהלך החודש",basis:`ממוצע ${first.toLocaleString("he-IL")} → ${last.toLocaleString("he-IL")} ק״ג`});}
  if (stepRows.length >= healthDays * .4) {
    if (stepAverage >= stepGoal) positives.push({ text: "ממוצע הצעדים עומד ביעד", basis: `${stepAverage.toLocaleString("he-IL")} צעדים בממוצע מול יעד ${stepGoal.toLocaleString("he-IL")} · ${stepRows.length} ימי נתונים` });
    else attention.push({ text: "ממוצע הצעדים נמוך מהיעד", basis: `${stepAverage.toLocaleString("he-IL")} צעדים בממוצע מול יעד ${stepGoal.toLocaleString("he-IL")} · ${stepRows.length} ימי נתונים` });
  }
  if (sleepRows.length >= healthDays * .4) {
    if (sleepAverageMinutes >= sleepGoal) positives.push({ text: "משך השינה הממוצע עומד ביעד", basis: `${sleepAverageMinutes} דקות בממוצע מול יעד ${sleepGoal} · ${sleepRows.length} לילות` });
    else attention.push({ text: "משך השינה הממוצע נמוך מהיעד", basis: `${sleepAverageMinutes} דקות בממוצע מול יעד ${sleepGoal} · ${sleepRows.length} לילות` });
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
    else if (input.monthlyWorkouts.completionPercent >= 80) workouts.push({ text: "לבדוק נתוני משקלים, חזרות ורמת מאמץ לפני החלטה על התקדמות בעומס", basis: `${input.monthlyWorkouts.completed} מתוך ${input.monthlyWorkouts.expected} אימונים בחודש · ${input.monthlyWorkouts.completionPercent}% השלמה בלבד אינו מספיק להעלאת עומס` });
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
  if (stepRows.length >= healthDays * .4 && stepAverage < stepGoal) questions.push("מה יעזור להוסיף יותר תנועה וצעדים לשגרה היומית?");
  if (sleepRows.length >= healthDays * .4 && sleepAverageMinutes < sleepGoal) questions.push("מה מקצר בפועל את שעות השינה — שעת שינה, יקיצות או שעת קימה?");

  // --------------------------------------------------------------- 8. actions
  if (missing.length) actions.push({ text: "להשלים את הנתונים החסרים לפני החלטות", basis: missing.join(" · ") });
  if(input.previousActions?.length) actions.push({text:"לבדוק עם הלקוח אילו פעולות מהדוח הקודם בוצעו ומה הייתה ההשפעה",basis:input.previousActions.join(" · ")});
  if (sleepRows.length >= healthDays * .4 && sleepAverageMinutes < sleepGoal) actions.push({ text: `להוסיף ${Math.ceil((sleepGoal - sleepAverageMinutes) / 15) * 15} דקות שינה בממוצע במשך השבועיים הקרובים`, basis: `${sleepAverageMinutes} דקות בממוצע מול יעד ${sleepGoal} דקות` });
  if (stepRows.length >= healthDays * .4 && stepAverage < stepGoal) actions.push({ text: `להגיע לממוצע של לפחות ${stepGoal.toLocaleString("he-IL")} צעדים ב־5 ימים בכל שבוע`, basis: `${stepAverage.toLocaleString("he-IL")} צעדים בממוצע כעת · יעד ${stepGoal.toLocaleString("he-IL")}` });
  for (const item of [...nutrition, ...workouts]) if (actions.length < 4) actions.push(item);
  const priority=(point:ReportPoint)=>input.goalLabel?.includes("חיטוב")?(point.text.includes("תזונ")||point.text.includes("צעדים")?3:point.text.includes("שינה")?2:1):input.goalLabel?.includes("מסה")?(point.text.includes("אימון")||point.text.includes("עומס")?3:point.text.includes("שינה")?2:1):point.text.includes("נתונים החסרים")?3:1;
  actions.sort((a,b)=>priority(b)-priority(a));

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
    ...(stepRows.length >= healthDays * .4 && stepAverage >= stepGoal ? [`ממוצע הצעדים היה ${stepAverage.toLocaleString("he-IL")} ביום ועמד ביעד`] : []),
    ...(sleepRows.length >= healthDays * .4 && sleepAverageMinutes >= sleepGoal ? [`משך השינה הממוצע היה ${Math.floor(sleepAverageMinutes / 60)}:${String(sleepAverageMinutes % 60).padStart(2, "0")} שעות ועמד ביעד`] : []),
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
    ...(stepRows.length >= healthDays * .4 && stepAverage < stepGoal ? [`להעלות את הפעילות היומית — ממוצע הצעדים היה ${stepAverage.toLocaleString("he-IL")} מול יעד ${stepGoal.toLocaleString("he-IL")}`] : []),
    ...(sleepRows.length >= healthDays * .4 && sleepAverageMinutes < sleepGoal ? [`להאריך את משך השינה — הממוצע היה ${sleepAverageMinutes} דקות מול יעד ${sleepGoal}`] : []),
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

  const checkInCoverage = `${input.checkIns.length} צ׳ק־אינים`;
  const coverage = `משקל ${input.weighIns.length} · ${checkInCoverage} · תזונה ${input.monthlyNutrition?.daysReported ?? 0}/${healthDays} · צעדים ${stepRows.length}/${healthDays} · שינה ${sleepRows.length}/${healthDays}`;
  const statusTone = attention.length >= 3 ? "attention" as const : positives.length > attention.length ? "positive" as const : "neutral" as const;
  const overview = {
    status: statusTone === "attention" ? "דורש מיקוד" : statusTone === "positive" ? "מתקדם בכיוון טוב" : "תמונה מעורבת",
    statusTone,
    focus: actions[0]?.text ?? "להמשיך מעקב עקבי עד שיצטברו מספיק נתונים",
    coverage,
    highlights: facts.filter((fact) => ["משקל אחרון", "אימונים בחודש", "צעדים — ממוצע יומי", "משך שינה — ממוצע"].includes(fact.label)).slice(0, 4),
  };
  return { overview, facts, trends, missing, positives, attention, nutrition, workouts, questions, actions, referral, weeklyClientMessage, clientMessage };
}
