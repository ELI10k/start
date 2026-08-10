// Measures the queries behind /coach/menus/[id] against the live database so the
// slow leg can be identified rather than guessed at. Read-only.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e") });
config({ path: join(root, ".env.local"), override: false });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.E2E_COACH_EMAIL;
const password = process.env.E2E_COACH_PASSWORD;

if (!url || !anon) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function time(label, run) {
  const started = Date.now();
  try {
    const result = await run();
    const ms = Date.now() - started;
    const rows = Array.isArray(result?.data) ? result.data.length : result?.data ? 1 : 0;
    console.log(
      `${String(ms).padStart(6)}ms  ${label.padEnd(34)} rows=${String(rows).padStart(6)}` +
        (result?.count != null ? ` count=${result.count}` : "") +
        (result?.error ? `  ERROR ${result.error.code ?? ""} ${result.error.message}` : ""),
    );
    return result;
  } catch (error) {
    console.log(`${String(Date.now() - started).padStart(6)}ms  ${label.padEnd(34)} THREW ${error.message}`);
    return { data: null, error };
  }
}

if (email && password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) console.error(`sign-in failed: ${error.message} — continuing anonymously`);
  else console.log(`signed in as ${email}\n`);
}

await time("foods count(head)", () =>
  supabase.from("foods").select("id", { count: "exact", head: true }),
);

await time("foods full catalog (current)", () =>
  supabase
    .from("foods")
    .select(
      "id,name,brand,category,calories,protein,carbs,fat,serving_label,package_unit,unit_weight_grams,calories_per_unit,units_per_package",
    )
    .order("name"),
);

await time("foods first 200 by name", () =>
  supabase
    .from("foods")
    .select(
      "id,name,brand,category,calories,protein,carbs,fat,serving_label,package_unit,unit_weight_grams,calories_per_unit,units_per_package",
    )
    .order("name")
    .limit(200),
);

const { data: plans } = await time("meal_plans list", () =>
  supabase.from("meal_plans").select("id,title,coach_id").limit(5),
);

const planId = plans?.[0]?.id;
if (planId) {
  const { data: meals } = await time("meals for plan", () =>
    supabase.from("meals").select("*").eq("meal_plan_id", planId).order("day_index"),
  );
  const mealIds = (meals ?? []).map((meal) => meal.id);
  if (mealIds.length) {
    await time("meal_items for plan", () =>
      supabase.from("meal_items").select("*").in("meal_id", mealIds).order("sort_order"),
    );
    await time("meal_food_groups for plan", () =>
      supabase.from("meal_food_groups").select("*").in("meal_id", mealIds).order("sort_order"),
    );
  }
}

await time("coach_food_usage", () =>
  supabase.from("coach_food_usage").select("food_id,selection_count,last_used_at,manual_favorite"),
);

const { data: me } = await supabase.auth.getUser();
const coachId = me?.user?.id;
console.log("\n-- listCoachDashboardClients legs --");
const { data: relationships } = await time("coach_client_relationships", () =>
  supabase
    .from("coach_client_relationships")
    .select("client_id,status,start_date")
    .eq("coach_id", coachId)
    .eq("status", "active"),
);
const clientIds = (relationships ?? []).map((row) => row.client_id);
if (clientIds.length) {
  await time("profiles .in(ids)", () =>
    supabase.from("profiles").select("id,full_name,email,phone,status,avatar_url").in("id", clientIds),
  );
  await time("client_profiles .in(ids)", () =>
    supabase
      .from("client_profiles")
      .select(
        "user_id,goal,target_weight,height,birth_date,activity_level,calorie_target,protein_target,preferences,notes,onboarding_completed,onboarding_completed_at",
      )
      .in("user_id", clientIds),
  );
  await time("progress_entries .in(ids) ALL", () =>
    supabase
      .from("progress_entries")
      .select("client_id,weight,date")
      .in("client_id", clientIds)
      .order("date", { ascending: false }),
  );
  await time("check_ins .in(ids) ALL", () =>
    supabase
      .from("check_ins")
      .select("client_id,submitted_at")
      .in("client_id", clientIds)
      .order("submitted_at", { ascending: false }),
  );
  await time("device_sessions .in(ids) ALL", () =>
    supabase
      .from("device_sessions")
      .select("user_id,last_seen_at")
      .in("user_id", clientIds)
      .is("revoked_at", null)
      .order("last_seen_at", { ascending: false }),
  );
}

await supabase.auth.signOut();
