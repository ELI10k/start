export type MacroValues = Readonly<{ calories: number; protein: number; carbs: number; fat: number }>;
export type NutritionTotals = MacroValues;

export type MacroTargets = Readonly<{ calories?: number; protein?: number; carbs?: number; fat?: number }>;

export type MealFoodItem = Readonly<{
  id: string;
  foodId: string;
  quantityGrams: number;
}>;

export type Meal = Readonly<{
  id: string;
  name: string;
  order: number;
  note?: string;
  items: readonly MealFoodItem[];
}>;

export type MealPlanStatus = "active" | "draft";

export type MealPlan = Readonly<{
  id: string;
  name: string;
  description?: string;
  targets: MacroTargets;
  status: MealPlanStatus;
  meals: readonly Meal[];
  assignedClientId?: string;
  updatedAt: string;
}>;

export type MealPlanSummary = Readonly<{
  totals: MacroValues;
  differences: MacroValues;
  calorieProgressPercent: number;
  progressPercentages: MacroValues;
  mealCount: number;
  foodCount: number;
}>;

export type ClientMealPlanAssignment = Readonly<{ clientId: string; mealPlanId: string }>;
