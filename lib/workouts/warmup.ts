import type { ExerciseSetResult } from "./types.ts";

// Two preparation sets are shown for the first loaded exercise of each muscle
// group: 50%, then 80%. Both use the prescribed warm-up repetitions derived
// from the working-set target. Abdominal exercises are excluded by the caller.
//
// Everything is derived from what the client actually lifted last time. With no
// previous session there is no honest percentage of anything, and the screen says
// so instead of inventing a starting weight.

export type WarmupSet = Readonly<{
  percent: number;
  weightKg: number;
  repetitions: number;
}>;

export type WarmupPlan = Readonly<{
  workingWeightKg: number;
  sets: readonly WarmupSet[];
}>;

/**
 * A loaded warm-up belongs only to the first exercise for a muscle group in a
 * workout. Later exercises for the same muscle are already preceded by working
 * sets for that muscle and should not ask the client to warm it up again.
 */
export function isFirstExerciseForMuscle(
  primaryMuscleGroup: string | undefined,
  earlierMuscleGroups: readonly (string | undefined)[],
) {
  return Boolean(primaryMuscleGroup && !earlierMuscleGroups.includes(primaryMuscleGroup));
}

// Gyms have 1.25 kg plates a side at best, so 2.5 kg is the smallest jump that
// is actually loadable on a bar.
const toLoadable = (value: number) => roundToPlate(value);

/**
 * The heaviest weight completed for this exercise in the most recent session
 * that has one. "Most recent with a weight" rather than "most recent", because a
 * session logged without weights would otherwise wipe out the reference.
 */
export function workingWeightFrom(
  sessions: readonly { sets: readonly ExerciseSetResult[] }[],
): number | null {
  for (const session of sessions) {
    const weights = session.sets
      .filter((set) => set.completed && typeof set.weightKg === "number" && set.weightKg > 0)
      .map((set) => set.weightKg as number);
    if (weights.length) return Math.max(...weights);
  }
  return null;
}

/**
 * The warm-up for one exercise, or null when there is nothing to base it on.
 *
 * `effort` and `compound` remain accepted for compatibility with existing
 * callers. The current protocol deliberately uses one set for every exercise.
 */
export function planWarmup(
  workingWeightKg: number | null,
  options: { effort?: string; compound?: boolean; repetitions?: number; professional?:boolean } = {},
): WarmupPlan | null {
  if (!workingWeightKg || !Number.isFinite(workingWeightKg) || workingWeightKg <= 0) return null;

  // Brief preparation rather than two near-working-load endurance sets.
  // Equipment increments are unknown: show an approximate load, never above
  // the working load. The client chooses an actually available lighter load.
  if(options.professional){
    const steps=options.compound?[{percent:50,repetitions:8},{percent:80,repetitions:3}]:[{percent:50,repetitions:6}];
    return {workingWeightKg,sets:steps.map(step=>({...step,weightKg:Math.min(workingWeightKg,Math.floor(workingWeightKg*step.percent/100*2)/2)}))};
  }

  const workingRepetitions = options.repetitions;
  const repetitions = workingRepetitions === undefined || workingRepetitions <= 8
    ? 12
    : workingRepetitions <= 12
      ? 15
      : 20;
  const steps: readonly { percent: number; repetitions: number }[] = [
    { percent: 50, repetitions },
    { percent: 80, repetitions },
  ];

  return {
    workingWeightKg,
    sets: steps.map((step) => ({
      percent: step.percent,
      weightKg: toLoadable((workingWeightKg * step.percent) / 100),
      repetitions: step.repetitions,
    })),
  };
}

// The lifts heavy enough to earn a third ramp. Matched on the exercise name
// because that is what the imported programmes carry; anything unrecognised is
// treated as accessory work, which is the safe direction to be wrong in.
const COMPOUND_PATTERNS = /סקוואט|סקווט|דדליפט|מכופף|לחיצת חזה|לחיצת רגליים|לחיצה צרפתית|מתח|סמיטה|בארבל|מוט חופשי/;

export function isCompoundLift(name?: string) {
  return Boolean(name && COMPOUND_PATTERNS.test(name));
}

// ── Compatibility surface ──────────────────────────────────────────────────
//
// An earlier version of this module exposed these four names and a test file
// still imports them. They are the same three calculations under the names that
// module used, kept so nothing that already referenced them has to change.

/** The prescribed RPE as a number, or null when the programme did not set one. */
export const parseEffort = (effort?: string) => {
  if (!effort) return null;
  const match = /\d+(\.\d+)?/.exec(effort);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
};

/** The nearest weight that can actually be loaded on a bar. */
export const roundToPlate = (value: number) => Math.max(2.5, Math.round(value / 2.5) * 2.5);

export const warmupPlan = planWarmup;

/** How many warm-up sets the protocol calls for, without computing the weights. */
export const warmupStepCount = (options: { effort?: string; compound?: boolean } = {}) => {
  void options;
  return 2;
};
