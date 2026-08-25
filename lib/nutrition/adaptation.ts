/**
 * What the client has been doing, turned into a change the coach can approve.
 *
 * The product already knows an enormous amount and acts on none of it. A client
 * who has halved the carbohydrate at dinner nine days out of fourteen has said
 * something very clearly, nine times, in the only vocabulary the app gave them -
 * and the menu they are handed tomorrow is the one written a month ago. The
 * coach finds out by reading fourteen days of totals, which nobody does.
 *
 * This is the same shape as the workout cycle proposal: look at a closed window,
 * find what the evidence supports, and write a draft. It changes nothing on its
 * own. The coach approves, edits or rejects, exactly as they do for a programme.
 *
 * Two rules only, and both are conservative on purpose:
 *
 *   * a portion the client keeps correcting becomes the portion that is written.
 *     The new number is the client's own median, not an invention - the app has
 *     never made up a quantity and does not start here.
 *   * a calorie target that the scale says is not working moves by one step, in
 *     the direction the goal asks for.
 *
 * A proposal that is not clearly supported is not made. Saying nothing is the
 * correct output most weeks, and a coach who is shown noise stops reading.
 */

import { averageWeightChangeRates, type WeightPoint } from "../progress/rates.ts";
import { roundPortionQuantity } from "./meal-alternatives.ts";

export type GroupType = "protein" | "carbohydrate" | "fat" | "vegetables";

/** One group, on one day: what was written, and what the client said they ate. */
export type PortionObservation = Readonly<{
  date: string;
  mealId: string;
  mealTitle: string;
  groupId: string;
  groupType: GroupType;
  foodName: string;
  unit: string;
  planned: number;
  /** The client's correction. Null is "as prescribed", which is most days. */
  reported: number | null;
}>;

/** How a meal was answered on a day. Null is unanswered. */
export type MealAnswer = Readonly<{
  date: string;
  mealId: string;
  mealTitle: string;
  status: "eaten" | "not_eaten" | "other" | null;
}>;

export type NutritionGoal = "lose" | "gain" | "maintain";

export type PortionProposal = Readonly<{
  kind: "portion";
  mealId: string;
  mealTitle: string;
  groupId: string;
  groupType: GroupType;
  foodName: string;
  unit: string;
  planned: number;
  proposed: number;
  /** Days the group was chosen, and of those how many carried a correction. */
  days: number;
  corrected: number;
  evidence: readonly string[];
}>;

export type MealMissedProposal = Readonly<{
  kind: "meal_missed";
  mealId: string;
  mealTitle: string;
  days: number;
  missed: number;
  evidence: readonly string[];
}>;

export type CalorieTargetProposal = Readonly<{
  kind: "calorie_target";
  current: number;
  proposed: number;
  weeklyKg: number;
  days: number;
  evidence: readonly string[];
}>;

export type NutritionProposal = PortionProposal | MealMissedProposal | CalorieTargetProposal;

/** A group has to have been chosen this often before its corrections mean anything. */
export const MIN_OBSERVED_DAYS = 6;
/** And this much of that has to be a correction rather than a silent day. */
export const CORRECTION_SHARE = 2 / 3;
/** A correction under this is the client being approximate, not disagreeing. */
export const PORTION_DRIFT = 0.15;
/** A meal answered this often, refused this much of it, is not happening. */
export const MISSED_SHARE = 0.6;

/** How far a calorie target moves in one step, and how far it may ever be pushed. */
export const CALORIE_STEP = 150;
export const CALORIE_FLOOR = 1200;
export const MAX_TARGET_SHIFT = 0.1;

/** Below this the scale has not said anything yet, whatever the number looks like. */
export const MIN_TREND_DAYS = 21;
export const MIN_WEIGH_INS = 4;
/** Loss slower than this is not loss; faster than this is too fast to keep. */
export const SLOW_LOSS_KG = 0.15;
export const FAST_LOSS_KG = 1;
/** What counts as holding steady when the goal is to hold steady. */
export const MAINTAIN_DRIFT_KG = 0.4;

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const share = (part: number, whole: number) => (whole ? part / whole : 0);
const percent = (value: number) => Math.round(value * 100);

