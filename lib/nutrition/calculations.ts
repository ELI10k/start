export type Gender = "male" | "female";

export type Goal =
  | "aggressive_cut"
  | "cut"
  | "maintenance"
  | "lean_bulk";

export type ClientNutritionInput = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
  weeklyWorkouts: number;
  averageDailySteps: number;
  goal: Goal;
};

export type NutritionTargets = {
  bmr: number;
  activityMultiplier: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
  calorieAdjustment: number;
};

/**
 * חישוב BMR לפי Mifflin-St Jeor.
 */
export function calculateBmr(
  input: Pick<
    ClientNutritionInput,
    "gender" | "age" | "heightCm" | "weightKg"
  >
): number {
  const base =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.age;

  const genderAdjustment =
    input.gender === "male" ? 5 : -161;

  return Math.round(base + genderAdjustment);
}

/**
 * חישוב רמת פעילות משולבת לפי צעדים ואימונים.
 */
export function calculateActivityMultiplier(
  weeklyWorkouts: number,
  averageDailySteps: number
): number {
  let multiplier = 1.2;

  if (averageDailySteps >= 4000) {
    multiplier += 0.05;
  }

  if (averageDailySteps >= 7000) {
    multiplier += 0.05;
  }

  if (averageDailySteps >= 10000) {
    multiplier += 0.05;
  }

  if (averageDailySteps >= 13000) {
    multiplier += 0.05;
  }

  if (weeklyWorkouts >= 1) {
    multiplier += 0.05;
  }

  if (weeklyWorkouts >= 3) {
    multiplier += 0.05;
  }

  if (weeklyWorkouts >= 5) {
    multiplier += 0.05;
  }

  return Number(Math.min(multiplier, 1.65).toFixed(2));
}

export function getCalorieAdjustment(
  goal: Goal,
  tdee: number
): number {
  switch (goal) {
    case "aggressive_cut":
      return -Math.round(tdee * 0.25);

    case "cut":
      return -Math.round(tdee * 0.18);

    case "lean_bulk":
      return Math.round(tdee * 0.08);

    case "maintenance":
    default:
      return 0;
  }
}

/**
 * עיגול יעד קלורי למדרגות של 50 קלוריות.
 */
export function roundCalories(value: number): number {
  return Math.round(value / 50) * 50;
}

/**
 * חלבון נשמר גבוה גם כאשר מורידים קלוריות.
 */
export function calculateProtein(
  weightKg: number,
  goal: Goal
): number {
  const multiplier =
    goal === "aggressive_cut"
      ? 2.2
      : goal === "cut"
        ? 2
        : goal === "lean_bulk"
          ? 1.8
          : 1.8;

  return Math.round(weightKg * multiplier);
}

export function calculateFat(
  weightKg: number,
  targetCalories: number
): number {
  const preferredFat = Math.round(weightKg * 0.8);
  const maximumFromCalories = Math.floor(
    (targetCalories * 0.3) / 9
  );

  return Math.max(
    45,
    Math.min(preferredFat, maximumFromCalories)
  );
}

export function calculateCarbs(
  targetCalories: number,
  proteinGrams: number,
  fatGrams: number
): number {
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;

  const remainingCalories =
    targetCalories - proteinCalories - fatCalories;

  return Math.max(0, Math.round(remainingCalories / 4));
}

export function calculateNutritionTargets(
  input: ClientNutritionInput
): NutritionTargets {
  const bmr = calculateBmr(input);

  const activityMultiplier =
    calculateActivityMultiplier(
      input.weeklyWorkouts,
      input.averageDailySteps
    );

  const tdee = Math.round(bmr * activityMultiplier);

  const calorieAdjustment = getCalorieAdjustment(
    input.goal,
    tdee
  );

  const targetCalories = roundCalories(
    tdee + calorieAdjustment
  );

  const proteinGrams = calculateProtein(
    input.weightKg,
    input.goal
  );

  const fatGrams = calculateFat(
    input.weightKg,
    targetCalories
  );

  const carbsGrams = calculateCarbs(
    targetCalories,
    proteinGrams,
    fatGrams
  );

  return {
    bmr,
    activityMultiplier,
    tdee,
    targetCalories,
    proteinGrams,
    fatGrams,
    carbsGrams,
    calorieAdjustment,
  };
}