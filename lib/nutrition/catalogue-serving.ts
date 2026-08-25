import { hasNaturalUnit, portionFor } from "./meal-alternatives.ts";

export type CatalogueNutritionInput = Readonly<{
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  packageUnit: string | null;
  unitWeightGrams: number | null;
  servingLabel: string | null;
}>;

/** Values shown beside a catalogue serving label, rather than per 100 g. */
export function catalogueServingNutrition(food: CatalogueNutritionInput) {
  const servingLabel = food.servingLabel?.trim() || "ל־100 גרם";
  // The nutrition columns are the source-of-truth per 100 g for official and
  // master foods. Scale only when the label explicitly describes a serving.
  // A regular egg may carry a unit weight for menu calculations while its
  // catalogue label still says "ל-100 גרם"; scaling that row but leaving that
  // label visible was the source of many apparently incorrect cards.
  const labelIsPer100 = /(?:^|\D)100(?:\D|$)/.test(servingLabel);
  if (!labelIsPer100 && hasNaturalUnit(food)) {
    const portion = portionFor(food, 1);
    if (portion) return {
      calories: portion.calories,
      protein: portion.protein,
      carbs: portion.carbs,
      fat: portion.fat,
      servingLabel,
    };
  }
  // Mass/volume rows have no countable unit to scale. Their stored values are
  // already the figures the catalogue has been instructed to display.
  return {
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    servingLabel,
  };
}
