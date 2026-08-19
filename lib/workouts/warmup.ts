import type { ExerciseSetResult } from "./types.ts";

// Warm-up sets, worked out rather than guessed.
//
// A client arriving at an exercise had no idea what to load for the first set,
// so they either guessed low and wasted a set or guessed high and warmed up on
// their working weight. The numbers below are Eli's protocol, given 2026-08-19:
//
//   50% x 10, then 70% x 5
//   a third at 85% x 3 for the heavy compounds
//   and for easy work - RPE 6 or below - one set is enough
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

// Gyms have 1.25 kg plates a side at best, so 2.5 kg is the smallest jump that
// is actually loadable on a bar.
const toLoadable = (value: number) => roundToPlate(value);

const parseRpe = (effort?: string) => parseEffort(effort);

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
 * `effort` is the prescribed RPE as the programme writes it ("RPE 9", "9", "8-9").
 * Easy work gets one set: warming up twice for a set you could do ten more of is
 * time spent not training.
 */
export function planWarmup(
  workingWeightKg: number | null,
  options: { effort?: string; compound?: boolean } = {},
): WarmupPlan | null {
  if (!workingWeightKg || !Number.isFinite(workingWeightKg) || workingWeightKg <= 0) return null;

  const rpe = parseRpe(options.effort);
  const steps: readonly { percent: number; repetitions: number }[] =
    rpe !== null && rpe <= 6
      ? [{ percent: 50, repetitions: 10 }]
      : options.compound
        ? [
            { percent: 50, repetitions: 10 },
            { percent: 70, repetitions: 5 },
            { percent: 85, repetitions: 3 },
          ]
        : [
            { percent: 50, repetitions: 10 },
            { percent: 70, repetitions: 5 },
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
  const rpe = parseEffort(options.effort);
  if (rpe !== null && rpe <= 6) return 1;
  return options.compound ? 3 : 2;
};
