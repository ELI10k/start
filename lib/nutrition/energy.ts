// Calorie targets, from resting metabolism upwards.
//
// BMI is not part of this. BMI is a ratio of mass to height with no metabolic
// content: two people with the same BMI and different body sizes need different
// numbers of calories. It stays a display figure.
//
// The chain is the standard one: BMR from Mifflin-St Jeor, a TDEE built from
// what this client actually does, then the goal's offset.

export type Sex = "male" | "female";

export type NutritionGoal =
  | "maintain"
  | "gentle_cut"
  | "fast_cut"
  | "lean_bulk"
  | "dirty_bulk";

export const NUTRITION_GOALS: readonly NutritionGoal[] = ["maintain", "gentle_cut", "fast_cut", "lean_bulk", "dirty_bulk"];

export const GOAL_LABELS: Record<NutritionGoal, string> = {
  maintain: "שימור",
  gentle_cut: "חיטוב עדין",
  fast_cut: "חיטוב מהיר",
  lean_bulk: "מסה עדינה",
  dirty_bulk: "מסה מלוכלכת",
};

// The offsets are the product decision, stated once.
export const GOAL_CALORIE_OFFSET: Record<NutritionGoal, number> = {
  maintain: 0,
  gentle_cut: -300,
  fast_cut: -500,
  lean_bulk: 200,
  dirty_bulk: 400,
};

export const isNutritionGoal = (value: unknown): value is NutritionGoal =>
  typeof value === "string" && (NUTRITION_GOALS as readonly string[]).includes(value);

export type EnergyInput = Readonly<{
  ageYears?: number;
  weightKg?: number;
  heightCm?: number;
  sex?: Sex;
  weeklyWorkouts?: number;
  dailySteps?: number;
  goal?: NutritionGoal;
}>;

/** Every field the calculation needs but did not get, named for the coach. */
export type MissingField = "age" | "weight" | "height" | "sex" | "goal";

export const MISSING_LABELS: Record<MissingField, string> = {
  age: "גיל",
  weight: "משקל",
  height: "גובה",
  sex: "מין",
  goal: "מטרה",
};

export type EnergyResult =
  | Readonly<{ ok: true; bmr: number; activityFactor: number; tdee: number; calorieTarget: number; goal: NutritionGoal }>
  | Readonly<{ ok: false; missing: readonly MissingField[] }>;

const positive = (value: number | undefined) => Number.isFinite(value) && (value as number) > 0;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// Mifflin-St Jeor. It needs sex, and the two variants differ by 166 kcal - far
// too much to split the difference and call it an estimate. A client with no sex
// recorded is reported as missing rather than averaged.
export function basalMetabolicRate(input: EnergyInput): number | null {
  if (!positive(input.weightKg) || !positive(input.heightCm) || !positive(input.ageYears) || !input.sex) return null;
  const base = 10 * (input.weightKg as number) + 6.25 * (input.heightCm as number) - 5 * (input.ageYears as number);
  return Math.round(base + (input.sex === "male" ? 5 : -161));
}

// The activity factor is built from what the client does, not from a label they
// picked. Trainee level is deliberately not an input here: a beginner who walks
// 14,000 steps a day burns more than an advanced lifter who drives everywhere.
//
// Sedentary is 1.2. Steps are counted from 3,000 - roughly what daily life
// produces without trying - and each further 1,000 adds 0.025. Each weekly
// session adds 0.045. Both are capped so that one extreme figure, or a
// mis-typed step count, cannot produce an absurd target; the total is capped at
// 1.9, which is the top of the usual range.
export function activityFactor(input: EnergyInput): number {
  const steps = positive(input.dailySteps) ? (input.dailySteps as number) : 0;
  const workouts = positive(input.weeklyWorkouts) ? (input.weeklyWorkouts as number) : 0;
  const fromSteps = clamp(((steps - 3000) / 1000) * 0.025, 0, 0.3);
  const fromTraining = clamp(workouts * 0.045, 0, 0.27);
  return Number(clamp(1.2 + fromSteps + fromTraining, 1.2, 1.9).toFixed(3));
}

export function missingEnergyFields(input: EnergyInput): readonly MissingField[] {
  const missing: MissingField[] = [];
  if (!positive(input.ageYears)) missing.push("age");
  if (!positive(input.weightKg)) missing.push("weight");
  if (!positive(input.heightCm)) missing.push("height");
  if (!input.sex) missing.push("sex");
  if (!input.goal) missing.push("goal");
  return missing;
}

export function calculateEnergy(input: EnergyInput): EnergyResult {
  const missing = missingEnergyFields(input);
  if (missing.length) return { ok: false, missing };

  const bmr = basalMetabolicRate(input);
  if (bmr === null) return { ok: false, missing: missingEnergyFields(input) };

  const factor = activityFactor(input);
  const tdee = Math.round(bmr * factor);
  const goal = input.goal as NutritionGoal;
  // Never below the resting requirement, whatever the goal asks for. A deficit
  // that takes a client under their own BMR is not a target, it is a mistake.
  const calorieTarget = Math.max(bmr, tdee + GOAL_CALORIE_OFFSET[goal]);

  return { ok: true, bmr, activityFactor: factor, tdee, calorieTarget, goal };
}

// A display figure, and labelled as one. It informs nothing above.
export function bodyMassIndex(weightKg?: number, heightCm?: number): number | null {
  if (!positive(weightKg) || !positive(heightCm)) return null;
  const metres = (heightCm as number) / 100;
  return Number(((weightKg as number) / (metres * metres)).toFixed(1));
}
