import type { ExerciseSetResult } from "./types.ts";

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
}>;

export type WorkoutReportInput = Readonly<{
  durationSeconds: number;
  exercises: readonly ReportExercise[];
  sleepHours?: number;
  perceivedDifficulty?: number;
}>;

// An estimate, not a measurement: how long a working set takes before the rest
// begins. Used only to say whether a session ran long, and every sentence built
// on it is phrased as an approximation.
const WORK_SECONDS_PER_SET = 45;
// Below this there is nothing worth remarking on - sessions vary.
const OVERRUN_TOLERANCE = 1.4;

const completed = (sets: readonly ExerciseSetResult[]) => sets.filter((set) => set.completed);
const heaviest = (sets: readonly ExerciseSetResult[]) =>
  Math.max(0, ...completed(sets).map((set) => set.weightKg ?? 0));
const minutes = (seconds: number) => Math.round(seconds / 60);

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
  if (expected > 0 && input.durationSeconds > expected * OVERRUN_TOLERANCE) {
    const over = minutes(input.durationSeconds - expected);
    if (over >= 5)
      insights.push({
        tone: "action",
        title: "האימון נמשך יותר מהצפוי",
        detail: `הסטים והמנוחות שלך מסתכמים בכ־${minutes(expected)} דקות, והאימון לקח ${minutes(input.durationSeconds)}. הפרש של ${over} דקות. אימון רצוף שומר על הדופק ועל האפקט המטבולי - שווה לשים לב מה קורה בין הסטים.`,
      });
  }

  // ── Weight progression, per exercise ────────────────────────────────────
  // A client who finished every prescribed rep at last session's weight is
  // ready for more. This is the single most useful thing a report can say.
  const ready = trained.filter((exercise) => {
    const done = completed(exercise.sets);
    if (done.length < 2) return false;
    const now = heaviest(exercise.sets);
    const before = heaviest(exercise.previousSets);
    // Same weight as last time, and every set was completed.
    return before > 0 && now > 0 && now === before && done.length === exercise.sets.length;
  });
  ready.forEach((exercise)=>insights.push({tone:"action",title:`${exercise.name} · אפשר לעלות`,detail:"כל הסטים הושלמו במשקל הקודם. באימון הבא כדאי לנסות את העלייה הקטנה שמוצגת בכרטיס האתגר."}));

  const improved = trained.filter((exercise) => {
    const now = heaviest(exercise.sets);
    const before = heaviest(exercise.previousSets);
    return before > 0 && now > before;
  });
  improved.forEach((exercise)=>insights.push({tone:"praise",title:`${exercise.name} · עלייה במשקל`,detail:`${heaviest(exercise.previousSets)} → ${heaviest(exercise.sets)} ק״ג.`}));

  trained.filter((exercise)=>exercise.difficulty).forEach((exercise)=>{
    if(exercise.difficulty==="medium") insights.push({tone:"praise",title:`${exercise.name} · קושי מתאים`,detail:"העומס היה מאתגר במידה הנכונה; כדאי לשמר את איכות הביצוע."});
    else insights.push({tone:exercise.difficulty==="hard"?"note":"action",title:`${exercise.name} · ${exercise.difficulty==="hard"?"היה קשה":"היה קל"}`,detail:exercise.difficulty==="hard"?"באימון הבא מומלץ לשמור על אותו משקל או להפחית מעט.":"באימון הבא ההמלצה תאפשר התקדמות קטנה."});
  });

  // ── What did not get finished ───────────────────────────────────────────
  const skipped = input.exercises.filter((exercise) => exercise.skipped);
  if (skipped.length)
    insights.push({
      tone: "note",
      title: `${skipped.length} תרגילים דולגו`,
      detail: `${skipped.map((exercise) => exercise.name).join(", ")}. אם זה חוזר על עצמו - שווה לומר למאמן, אולי צריך להחליף אותם.`,
    });

  const partial = trained.filter((exercise) => {
    const done = completed(exercise.sets).length;
    return exercise.sets.length > 0 && done > 0 && done < exercise.sets.length;
  });
  if (partial.length)
    insights.push({
      tone: "note",
      title: "סטים שלא הושלמו",
      detail: `${partial.map((exercise) => `${exercise.name} ${completed(exercise.sets).length}/${exercise.sets.length}`).join(" · ")}.`,
    });

  // ── Context the client gave us themselves ───────────────────────────────
  if (typeof input.sleepHours === "number" && input.sleepHours > 0 && input.sleepHours < 6)
    insights.push({
      tone: "note",
      title: "ישנת מעט הלילה",
      detail: `${input.sleepHours} שעות. שינה קצרה משפיעה על הכוח ועל ההתאוששות יותר מכל דבר אחר באימון עצמו - אם זה חוזר, זה הדבר הראשון לטפל בו.`,
    });

  if (input.perceivedDifficulty !== undefined && input.perceivedDifficulty <= 2 && !ready.length && !improved.length)
    insights.push({
      tone: "action",
      title: "האימון הרגיש קל",
      detail: "דירגת את הקושי נמוך. אם זה חוזר גם בפעם הבאה, כדאי לעלות במשקלים או להוסיף חזרות.",
    });

  // A session with nothing notable in it is a good session, and is told so
  // rather than being handed an empty panel.
  if (!insights.length)
    insights.push({
      tone: "praise",
      title: "אימון נקי",
      detail: "השלמת את מה שהיה מתוכנן, בקצב סביר. ממשיכים כך.",
    });

  return insights;
}
