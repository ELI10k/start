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
