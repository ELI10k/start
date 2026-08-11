// Clears today's meal statuses for the E2E client.
//
//   node scripts/reset-e2e-meal-status.mjs
//
// The client-flow spec marks a meal eaten and unmarks it again at the end. If a
// run is killed or times out in between, the mark survives, and every later run
// of that spec fails looking for a button the screen is right not to show. This
// puts the account back the way a passing run leaves it.
//
// Test account only: it signs in as the E2E client and deletes through RLS, so
// it can only ever touch that one client's own rows.

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

const email = process.env.E2E_TEST_CLIENT_EMAIL ?? process.env.E2E_CLIENT_EMAIL;
const password = process.env.E2E_TEST_CLIENT_PASSWORD ?? process.env.E2E_CLIENT_PASSWORD;
if (!email || !password) {
  console.error("no E2E client credentials configured; nothing to reset");
  process.exit(1);
}

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error(`sign-in failed: ${authError.message}`);
  process.exit(1);
}

// The client's own calendar day, which is what the app writes against.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Two tables, not one. meal_day_status carries the explicit "נאכל / לא נאכל"
// mark, and meal_completion_logs carries the older completion. The screen treats
// either as eaten, so clearing only the first leaves the meal looking marked.
const tables = [
  { name: "meal_day_status", dateColumn: "status_date" },
  { name: "meal_completion_logs", dateColumn: "completion_date" },
];

let remaining = 0;
for (const table of tables) {
  const { data: before } = await supabase
    .from(table.name)
    .select("meal_id")
    .eq("client_id", auth.user.id)
    .eq(table.dateColumn, today);

  const { error: deleteError } = await supabase
    .from(table.name)
    .delete()
    .eq("client_id", auth.user.id)
    .eq(table.dateColumn, today);
  if (deleteError) {
    console.error(`${table.name}: reset failed: ${deleteError.message}`);
    process.exit(1);
  }

  const { data: after } = await supabase
    .from(table.name)
    .select("meal_id")
    .eq("client_id", auth.user.id)
    .eq(table.dateColumn, today);

  remaining += after?.length ?? 0;
  console.log(`${table.name}: ${before?.length ?? 0} row(s) before, ${after?.length ?? 0} after`);
}

// And the eaten items themselves. A meal with no explicit mark still reads as
// eaten once every group's chosen item is logged, which is how the state behaved
// before the mark existed - so leftover eaten items keep the meal looking done
// even with both status tables empty.
const { data: log } = await supabase
  .from("nutrition_logs")
  .select("id")
  .eq("client_id", auth.user.id)
  .eq("log_date", today)
  .maybeSingle();

if (log?.id) {
  const { data: eatenBefore } = await supabase.from("eaten_meal_items").select("id").eq("nutrition_log_id", log.id);
  const { error: eatenError } = await supabase.from("eaten_meal_items").delete().eq("nutrition_log_id", log.id);
  if (eatenError) {
    console.error(`eaten_meal_items: reset failed: ${eatenError.message}`);
    process.exit(1);
  }
  const { data: eatenAfter } = await supabase.from("eaten_meal_items").select("id").eq("nutrition_log_id", log.id);
  remaining += eatenAfter?.length ?? 0;
  console.log(`eaten_meal_items: ${eatenBefore?.length ?? 0} row(s) before, ${eatenAfter?.length ?? 0} after`);
} else {
  console.log("eaten_meal_items: no nutrition log for today");
}

await supabase.auth.signOut();
console.log(remaining === 0 ? `${today} is clear` : `${today} still has ${remaining} row(s)`);
process.exit(remaining === 0 ? 0 : 1);
