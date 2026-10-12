import type { ExerciseSetResult } from "./types.ts";
import { progressionDecision } from "./challenge.ts";

// What the workout just said, and what to do with it next time.
//
// Every line below is read off what was recorded: the sets, the weights, the
// duration, the prescribed rest, and the same exercise's previous session.
// Nothing is generated to fill space - a workout with nothing notable in it
// produces one line saying it was a solid session, which is the honest report.
//
// The tone matters here. This is read by a client who has just finished
// training, so an observation is stated with its number and the client is left
// to draw the conclusion. "You were on your phone" is not something the data
// knows; "this took 22 minutes longer than the sets and rest add up to" is.

export type WorkoutInsight = Readonly<{
  tone: "praise" | "action" | "note";
  section?: "worked" | "next" | "attention";
  title: string;
  detail: string;
}>;

export type ReportExercise = Readonly<{
  name: string;
  restSeconds: number | null;
  sets: readonly ExerciseSetResult[];
  /** The same exercise's most recent previous session, if there is one. */
  previousSets: readonly ExerciseSetResult[];
  skipped: boolean;
  completed?: boolean;
  difficulty?: "easy" | "medium" | "hard";
  previousDifficulty?: "easy" | "medium" | "hard";
  targetReps?: number;
  successfulExposures?: number;
}>;

export type WorkoutReportInput = Readonly<{
  durationSeconds: number;
  exercises: readonly ReportExercise[];
  sleepHours?: number;
  perceivedDifficulty?: number;
  energy?: number;
  deload?: boolean;
}>;

// An estimate, not a measurement: how long a working set takes before the rest
// begins. Used only to say whether a session ran long, and every sentence built
// on it is phrased as an approximation.
const WORK_SECONDS_PER_SET = 45;
// A workout includes ordinary interruptions such as waiting for equipment,
// getting water, and taking longer recovery when needed. Only surface a pace
// note when the total duration exceeds the estimate by more than 20 minutes.
const OVERRUN_ATTENTION_SECONDS = 20 * 60;

const completed = (sets: readonly ExerciseSetResult[]) => sets.filter((set) => set.completed);
const heaviest = (sets: readonly ExerciseSetResult[]) =>
  Math.max(0, ...completed(sets).map((set) => set.weightKg ?? 0));
const minutes = (seconds: number) => Math.round(seconds / 60);
const successfulExposure=(exercise:ReportExercise,sets:readonly ExerciseSetResult[])=>sets.length>0&&sets.every((set)=>set.completed&&(exercise.targetReps===undefined||(set.repetitions??0)>=exercise.targetReps));
const sameLoads=(left:readonly ExerciseSetResult[],right:readonly ExerciseSetResult[])=>left.length===right.length&&left.every((set,index)=>(set.weightKg??0)===(right[index]?.weightKg??0));

/** How long the sets and the prescribed rest add up to. */
export function expectedSeconds(exercises: readonly ReportExercise[]) {
  return exercises.reduce((total, exercise) => {
    const count = completed(exercise.sets).length;
    return total + count * (WORK_SECONDS_PER_SET + (exercise.restSeconds ?? 60));
  }, 0);
}

