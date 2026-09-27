import { numberOf, type ProgressReading } from "./changes.ts";

export type WeightGoalProgress = Readonly<{
  startingWeight: number;
  currentWeight: number;
  targetWeight: number;
  remainingKg: number;
  completedKg: number;
  percent: number;
}>;

const round = (value: number) => Number(value.toFixed(1));

/** Progress is measured along the direction from the first weigh-in to the goal.
 * A temporary move in the other direction never produces a negative meter, and
 * passing the target completes it rather than overflowing the track. */
export function weightGoalProgress(
  entries: readonly ProgressReading[],
  target: number | string | null | undefined,
): WeightGoalProgress | null {
  const targetWeight = numberOf(target);
  const weights = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((entry) => {
      const weight = numberOf(entry.weight);
      return weight === null ? [] : [weight];
    });
  const startingWeight = weights[0];
  const currentWeight = weights.at(-1);
  if (targetWeight === null || targetWeight <= 0 || startingWeight === undefined || currentWeight === undefined) return null;

  const totalDistance = Math.abs(startingWeight - targetWeight);
  const remainingKg = Math.abs(currentWeight - targetWeight);
  if (totalDistance === 0) {
    return {
      startingWeight,
      currentWeight,
      targetWeight,
      remainingKg: round(remainingKg),
      completedKg: 0,
      percent: currentWeight === targetWeight ? 100 : 0,
    };
  }

  const direction = Math.sign(targetWeight - startingWeight);
  const travelled = (currentWeight - startingWeight) * direction;
  const completedKg = Math.min(totalDistance, Math.max(0, travelled));
  const reached = direction > 0 ? currentWeight >= targetWeight : currentWeight <= targetWeight;
  return {
    startingWeight,
    currentWeight,
    targetWeight,
    remainingKg: reached ? 0 : round(remainingKg),
    completedKg: round(completedKg),
    percent: reached ? 100 : Math.round((completedKg / totalDistance) * 100),
  };
}
