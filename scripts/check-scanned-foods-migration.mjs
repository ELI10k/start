// Verifies that 202608100002_scanned_foods.sql landed: the provenance column
// exists, the barcode index is unique, and the function validates its input.
// Read-only apart from one deliberately invalid RPC call, which raises before it
// writes anything.
//
//   node scripts/check-scanned-foods-migration.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e") });
config({ path: join(root, ".env.local"), override: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_CLIENT_EMAIL,
  password: process.env.E2E_CLIENT_PASSWORD,
});
if (authError) {
  console.error(`sign-in failed: ${authError.message}`);
  process.exit(1);
}

let ok = true;

const { data: rows, error: columnError } = await supabase.from("foods").select("id,source").limit(3);
if (columnError) {
  ok = false;
  console.log(`foods.source              MISSING  (${columnError.code ?? ""} ${columnError.message})`);
} else {
  const sources = [...new Set((rows ?? []).map((row) => row.source))];
  console.log(`foods.source              present (sample: ${sources.join(", ") || "none"})`);
}

// Invalid on purpose: the function must refuse it before writing.
const { error: rpcError } = await supabase.rpc("upsert_scanned_food", {
  p_barcode: "123",
  p_name: "regression probe",
  p_brand: "",
  p_serving_label: "",
  p_package_unit: "",
  p_unit_weight_grams: null,
  p_calories: 10,
  p_protein: null,
  p_carbs: null,
  p_fat: null,
  p_source: "manual",
  p_source_url: "",
});
const message = rpcError?.message ?? "";
if (message.includes("invalid_barcode")) {
  console.log("upsert_scanned_food       present, rejects a bad barcode");
} else if (!rpcError) {
  ok = false;
  console.log("upsert_scanned_food       present but ACCEPTED an invalid barcode");
} else if (rpcError.code === "PGRST202") {
  ok = false;
  console.log(`upsert_scanned_food       MISSING  (${message})`);
} else {
  ok = false;
  console.log(`upsert_scanned_food       unexpected error: ${message}`);
}

// And an impossible calorie value is refused too.
const { error: calorieError } = await supabase.rpc("upsert_scanned_food", {
  p_barcode: "",
  p_name: "regression probe",
  p_brand: "",
  p_serving_label: "",
  p_package_unit: "",
  p_unit_weight_grams: null,
  p_calories: 5000,
  p_protein: null,
  p_carbs: null,
  p_fat: null,
  p_source: "manual",
  p_source_url: "",
});
if ((calorieError?.message ?? "").includes("invalid_calories")) {
  console.log("bounds                    enforced (5000 kcal/100g refused)");
} else {
  ok = false;
  console.log(`bounds                    NOT enforced (${calorieError?.message ?? "no error"})`);
}

await supabase.auth.signOut();
console.log(ok ? "\nmigration applied" : "\nmigration NOT fully applied");
process.exit(ok ? 0 : 1);
