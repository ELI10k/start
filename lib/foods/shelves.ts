import { foodsForGroup, type ClassifiableFood } from "../nutrition/food-groups.ts";
import { isMasterFood } from "../nutrition/master-foods.ts";

// The chip row of the food database. The catalogue carries some ninety
// supplier categories - "אבקות חלבון", "אורז", "טוסטים ארומה" - far too many to
// scan as chips. What a client or coach looks for is a macro group or a chain,
// so the row offers those and the supplier category stays on the card, where
// search still reaches it ("חנוכה" finds the doughnuts without a chip).

export type FoodShelf = Readonly<{ key: string; label: string }>;

export const ALL_SHELF = "all";
export const MASTER_SHELF = "master";

const MACRO_SHELVES = [
  { key: "protein", label: "חלבון" },
  { key: "carbohydrate", label: "פחמימה" },
  { key: "fat", label: "שומן" },
  { key: "vegetables", label: "ירקות" },
] as const;

// A chain's dishes are found by the chain, not by their macros: a shawarma in a
// pita belongs under "אוכל רחוב", not next to chicken breast under "חלבון".
const CHAINS = ["ארומה", "מקדונלד'ס", "KFC", "דומינוס", "אוכל רחוב"] as const;

export function foodChain(category: string | undefined): string | null {
  const value = category?.trim() ?? "";
  // Aroma's menu arrives as a dozen categories: "טוסטים ארומה", "BOWLS ארומה"…
  if (value.endsWith("ארומה")) return "ארומה";
  return (CHAINS as readonly string[]).includes(value) ? value : null;
}

// Right to left: everything, master foods, the macro groups, then the chains
// the catalogue actually holds. Favourites, a toggle that combines with any
// shelf, are drawn between "הכול" and the rest.
export function foodShelves(foods: readonly ClassifiableFood[]): readonly FoodShelf[] {
  const chains = new Set(foods.map((food) => foodChain(food.category)));
  return [
    { key: ALL_SHELF, label: "הכול" },
    ...(foods.some((food) => isMasterFood(food.id))
      ? [{ key: MASTER_SHELF, label: "מאסטר" }]
      : []),
    ...MACRO_SHELVES,
    ...CHAINS.filter((chain) => chains.has(chain)).map((chain) => ({
      key: `chain:${chain}`,
      label: chain,
    })),
  ];
}

export function foodsOnShelf<T extends ClassifiableFood>(foods: readonly T[], shelf: string): readonly T[] {
  if (shelf === ALL_SHELF) return foods;
  if (shelf === MASTER_SHELF) return foods.filter((food) => isMasterFood(food.id));
  if (shelf.startsWith("chain:")) {
    const chain = shelf.slice("chain:".length);
    return foods.filter((food) => foodChain(food.category) === chain);
  }
  const macro = MACRO_SHELVES.find((item) => item.key === shelf);
  if (!macro) return foods;
  return foodsForGroup(foods.filter((food) => !foodChain(food.category)), macro.key);
}
