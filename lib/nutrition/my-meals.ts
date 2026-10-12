export type MyMealItem = Readonly<{
  id: string;
  foodId: string | null;
  name: string;
  quantity: number;
  unit: string;
  sortOrder: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  per100: Readonly<{ calories: number; protein: number; carbs: number; fat: number }>;
  nutritionEstimated?: boolean;
}>;

export type MyMeal = Readonly<{
  id: string;
  name: string;
  updatedAt: string;
  items: readonly MyMealItem[];
}>;
