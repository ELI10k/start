// The default macro split, in one place.
//
// The server recomputes a menu's targets on save and the browser computes them
// while the coach types. Both go through this, so they cannot disagree about
// what a default plan is - the numbers here are the only copy of the rule.
//
// The richer auto/manual behaviour lives in ./macro-plan, which is built on top
// of these same constants rather than restating them.

export const PROTEIN_GRAMS_PER_KG = 1.8;
export const FAT_SHARE_OF_CALORIES = 0.25;
export const CALORIES_PER_GRAM = { protein: 4, carbohydrates: 4, fat: 9 } as const;

export type MacroTargets = Readonly<{ protein: number; fat: number; carbohydrates: number }>;
export type MacroTargetCalculation =
  | { ok: true; targets: MacroTargets }
  | { ok: false; reason: "missing_input" | "negative_carbohydrates" };

export function calculateMacroTargetResult(weightKg: number, calorieTarget: number): MacroTargetCalculation {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(calorieTarget) || calorieTarget <= 0) {
    return { ok: false, reason: "missing_input" };
  }
  // The remainder is taken from the full-precision protein and fat, not from
  // their rounded grams. That is what produces the approved figures - 90kg at
  // 2100 kcal is 162/58/232 - so the rounding order here is a product decision,
  // not an implementation detail, and lib/nutrition/macro-plan follows it.
  const proteinGrams = weightKg * PROTEIN_GRAMS_PER_KG;
  const fatCalories = calorieTarget * FAT_SHARE_OF_CALORIES;
  // Carbohydrates absorb the remainder: they are the macro with no hard
  // requirement, so the arithmetic has somewhere to land.
  const carbohydrateGrams = (calorieTarget - proteinGrams * CALORIES_PER_GRAM.protein - fatCalories) / CALORIES_PER_GRAM.carbohydrates;
  if (carbohydrateGrams < 0) return { ok: false, reason: "negative_carbohydrates" };
  return {
    ok: true,
    targets: {
      protein: Math.round(proteinGrams),
      fat: Math.round(fatCalories / CALORIES_PER_GRAM.fat),
      carbohydrates: Math.round(carbohydrateGrams),
    },
  };
}

export function calculateMacroTargets(weightKg: number, calorieTarget: number): MacroTargets | null {
  const result = calculateMacroTargetResult(weightKg, calorieTarget);
  return result.ok ? result.targets : null;
}
