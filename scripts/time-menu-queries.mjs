// Times every query the saved-menu screen makes, separately, against the real
// database. Written because "the page is slow" is not a diagnosis: the screen
// issues seven queries and only one of them can be the one timing out.
//
//   node scripts/time-menu-queries.mjs [menuId]
//
// Read-only. Signs in as the E2E coach, so it sees exactly what the page sees
// through RLS rather than what a service key would see.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e"), quiet: true });
config({ path: join(root, ".env.local"), override: false, quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const email = process.env.E2E_TEST_COACH_EMAIL ?? process.env.E2E_COACH_EMAIL;
const password = process.env.E2E_TEST_COACH_PASSWORD ?? process.env.E2E_COACH_PASSWORD;
const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error(`coach sign-in failed: ${authError.message}`);
  process.exit(1);
}
const coachId = auth.user.id;

const time = async (label, run) => {
  const started = performance.now();
  const { data, error } = await run();
  const ms = Math.round(performance.now() - started);
  const rows = Array.isArray(data) ? data.length : data ? 1 : 0;
  console.log(`${label.padEnd(34)} ${String(ms).padStart(6)}ms  ${String(rows).padStart(5)} rows${error ? `  ERROR ${error.code ?? ""} ${error.message}` : ""}`);
  return { ms, data, error };
};

let menuId = process.argv[2];
if (!menuId) {
  const { data } = await supabase.from("meal_plans").select("id,title").eq("coach_id", coachId).order("updated_at", { ascending: false }).limit(1);
  menuId = data?.[0]?.id;
  console.log(`using menu ${data?.[0]?.title ?? menuId}\n`);
}
if (!menuId) {
  console.error("no menu to time");
  process.exit(1);
}

console.log("query                                  time    rows");
console.log("-".repeat(62));

const plan = await time("meal_plans (one)", () =>
  supabase.from("meal_plans").select("*").eq("id", menuId).eq("coach_id", coachId).maybeSingle());

await time("client_meal_plan_assignments", () =>
  supabase.from("client_meal_plan_assignments").select("client_id,assigned_from,assigned_until").eq("meal_plan_id", menuId).eq("status", "active").maybeSingle());

const meals = await time("meals", () =>
  supabase.from("meals").select("*").eq("meal_plan_id", menuId).order("day_index").order("sort_order"));

const mealIds = (meals.data ?? []).map((meal) => meal.id);
if (mealIds.length) {
  await time("meal_items", () => supabase.from("meal_items").select("*").in("meal_id", mealIds).order("sort_order"));
  await time("meal_food_groups", () => supabase.from("meal_food_groups").select("*").in("meal_id", mealIds).order("sort_order"));
}

await time("coach_menu_clients", () =>
  supabase.from("profiles").select("id,full_name").eq("role", "client").eq("status", "active"));

await time("coach_food_usage", () =>
  supabase.from("coach_food_usage").select("food_id,selection_count,last_used_at,manual_favorite").eq("coach_id", coachId).order("last_used_at", { ascending: false }));

// The one that loads the whole catalogue on every menu open.
const foods = await time("foods (whole catalogue)", () =>
  supabase.from("foods").select("id,name,brand,category,calories,protein,carbs,fat,serving_label,package_unit,unit_weight_grams,calories_per_unit,units_per_package").order("name"));

console.log("-".repeat(62));
console.log(`plan found: ${plan.data ? "yes" : "no"} · meals: ${mealIds.length} · foods: ${foods.data?.length ?? 0}`);

await supabase.auth.signOut();
