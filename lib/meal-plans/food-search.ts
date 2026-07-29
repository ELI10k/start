import type { Food, FoodSort } from "../foods.ts";
import { normalizeFoodText, queryFoods } from "../foods/repository.ts";
export type { FoodSort } from "../foods/types.ts";
export { normalizeFoodText };
export function filterAndSortFoods(foods: readonly Food[], query = "", category = "הכול", sort: FoodSort = "relevant"): Food[] { return queryFoods(foods, { search: query, category, sort }); }
