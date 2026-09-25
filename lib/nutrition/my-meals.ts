export type MyMealItem = Readonly<{
  id: string;
  foodId: string;
  name: string;
  quantity: number;
  unit: string;
  sortOrder: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}>;

export type MyMeal = Readonly<{
  id: string;
  name: string;
  updatedAt: string;
  items: readonly MyMealItem[];
}>;

export const myMealTotals = (meal: Pick<MyMeal, "items">) => meal.items.reduce(
  (sum, item) => ({
    calories: sum.calories + item.calories,
    protein: sum.protein + item.protein,
    carbs: sum.carbs + item.carbs,
    fat: sum.fat + item.fat,
  }),
  { calories: 0, protein: 0, carbs: 0, fat: 0 },
);
