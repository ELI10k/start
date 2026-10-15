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

test("both Yotvata PRO coffees display one full 350 ml bottle", () => {
  const bottle = {
    packageUnit: "בקבוק",
    unitWeightGrams: 350,
    servingLabel: "בקבוק 350 מ״ל",
  };
  assert.deepEqual(catalogueServingNutrition({
    ...bottle,
    calories: 37,
    protein: 7.2,
    carbs: 2.1,
    fat: 0,
  }), {
    calories: 129.5,
    protein: 25.2,
    carbs: 7.4,
    fat: 0,
    servingLabel: "בקבוק 350 מ״ל",
  });
  assert.deepEqual(catalogueServingNutrition({
    ...bottle,
    calories: 63,
    protein: 7.2,
    carbs: 5.1,
    fat: 1.5,
  }), {
    calories: 220.5,
    protein: 25.2,
    carbs: 17.8,
    fat: 5.3,
    servingLabel: "בקבוק 350 מ״ל",
  });
});

test("the Yotvata coffee migration preserves per-100 ml nutrition and defines the bottle", async () => {
  const { readFile } = await import("node:fs/promises");
  const migration = await readFile(new URL("../supabase/migrations/20261013153558_fix_yotvata_pro_coffee_bottle_servings.sql", import.meta.url), "utf8");
  assert.match(migration, /barcode-7290119387465/);
  assert.match(migration, /barcode-7290119387472/);
  assert.match(migration, /package_unit = 'בקבוק'/);
  assert.match(migration, /unit_weight_grams = 350/);
  assert.match(migration, /serving_label = 'בקבוק 350 מ״ל'/);
  assert.doesNotMatch(migration, /\n\s*(?:calories|protein|carbs|fat)\s*=/);
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

test("the Muller vanilla protein drink displays one 350 ml bottle", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 64,
    protein: 11.43,
    carbs: 4.5,
    fat: 0,
    packageUnit: "בקבוק",
    unitWeightGrams: 350,
    servingLabel: "בקבוק 350 מ״ל",
  }), {
    calories: 224,
    protein: 40,
    carbs: 15.8,
    fat: 0,
    servingLabel: "בקבוק 350 מ״ל",
  });
});

test("Danone PRO 1.5% displays nutrition for the full 200 gram cup", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 70,
    protein: 10,
    carbs: 3.4,
    fat: 1.5,
    packageUnit: "גביע",
    unitWeightGrams: 200,
    servingLabel: "גביע 200 גרם",
  }), { calories: 140, protein: 20, carbs: 6.8, fat: 3, servingLabel: "גביע 200 גרם" });
});

test("Danone PRO variants display nutrition for their full packages", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 56, protein: 9.3, carbs: 3.9, fat: 0,
    packageUnit: "גביע", unitWeightGrams: 215, servingLabel: "גביע 215 גרם",
  }), { calories: 120.4, protein: 20, carbs: 8.4, fat: 0, servingLabel: "גביע 215 גרם" });
  assert.deepEqual(catalogueServingNutrition({
    calories: 61, protein: 8, carbs: 4.2, fat: 1,
    packageUnit: "בקבוק", unitWeightGrams: 250, servingLabel: "בקבוק 250 מ״ל",
  }), { calories: 152.5, protein: 20, carbs: 10.5, fat: 2.5, servingLabel: "בקבוק 250 מ״ל" });
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

test("the pastry cream dessert displays its full 150 gram unit", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 466.67,
    protein: 6.67,
    carbs: 46.67,
    fat: 28,
    packageUnit: "יחידה",
    unitWeightGrams: 150,
    servingLabel: "יחידה 150 גרם",
  }), {
    calories: 700,
    protein: 10,
    carbs: 70,
    fat: 42,
    servingLabel: "יחידה 150 גרם",
  });
});

test("Hot Pop reduced-fat popcorn displays one 85 gram bag", () => {
  assert.deepEqual(catalogueServingNutrition({
    calories: 356.470588,
    protein: 10,
    carbs: 55.058824,
    fat: 8,
    packageUnit: "שקית",
    unitWeightGrams: 85,
    servingLabel: "שקית 85 גרם",
  }), {
    calories: 303,
    protein: 8.5,
    carbs: 46.8,
    fat: 6.8,
    servingLabel: "שקית 85 גרם",
  });
});
