import assert from "node:assert/strict";
import test from "node:test";
import { parseFoodRows } from "../lib/food-import.ts";

const header = ["מס׳", "קטגוריה", "שם המוצר", "מותג", "קלוריות", "חלבון (ג׳)", "פחמימות (ג׳)", "שומן (ג׳)", "בסיס הערכים"];
test("food import preserves valid values and missing optional macros", () => { const foods = parseFoodRows([["title"], header, ["a", "קטגוריה", "מוצר", "מותג", 100, "", 12.5, 3, "ל-100 גרם"]]); assert.deepEqual(foods, [{ id: "a", name: "מוצר", brand: "מותג", category: "קטגוריה", calories: 100, protein: undefined, carbs: 12.5, fat: 3, sugars: undefined, sodiumMg: undefined, calciumMg: undefined, packageQuantity: undefined, packageUnit: undefined, barcode: undefined, servingLabel: "ל-100 גרם", verificationStatus: undefined, notes: undefined, sourceUrl: undefined, unitWeightGrams: undefined, caloriesPerUnit: undefined, unitsPerPackage: undefined }]); });
test("food import safely ignores invalid required rows and duplicate IDs", () => { const foods = parseFoodRows([header, ["1", "", "ללא קטגוריה", "", 100, 1, 1, 1, "ל-100 גרם"], ["2", "תקין", "ללא קלוריות", "", "", 1, 1, 1, "ל-100 גרם"], ["3", "תקין", "מוצר", "", 100, 1, 1, 1, "ל-100 גרם"], ["3", "תקין", "כפול", "", 100, 1, 1, 1, "ל-100 גרם"]]); assert.deepEqual(foods.map((food) => food.name), ["מוצר"]); });
