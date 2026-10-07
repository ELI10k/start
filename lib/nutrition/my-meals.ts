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
