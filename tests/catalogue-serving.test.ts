import assert from "node:assert/strict";
import test from "node:test";
import { catalogueServingNutrition } from "../lib/nutrition/catalogue-serving.ts";

test("a 30 gram bread slice displays one slice rather than 100 grams", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 266.667,
    protein: 13.333,
    carbs: 53.333,
    fat: 0,
    packageUnit: "פרוסה",
    unitWeightGrams: 30,
    servingLabel: "1 פרוסה (30 גרם)",
  }), { calories: 80, protein: 4, carbs: 16, fat: 0, servingLabel: "1 פרוסה (30 גרם)" });
});

test("a full-bottle catalogue row without a countable unit stays unchanged", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 192.5,
    protein: 40.3,
    carbs: 7.7,
    fat: 0,
    packageUnit: "מ״ל",
    unitWeightGrams: null,
    servingLabel: "בקבוק שלם · 350 מ״ל",
  }), { calories: 192.5, protein: 40.3, carbs: 7.7, fat: 0, servingLabel: "בקבוק שלם · 350 מ״ל" });
});

test("a sized egg displays one egg rather than asking the client to weigh it", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 155,
    protein: 12.58,
    carbs: 1.12,
    fat: 10.61,
    packageUnit: "ביצה",
    unitWeightGrams: 54.2,
    servingLabel: "1 ביצה קשה L",
  }), { calories: 84, protein: 6.8, carbs: 0.6, fat: 5.8, servingLabel: "1 ביצה קשה L" });
});

test("egg sizes use their edible unit weights", () => {
  const sizes = [
    ["S", 35.5, 50.8],
    ["M", 45.2, 64.6],
    ["L", 54.2, 77.5],
    ["XL", 61.3, 87.7],
  ] as const;
  for (const [size, grams, calories] of sizes) {
    assert.equal(catalogueServingNutrition({
      calories: 143,
      protein: 12.56,
      carbs: 0.72,
      fat: 9.51,
      packageUnit: "ביצה",
      unitWeightGrams: grams,
      servingLabel: `1 ביצה ${size}`,
    }).calories, calories);
  }
});

test("an Open Food Facts bottle scales per-100 values to its stated millilitres", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 37,
    protein: 7.2,
    carbs: 2.1,
    fat: 0,
    packageUnit: "גרם",
    unitWeightGrams: null,
    servingLabel: "350 ml",
    source: "openfoodfacts",
  }), { calories: 129.5, protein: 25.2, carbs: 7.4, fat: 0, servingLabel: "350 מ״ל" });
});

test("a manually stored full bottle is not scaled twice", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 192.5,
    protein: 40.3,
    carbs: 7.7,
    fat: 0,
    packageUnit: "מ״ל",
    unitWeightGrams: null,
    servingLabel: "בקבוק שלם · 350 מ״ל",
    source: "manual",
  }), { calories: 192.5, protein: 40.3, carbs: 7.7, fat: 0, servingLabel: "בקבוק שלם · 350 מ״ל" });
});

test("a curated yoghurt displays one 200 gram cup", () => {
  assert.deepEqual(catalogueServingNutrition({
    name: "יופלה GO טבעי 20 גרם חלבון",
    category: "יוגורט חלבון",
    calories: 72,
    protein: 10,
    carbs: 3.5,
    fat: 2,
    packageUnit: "גרם",
    unitWeightGrams: null,
    servingLabel: "ל-100 גרם",
    source: "start",
  }), { calories: 144, protein: 20, carbs: 7, fat: 4, servingLabel: "200 גרם" });
});

test("a curated drink displays one 350 millilitre bottle", () => {
  assert.deepEqual(catalogueServingNutrition({
    name: "משקה קפה עם חלבון חלב",
    category: "משקאות",
    calories: 37,
    protein: 7.2,
    carbs: 2.1,
    fat: 0,
    packageUnit: "מ״ל",
    unitWeightGrams: null,
    servingLabel: "350 ml",
    source: "start",
  }), { calories: 129.5, protein: 25.2, carbs: 7.4, fat: 0, servingLabel: "350 מ״ל" });
});
