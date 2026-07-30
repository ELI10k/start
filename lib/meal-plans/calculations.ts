import type { Food } from "../foods.ts";
import type { MacroTargets, MacroValues, Meal, MealFoodItem, MealPlan, MealPlanSummary } from "./types.ts";

export const ZERO_MACROS: MacroValues = Object.freeze({ calories: 0, protein: 0, carbs: 0, fat: 0 });

function safeNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function round(value: number): number { return Number(safeNumber(value).toFixed(1)); }

export function sanitizeQuantity(quantity: number): number {
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

export function calculateFoodNutrition(food: Partial<Pick<Food, "calories" | "protein" | "carbs" | "fat">>, quantityGrams: number): MacroValues {
  const multiplier = sanitizeQuantity(quantityGrams) / 100;
  return {
    calories: round(safeNumber(food.calories) * multiplier),
    protein: round(safeNumber(food.protein) * multiplier),
    carbs: round(safeNumber(food.carbs) * multiplier),
    fat: round(safeNumber(food.fat) * multiplier),
  };
}

export function addMacros(...values: readonly MacroValues[]): MacroValues {
  return values.reduce<MacroValues>((sum, value) => ({
    calories: round(sum.calories + safeNumber(value.calories)),
    protein: round(sum.protein + safeNumber(value.protein)),
    carbs: round(sum.carbs + safeNumber(value.carbs)),
    fat: round(sum.fat + safeNumber(value.fat)),
  }), ZERO_MACROS);
}

export function calculateItemTotal(item: MealFoodItem, foodsById: ReadonlyMap<string, Food>): MacroValues {
  const food = foodsById.get(item.foodId);
  return food ? calculateFoodNutrition(food, item.quantityGrams) : ZERO_MACROS;
}

export function calculateMealTotals(meal: Meal, foodsById: ReadonlyMap<string, Food>): MacroValues {
  return addMacros(...meal.items.map((item) => calculateItemTotal(item, foodsById)));
}

export function calculatePlanTotals(plan: Pick<MealPlan, "meals">, foodsById: ReadonlyMap<string, Food>): MacroValues {
  return addMacros(...plan.meals.map((meal) => calculateMealTotals(meal, foodsById)));
}

export function calculateTargetDifferences(totals: MacroValues, targets: MacroTargets): MacroValues {
  return {
    calories: round(safeNumber(targets.calories) - totals.calories),
    protein: round(safeNumber(targets.protein) - totals.protein),
    carbs: round(safeNumber(targets.carbs) - totals.carbs),
    fat: round(safeNumber(targets.fat) - totals.fat),
  };
}

export function calculateCalorieProgress(total: number, target?: number): number {
  const safeTarget = safeNumber(target);
  if (safeTarget <= 0) return 0;
  return round(Math.max(0, safeNumber(total)) / safeTarget * 100);
}

export function calculateProgressPercentages(totals: MacroValues, targets: MacroTargets): MacroValues {
  return {
    calories: calculateCalorieProgress(totals.calories, targets.calories),
    protein: calculateCalorieProgress(totals.protein, targets.protein),
    carbs: calculateCalorieProgress(totals.carbs, targets.carbs),
    fat: calculateCalorieProgress(totals.fat, targets.fat),
  };
}

export function calculatePlanSummary(plan: MealPlan, foodsById: ReadonlyMap<string, Food>): MealPlanSummary {
  const totals = calculatePlanTotals(plan, foodsById);
  return {
    totals,
    differences: calculateTargetDifferences(totals, plan.targets),
    calorieProgressPercent: calculateCalorieProgress(totals.calories, plan.targets.calories),
    progressPercentages: calculateProgressPercentages(totals, plan.targets),
    mealCount: plan.meals.length,
    foodCount: plan.meals.reduce((count, meal) => count + meal.items.length, 0),
  };
}