export function buildWorkoutReport(input: WorkoutReportInput): readonly WorkoutInsight[] {
  const insights: WorkoutInsight[] = [];
  const trained = input.exercises.filter((exercise) => !exercise.skipped&&exercise.completed!==false);

  // ── Pace ────────────────────────────────────────────────────────────────
  const expected = expectedSeconds(input.exercises);
  if (expected > 0 && input.durationSeconds - expected > OVERRUN_ATTENTION_SECONDS) {
    const over = minutes(input.durationSeconds - expected);
    insights.push({
      tone: "action", section:"attention",
      title: "האימון נמשך יותר מהצפוי",
      detail: `הערכת האימון היא כ־${minutes(expected)} דקות, ובפועל הוא לקח ${minutes(input.durationSeconds)} דקות — פער של ${over} דקות. הפער יכול לכלול המתנה למכשירים, מילוי מים או הפסקות אישיות; אם הוא מפריע לך, כדאי לבדוק מה אפשר לייעל בלי לקצר מנוחה שנחוצה לביצוע טוב.`,
    });
  }

  // ── Weight progression, per exercise ────────────────────────────────────
  // A client who finished every prescribed rep at last session's weight is
  // ready for more. This is the single most useful thing a report can say.
  const hardCount=trained.filter((exercise)=>exercise.difficulty==="hard").length;
  const fatigued=hardCount>=2||(input.perceivedDifficulty??0)>=4||(input.energy??5)<=2||(input.sleepHours??8)<6;
  const increaseCandidates=trained.filter((exercise)=>progressionDecision({
    allDone:successfulExposure(exercise,exercise.sets),
    difficulty:exercise.difficulty,successfulExposures:exercise.successfulExposures??(exercise.difficulty==="easy"&&exercise.previousDifficulty==="easy"&&successfulExposure(exercise,exercise.previousSets)&&sameLoads(exercise.sets,exercise.previousSets)?2:0),deload:input.deload,fatigued,
  })==="increase").slice(0,2);
  increaseCandidates.forEach((exercise)=>insights.push({tone:"action",section:"next",title:`${exercise.name} · אפשר לנסות עלייה קטנה`,detail:"שתי חשיפות קלות ומוצלחות הושלמו. באימון הבא אפשר לנסות את מדרגת המשקל הקטנה ביותר, אם הטכניקה נשארת יציבה."}));

  const improved = trained.filter((exercise) => {
    const now = heaviest(exercise.sets);
    const before = heaviest(exercise.previousSets);
    return before > 0 && now > before;
  });
  improved.forEach((exercise)=>insights.push({tone:"praise",section:"worked",title:`${exercise.name} · עלייה במשקל`,detail:`${heaviest(exercise.previousSets)} → ${heaviest(exercise.sets)} ק״ג.`}));

  trained.filter((exercise)=>exercise.difficulty).forEach((exercise)=>{
    if(exercise.difficulty==="hard") insights.push({tone:"note",section:"attention",title:`${exercise.name} · היה קשה`,detail:"באימון הבא לא מעלים משקל; שומרים עליו או מפחיתים מעט כדי להחזיר ביצוע נקי."});
    else if(!increaseCandidates.includes(exercise)) insights.push({tone:"praise",section:"worked",title:`${exercise.name} · ${exercise.difficulty==="medium"?"קושי מתאים":"חשיפה מוצלחת"}`,detail:exercise.difficulty==="medium"?"העומס היה מאתגר במידה הנכונה; משמרים אותו ואת איכות הביצוע.":"הביצוע היה קל. משמרים עד שתי חשיפות קלות ומוצלחות לפני עלייה."});
  });

  if(input.deload)insights.unshift({tone:"praise",section:"worked",title:"אימון התאוששות",detail:"בדילואד הצלחה היא ביצוע קל ונקי. המלצות לעליית משקל מושבתות."});
  else if(fatigued)insights.push({tone:"note",section:"attention",title:"סימני עייפות באימון",detail:"כרגע לא מומלץ להעלות עומס. משמרים או מפחיתים עד שהקושי, האנרגיה והשינה חוזרים לטווח תקין."});

  // ── What did not get finished ───────────────────────────────────────────
  const skipped = input.exercises.filter((exercise) => exercise.skipped);
  if (skipped.length)
    insights.push({
      tone: "note", section:"attention",
      title: `${skipped.length} תרגילים דולגו`,
      detail: `${skipped.map((exercise) => exercise.name).join(", ")}. אם זה חוזר על עצמו - שווה לומר למאמן, אולי צריך להחליף אותם.`,
    });

  const partial = trained.filter((exercise) => {
    const done = completed(exercise.sets).length;
    return exercise.sets.length > 0 && done > 0 && done < exercise.sets.length;
  });
  if (partial.length)
    insights.push({
      tone: "note", section:"attention",
      title: "סטים שלא הושלמו",
      detail: `${partial.map((exercise) => `${exercise.name} ${completed(exercise.sets).length}/${exercise.sets.length}`).join(" · ")}.`,
    });

  // ── Context the client gave us themselves ───────────────────────────────
  if (typeof input.sleepHours === "number" && input.sleepHours > 0 && input.sleepHours < 6)
    insights.push({
      tone: "note", section:"attention",
      title: "ישנת מעט הלילה",
      detail: `${input.sleepHours} שעות. שינה קצרה משפיעה על הכוח ועל ההתאוששות יותר מכל דבר אחר באימון עצמו - אם זה חוזר, זה הדבר הראשון לטפל בו.`,
    });

  if (input.perceivedDifficulty !== undefined && input.perceivedDifficulty <= 2 && !increaseCandidates.length && !improved.length)
    insights.push({
      tone: "action", section:"next",
      title: "האימון הרגיש קל",
      detail: "דירגת את הקושי נמוך. אם גם החשיפה הבאה תהיה קלה ומלאה, אפשר יהיה להתקדם במדרגה הקטנה ביותר.",
    });

  // A session with nothing notable in it is a good session, and is told so
  // rather than being handed an empty panel.
  if (!insights.length)
    insights.push({
      tone: "praise", section:"worked",
      title: "אימון נקי",
      detail: "השלמת את מה שהיה מתוכנן, בקצב סביר. ממשיכים כך.",
    });

  return insights;
}
