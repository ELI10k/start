import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { foodShelves, foodsOnShelf } from "../lib/foods/shelves.ts";

const food = (id: string, category: string, protein: number, carbs: number, fat: number, name = id) =>
  ({ id, name, category, protein, carbs, fat });
const catalogue = [
  food("chicken", "עוף והודו טרי", 31, 0, 3),
  food("rice", "אורז", 3, 28, 0),
  food("oil", "שמנים", 0, 0, 100),
  food("cucumber", "ירקות", 1, 3, 0, "מלפפון"),
  food("toast", "טוסטים ארומה", 12, 30, 9),
  food("bowl", "BOWLS ארומה", 20, 40, 10),
  food("shawarma", "אוכל רחוב", 30, 169, 98),
  food("donut", "חנוכה", 5, 50, 20),
];
const ids = (shelf: string) => foodsOnShelf(catalogue, shelf).map((item) => item.id);

test("the chip row is macro groups and chains, not supplier categories", () => {
  assert.deepEqual(foodShelves(catalogue).map((shelf) => shelf.label),
    ["הכול", "חלבון", "פחמימה", "שומן", "ירקות", "ארומה", "אוכל רחוב"]);
});

test("every Aroma category folds into one chip", () => {
  assert.deepEqual(ids("chain:ארומה"), ["toast", "bowl"]);
});

test("chain dishes stay under their chain, not under a macro group", () => {
  assert.deepEqual(ids("protein"), ["chicken"]);
  assert.deepEqual(ids("chain:אוכל רחוב"), ["shawarma"]);
});

test("Hanukkah has no chip; its foods land by macro", () => {
  assert.ok(ids("carbohydrate").includes("donut"));
  assert.ok(!foodShelves(catalogue).some((shelf) => shelf.label === "חנוכה"));
});

test("everything comes first, master foods right after", () => {
  const withMaster = [food("master-p-1", "מאסטר · חלבון", 25, 0, 2), ...catalogue];
  assert.deepEqual(foodShelves(withMaster).slice(0, 2).map((shelf) => shelf.label), ["הכול", "מאסטר"]);
  assert.deepEqual(foodsOnShelf(withMaster, "master").map((item) => item.id), ["master-p-1"]);
});

test("the catalogue offers a way back to the filters", async () => {
  const component = await readFile(new URL("../components/FoodDatabase.tsx", import.meta.url), "utf8");
  assert.match(component, /חזרה לראש הרשימה/);
  assert.match(component, /window\.scrollTo\(\{ top: 0/);
  assert.match(component, /הצגת עוד/);
});
