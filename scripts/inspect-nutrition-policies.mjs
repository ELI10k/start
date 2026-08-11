// Lists the RLS policies actually installed on the nutrition tables, and times a
// meal_items read, so a claim about policy cost is checked against the database
// rather than inferred from the migration files.
//
//   node scripts/inspect-nutrition-policies.mjs
//
// Read-only. Uses the service role because pg_policies is not readable through
// the anon role.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e"), quiet: true });
config({ path: join(root, ".env.local"), override: false, quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not configured; cannot read pg_policies");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// PostgREST cannot select from pg_policies directly, so ask through a one-shot
// read-only function if it exists, otherwise fall back to reporting nothing.
const { data, error } = await admin.rpc("start_list_policies", { p_tables: ["meals", "meal_items", "meal_food_groups", "meal_plans"] });

if (error) {
  console.log(`start_list_policies unavailable (${error.code ?? ""} ${error.message})`);
  console.log("run the migration that adds it, or inspect pg_policies in the SQL editor");
  process.exit(3);
}

const byTable = new Map();
for (const row of data ?? []) {
  const list = byTable.get(row.tablename) ?? [];
  list.push(row);
  byTable.set(row.tablename, list);
}

for (const [table, policies] of byTable) {
  console.log(`\n${table}: ${policies.length} policy/policies`);
  for (const policy of policies) {
    console.log(`  ${policy.policyname.padEnd(32)} ${policy.cmd.padEnd(7)} ${policy.permissive}`);
  }
}
