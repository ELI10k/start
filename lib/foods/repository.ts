import foodData from "../../data/foods.json" with { type: "json" };
import type { Food, FoodQuery } from "./types.ts";

export const ALL_CATEGORIES = "הכול";
export function normalizeFoodText(value: string): string { return value.toLocaleLowerCase("he").normalize("NFKC").replace(/[־–—-]/g, " ").replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, "").replace(/[׳'״"]/g, "").replace(/\s+/g, " ").trim(); }

const foods = Object.freeze(foodData as Food[]);
const byId = new Map(foods.map((food) => [food.id, food]));
const categories = Object.freeze([...new Set(foods.map((food) => food.category))].sort((a, b) => a.localeCompare(b, "he")));
const safe = (value?: number) => typeof value === "number" && Number.isFinite(value) ? value : 0;

export function queryFoods(source: readonly Food[], query: FoodQuery = {}): Food[] {
  const search = normalizeFoodText(query.search ?? "");
  const category = query.category ?? ALL_CATEGORIES;
  return source.filter((food) => (category === ALL_CATEGORIES || food.category === category) && (!search || normalizeFoodText([food.name, food.brand, food.category, food.barcode].filter(Boolean).join(" ")).includes(search))).sort((a, b) => {
    switch (query.sort ?? "relevant") {
      case "protein-high": return safe(b.protein) - safe(a.protein) || a.id.localeCompare(b.id, "he", { numeric: true });
      case "calories-low": return a.calories - b.calories || a.id.localeCompare(b.id, "he", { numeric: true });
      case "calories-high": return b.calories - a.calories || a.id.localeCompare(b.id, "he", { numeric: true });
      case "alphabetical": return a.name.localeCompare(b.name, "he") || a.id.localeCompare(b.id, "he", { numeric: true });
      default: return 0;
    }
  });
}

export const foodRepository = Object.freeze({
  getAll: (): readonly Food[] => foods,
  getById: (id: string): Food | undefined => byId.get(id),
  getCategories: (): readonly string[] => categories,
  query: (query?: FoodQuery): Food[] => queryFoods(foods, query),
});
