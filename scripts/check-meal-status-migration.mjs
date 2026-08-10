// Verifies that 202608100001_meal_day_status.sql actually landed: the table is
// readable under RLS, and the function exists and rejects a bad status. Read-only
// apart from one deliberately invalid RPC call, which raises before it writes.
//
//   node scripts/check-meal-status-migration.mjs

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

const { error: tableError } = await supabase.from("meal_day_status").select("id").limit(1);
if (tableError) {
  ok = false;
  console.log(`table meal_day_status      MISSING  (${tableError.code ?? ""} ${tableError.message})`);
} else {
  console.log("table meal_day_status      present and readable");
}

// A status the check constraint forbids. If the function exists it raises
// invalid_meal_status; if it does not exist PostgREST says so instead.
const { error: rpcError } = await supabase.rpc("set_meal_day_status", {
  p_meal_id: "00000000-0000-0000-0000-000000000000",
  p_date: "2026-01-01",
  p_status: "nonsense",
});
const message = rpcError?.message ?? "";
if (message.includes("invalid_meal_status")) {
  console.log("rpc set_meal_day_status    present, validates its input");
} else if (message.includes("client_required")) {
  console.log("rpc set_meal_day_status    present (signed-in user is not a client)");
} else if (!rpcError) {
  ok = false;
  console.log("rpc set_meal_day_status    present but accepted an invalid status");
} else {
  ok = false;
  console.log(`rpc set_meal_day_status    MISSING  (${rpcError.code ?? ""} ${message})`);
}

// set_meal_eaten must still exist, since the wrapper is what old callers use.
const { error: legacyError } = await supabase.rpc("set_meal_eaten", {
  p_meal_id: "00000000-0000-0000-0000-000000000000",
  p_date: "2026-01-01",
  p_eaten: false,
});
const legacyMessage = legacyError?.message ?? "";
if (legacyMessage.includes("meal_not_assigned") || legacyMessage.includes("client_required")) {
  console.log("rpc set_meal_eaten         present");
} else if (legacyError?.code === "PGRST202") {
  ok = false;
  console.log(`rpc set_meal_eaten         MISSING  (${legacyMessage})`);
} else {
  console.log(`rpc set_meal_eaten         present (${legacyMessage || "no error"})`);
}

await supabase.auth.signOut();
console.log(ok ? "\nmigration applied" : "\nmigration NOT fully applied");
process.exit(ok ? 0 : 1);
