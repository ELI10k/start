import { CALORIES_PER_GRAM, calculateMacroTargetResult, FAT_SHARE_OF_CALORIES, PROTEIN_GRAMS_PER_KG } from "./macro-targets.ts";

// Which of the four numbers the coach typed, and which the system worked out.
// Keeping that distinction explicit is what lets a recalculation know what it is
// allowed to overwrite - and lets the screen say, next to each field, where the
// number came from.

export type MacroSource = "auto" | "manual";
export type MacroSources = Readonly<{ calories: MacroSource; protein: MacroSource; carbohydrates: MacroSource; fat: MacroSource }>;
export const ALL_AUTOMATIC: MacroSources = { calories: "auto", protein: "auto", carbohydrates: "auto", fat: "auto" };

export type MacroPlan = Readonly<{ calories: number; protein: number; carbohydrates: number; fat: number }>;

// Re-exported, not redefined: the split is stated once in ./macro-targets and
// every consumer - the browser as the coach types, the server on save - reads
// the same numbers.
export { CALORIES_PER_GRAM, FAT_SHARE_OF_CALORIES, PROTEIN_GRAMS_PER_KG };

/** calories = protein*4 + carbs*4 + fat*9, which is the only identity that must hold. */
export function caloriesFromMacros(plan: Omit<MacroPlan, "calories">): number {
  return Math.round(
    plan.protein * CALORIES_PER_GRAM.protein +
    plan.carbohydrates * CALORIES_PER_GRAM.carbohydrates +
    plan.fat * CALORIES_PER_GRAM.fat,
  );
}

export type MacroPlanResult =
  | Readonly<{ ok: true; plan: MacroPlan; sources: MacroSources; warning?: string }>
  | Readonly<{ ok: false; reason: "missing_input" | "negative_carbohydrates" }>;

/**
 * Recomputes whatever is still automatic, leaving anything the coach typed alone.
 *
 * Carbohydrates are always the remainder, because something has to absorb the
 * arithmetic and carbohydrate is the macro with no hard requirement. That means
 * a manual protein figure changes the carbohydrates rather than the calories,
 * which is what a coach expects: the calorie target is the decision, the split
 * is the consequence.
 */
export function planMacros(
  input: Readonly<{ calories: number; weightKg: number; sources: MacroSources; current: Partial<MacroPlan> }>,
): MacroPlanResult {
  const { calories, weightKg, sources, current } = input;
  if (!Number.isFinite(calories) || calories <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
    return { ok: false, reason: "missing_input" };
  }

  // A manual figure is exactly what the coach typed. An automatic one keeps its
  // full precision for the remainder and is only rounded for display - which is
  // the rounding order ./macro-targets uses, and what produces the approved
  // numbers. Rounding first would put this a gram away from the server's own
  // recomputation for the same client.
  const manualProtein = sources.protein === "manual" && Number.isFinite(current.protein ?? NaN);
  const manualFat = sources.fat === "manual" && Number.isFinite(current.fat ?? NaN);
  const preciseProtein = manualProtein ? Math.max(0, Math.round(current.protein as number)) : weightKg * PROTEIN_GRAMS_PER_KG;
  const preciseFatCalories = manualFat
    ? Math.max(0, Math.round(current.fat as number)) * CALORIES_PER_GRAM.fat
    : calories * FAT_SHARE_OF_CALORIES;

  const protein = Math.round(preciseProtein);
  const fat = Math.round(preciseFatCalories / CALORIES_PER_GRAM.fat);

  const remaining = calories - preciseProtein * CALORIES_PER_GRAM.protein - preciseFatCalories;
  const carbohydrates = Math.round(remaining / CALORIES_PER_GRAM.carbohydrates);

  // A negative remainder means the protein and fat alone already exceed the
  // calorie target. Clamping to zero and staying silent would hand the coach a
  // plan whose macros do not add up to its own target.
  if (carbohydrates < 0) return { ok: false, reason: "negative_carbohydrates" };

  const plan: MacroPlan = { calories: Math.round(calories), protein, carbohydrates, fat };
  const total = caloriesFromMacros(plan);
  // Rounding three grams to whole numbers can move the total by a few calories.
  // More than that means the manual figures genuinely disagree with the target.
  const drift = Math.abs(total - plan.calories);
  const warning = drift > 10
    ? `סכום המאקרו הוא ${total} קלוריות מול יעד של ${plan.calories}. הפרש של ${drift} קלוריות.`
    : undefined;

  return {
    ok: true,
    plan,
    sources: {
      ...sources,
      protein: sources.protein,
      fat: sources.fat,
      // Carbohydrates are derived, so they are automatic again after any change.
      carbohydrates: "auto",
    },
    warning,
  };
}

/** Everything back to automatic - what the "חשב מחדש" button means. */
export function resetToAutomatic(calories: number, weightKg: number): MacroPlanResult {
  return planMacros({ calories, weightKg, sources: ALL_AUTOMATIC, current: {} });
}

// The original two-argument helper still backs the server-side recalculation, so
// the browser and the server cannot drift apart on what a default plan is.
export { calculateMacroTargetResult };
