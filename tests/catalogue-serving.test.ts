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

test("a countable product labelled per 100 grams stays per 100 grams", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 155,
    protein: 12.58,
    carbs: 1.12,
    fat: 10.61,
    packageUnit: "יחידה",
    unitWeightGrams: 54.2,
    servingLabel: "ל-100 גרם מוכן",
  }), { calories: 155, protein: 12.58, carbs: 1.12, fat: 10.61, servingLabel: "ל-100 גרם מוכן" });
});

test("the Muller protein yogurt displays one 200 gram cup in Hebrew", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 65,
    protein: 12.5,
    carbs: 2.5,
    fat: 0,
    packageUnit: "גביע",
    unitWeightGrams: 200,
    servingLabel: "גביע 200 גרם",
  }), { calories: 130, protein: 25, carbs: 5, fat: 0, servingLabel: "גביע 200 גרם" });
});

test("both Yoplait GO yogurts display a full 200 gram cup", () => {
  const common = { packageUnit: "גביע", unitWeightGrams: 200, servingLabel: "גביע 200 גרם" };
  assert.deepEqual(catalogueServingNutrition({
    ...common, calories: 72, protein: 10, carbs: 3.5, fat: 2,
  }), { calories: 144, protein: 20, carbs: 7, fat: 4, servingLabel: "גביע 200 גרם" });
  assert.deepEqual(catalogueServingNutrition({
    ...common, calories: 86, protein: 12.5, carbs: 4.4, fat: 2,
  }), { calories: 172, protein: 25, carbs: 8.8, fat: 4, servingLabel: "גביע 200 גרם" });
});

test("protein powder displays the requested 34 gram scoop", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 352.941176,
    protein: 73.529412,
    carbs: 8.823529,
    fat: 4.117647,
    packageUnit: "סקופ",
    unitWeightGrams: 34,
    servingLabel: "סקופ 34 גרם",
  }), { calories: 120, protein: 25, carbs: 3, fat: 1.4, servingLabel: "סקופ 34 גרם" });
});