/**
 * Portions the client has been correcting in the same direction, consistently.
 *
 * Grouped by the group rather than by the food: the group is what the coach
 * edits, it is what carries the correction, and a client who switched
 * alternatives mid-window is still telling us about the same slot in the day.
 */
export function proposePortionChanges(observations: readonly PortionObservation[]): readonly PortionProposal[] {
  const byGroup = new Map<string, PortionObservation[]>();
  for (const observation of observations) {
    if (!(observation.planned > 0)) continue;
    const list = byGroup.get(observation.groupId);
    if (list) list.push(observation);
    else byGroup.set(observation.groupId, [observation]);
  }

  const proposals: PortionProposal[] = [];
  for (const group of byGroup.values()) {
    const days = group.length;
    if (days < MIN_OBSERVED_DAYS) continue;
    const corrections = group.filter((item) => item.reported !== null && item.reported > 0);
    if (share(corrections.length, days) < CORRECTION_SHARE) continue;

    // The plan can be rewritten mid-window. Judge against what was written most
    // recently, which is what the coach is looking at now.
    const latest = group.reduce((newest, item) => (item.date > newest.date ? item : newest));
    const planned = latest.planned;
    const reported = median(corrections.map((item) => item.reported as number));
    if (!(reported > 0)) continue;
    if (Math.abs(reported - planned) / planned < PORTION_DRIFT) continue;

    const proposed = roundPortionQuantity(reported, latest.unit);
    if (proposed === planned) continue;

    const direction = proposed < planned ? "פחות" : "יותר";
    proposals.push({
      kind: "portion",
      mealId: latest.mealId,
      mealTitle: latest.mealTitle,
      groupId: latest.groupId,
      groupType: latest.groupType,
      foodName: latest.foodName,
      unit: latest.unit,
      planned,
      proposed,
      days,
      corrected: corrections.length,
      evidence: [
        `נבחר ב-${days} ימים, מתוכם ${corrections.length} עם תיקון כמות`,
        `נכתב ${planned} ${latest.unit}, נאכל בפועל ${direction} — חציון ${reported} ${latest.unit}`,
      ],
    });
  }
  return proposals.sort((a, b) => b.corrected - a.corrected);
}

/**
 * Meals the client keeps refusing.
 *
 * No rewrite comes with this one. "לא נאכל" five mornings out of eight is a
 * conversation - the meal is at the wrong hour, or it is too big, or breakfast
 * is not a thing this person does - and guessing which of those it is would be
 * inventing a reason. The coach is told what happened and decides.
 */
export function proposeMissedMeals(answers: readonly MealAnswer[]): readonly MealMissedProposal[] {
  const byMeal = new Map<string, MealAnswer[]>();
  for (const answer of answers) {
    if (answer.status === null) continue;
    const list = byMeal.get(answer.mealId);
    if (list) list.push(answer);
    else byMeal.set(answer.mealId, [answer]);
  }

  const proposals: MealMissedProposal[] = [];
  for (const meal of byMeal.values()) {
    const days = meal.length;
    if (days < MIN_OBSERVED_DAYS) continue;
    const missed = meal.filter((answer) => answer.status === "not_eaten").length;
    if (share(missed, days) < MISSED_SHARE) continue;
    proposals.push({
      kind: "meal_missed",
      mealId: meal[0].mealId,
      mealTitle: meal[0].mealTitle,
      days,
      missed,
      evidence: [`סומנה "לא נאכל" ב-${missed} מתוך ${days} הימים שנענו (${percent(share(missed, days))}%)`],
    });
  }
  return proposals.sort((a, b) => b.missed - a.missed);
}

