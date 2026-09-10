import { hasNaturalUnit, portionFor } from "./meal-alternatives.ts";

export type CatalogueNutritionInput = Readonly<{
  name?: string | null;
  category?: string | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  packageUnit: string | null;
  unitWeightGrams: number | null;
  servingLabel: string | null;
  source?: string | null;
}>;

const rounded = (value: number | null) => value === null ? null : Math.round(value * 10) / 10;

function explicitMetricServing(label: string) {
  const match = label.match(/(?:^|\D)(\d+(?:[.,]\d+)?)\s*(?:מ[״\"]?ל|ml|גר(?:ם)?|g)(?:\D|$)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function curatedServing(food: CatalogueNutritionInput) {
  if (food.source !== "start") return null;
  const category = food.category?.trim() ?? "";
  const name = food.name?.trim() ?? "";
  if (/יוגורט/.test(category) || /יוגורט/.test(name)) {
    return { amount: 200, label: "200 גרם" };
  }
  if (/משקאות/.test(category) || /^משקה\b/.test(name)) {
    return { amount: 350, label: "350 מ״ל" };
  }
  return null;
}

function scaledNutrition(food: CatalogueNutritionInput, amount: number, servingLabel: string) {
  const factor = amount / 100;
  return {
    calories: rounded(food.calories * factor) ?? 0,
    protein: rounded(food.protein === null ? null : food.protein * factor),
    carbs: rounded(food.carbs === null ? null : food.carbs * factor),
    fat: rounded(food.fat === null ? null : food.fat * factor),
    servingLabel,
  };
}

/** Values shown beside a catalogue serving label, rather than per 100 g. */
export function catalogueServingNutrition(food: CatalogueNutritionInput) {
  const servingLabel = food.servingLabel?.trim() || "ל־100 גרם";
  const curated = curatedServing(food);
  if (curated) return scaledNutrition(food, curated.amount, curated.label);
  // The nutrition columns are the source-of-truth per 100 g for official and
  // master foods. Scale only when the label explicitly describes a serving.
  // A regular egg may carry a unit weight for menu calculations while its
  // catalogue label still says "ל-100 גרם"; scaling that row but leaving that
  // label visible was the source of many apparently incorrect cards.
  const labelIsPer100 = /(?:^|\D)100(?:\D|$)/.test(servingLabel);
  // Open Food Facts nutrition fields are imported per 100 g/ml. Its serving
  // label, however, often describes the whole bottle or package. When that
  // label contains an explicit metric amount, display the nutrition for that
  // amount so "350 ml" never sits beside values that still mean 100 ml.
  const metricServing = food.source === "openfoodfacts" && !labelIsPer100
    ? explicitMetricServing(servingLabel)
    : null;
  if (metricServing !== null) {
    return scaledNutrition(
      food,
      metricServing,
      servingLabel.replace(/\bml\b/i, "מ״ל").replace(/\bg\b/i, "גרם"),
    );
  }
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
