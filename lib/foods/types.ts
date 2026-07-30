export type Food = Readonly<{
  id: string;
  name: string;
  brand?: string;
  category: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugars?: number;
  sodiumMg?: number;
  calciumMg?: number;
  packageQuantity?: number;
  packageUnit?: string;
  barcode?: string;
  servingLabel: string;
  verificationStatus?: string;
  notes?: string;
  sourceUrl?: string;
  unitWeightGrams?: number;
  caloriesPerUnit?: number;
  unitsPerPackage?: number;
}>;

export type FoodSort = "relevant" | "protein-high" | "calories-low" | "calories-high" | "alphabetical";
export type FoodQuery = Readonly<{ search?: string; category?: string; sort?: FoodSort }>;