/**
 * A calorie target the scale disagrees with.
 *
 * One step at a time, never past a tenth of the target and never under the
 * floor. A coach who wants a bigger move makes it themselves; an engine that
 * can propose a 400 calorie cut is an engine nobody lets run.
 */
export function proposeCalorieTarget(
  weights: readonly WeightPoint[],
  goal: NutritionGoal,
  currentTarget: number | null,
): CalorieTargetProposal | null {
  if (!currentTarget || currentTarget <= 0) return null;
  if (weights.length < MIN_WEIGH_INS) return null;
  const rates = averageWeightChangeRates(weights);
  if (!rates || rates.weeklyKg === null || rates.days < MIN_TREND_DAYS) return null;

  const weekly = rates.weeklyKg;
  let delta = 0;
  let because = "";
  if (goal === "lose") {
    if (weekly > -SLOW_LOSS_KG) { delta = -CALORIE_STEP; because = `המשקל יורד ב-${weekly} ק"ג לשבוע — פחות מהקצב שהיעד מכוון אליו`; }
    else if (weekly < -FAST_LOSS_KG) { delta = CALORIE_STEP; because = `המשקל יורד ב-${Math.abs(weekly)} ק"ג לשבוע — מהר מדי כדי להחזיק`; }
  } else if (goal === "gain") {
    if (weekly < SLOW_LOSS_KG) { delta = CALORIE_STEP; because = `המשקל עולה ב-${weekly} ק"ג לשבוע — פחות מהקצב שהיעד מכוון אליו`; }
    else if (weekly > FAST_LOSS_KG) { delta = -CALORIE_STEP; because = `המשקל עולה ב-${weekly} ק"ג לשבוע — מהר מדי`; }
  } else if (Math.abs(weekly) > MAINTAIN_DRIFT_KG) {
    delta = weekly > 0 ? -CALORIE_STEP : CALORIE_STEP;
    because = `היעד הוא שמירה, והמשקל זז ב-${weekly} ק"ג לשבוע`;
  }
  if (!delta) return null;

  const bounded = Math.max(-currentTarget * MAX_TARGET_SHIFT, Math.min(currentTarget * MAX_TARGET_SHIFT, delta));
  const raw = currentTarget + bounded;
  // A cut that would land under the floor is not proposed at all. Clamping it up
  // to the floor would answer "you are not losing" with a bigger target, which
  // is either wrong or a conversation about something other than calories -
  // and both of those belong to the coach rather than to an engine.
  if (raw < CALORIE_FLOOR) return null;
  const proposed = Math.round(raw / 10) * 10;
  if (proposed === currentTarget) return null;

  return {
    kind: "calorie_target",
    current: currentTarget,
    proposed,
    weeklyKg: weekly,
    days: rates.days,
    evidence: [because, `${weights.length} שקילות על פני ${rates.days} ימים`],
  };
}

/** Everything worth showing a coach about one client this fortnight. */
export function buildNutritionProposals(input: Readonly<{
  observations: readonly PortionObservation[];
  answers: readonly MealAnswer[];
  weights: readonly WeightPoint[];
  goal: NutritionGoal;
  calorieTarget: number | null;
}>): readonly NutritionProposal[] {
  const target = proposeCalorieTarget(input.weights, input.goal, input.calorieTarget);
  return [
    ...(target ? [target] : []),
    ...proposePortionChanges(input.observations),
    ...proposeMissedMeals(input.answers),
  ];
}

/** One line for the notification that tells the coach there is something to read. */
export function summarizeProposals(proposals: readonly NutritionProposal[]): string {
  const portions = proposals.filter((item) => item.kind === "portion").length;
  const missed = proposals.filter((item) => item.kind === "meal_missed").length;
  const target = proposals.some((item) => item.kind === "calorie_target");
  return [
    target ? "יעד קלוריות" : "",
    portions ? `${portions} כמויות` : "",
    missed ? `${missed} ארוחות שלא נאכלות` : "",
  ].filter(Boolean).join(" · ");
}
