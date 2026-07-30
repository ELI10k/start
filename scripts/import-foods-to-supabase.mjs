import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const foods = JSON.parse(await readFile(new URL("../data/foods.json", import.meta.url), "utf8"));
const n = (value) => value === undefined ? null : value;
const rows = foods.map((food) => ({ id: food.id, name: food.name, brand: n(food.brand), category: food.category, calories: food.calories, protein: n(food.protein), carbs: n(food.carbs), fat: n(food.fat), sugars: n(food.sugars), sodium_mg: n(food.sodiumMg), calcium_mg: n(food.calciumMg), package_quantity: n(food.packageQuantity), package_unit: n(food.packageUnit), barcode: n(food.barcode), serving_label: food.servingLabel, verification_status: n(food.verificationStatus), notes: n(food.notes), source_url: n(food.sourceUrl), unit_weight_grams: n(food.unitWeightGrams), calories_per_unit: n(food.caloriesPerUnit), units_per_package: n(food.unitsPerPackage) }));
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (let index = 0; index < rows.length; index += 100) { const { error } = await supabase.from("foods").upsert(rows.slice(index, index + 100), { onConflict: "id" }); if (error) throw error; }
const { count, error } = await supabase.from("foods").select("id", { count: "exact", head: true });
if (error) throw error;
if (count !== foods.length) throw new Error(`Food count mismatch: database=${count}, approved=${foods.length}`);
console.log(JSON.stringify({ imported: rows.length, databaseCount: count, expected: 336, idempotent: true }));
