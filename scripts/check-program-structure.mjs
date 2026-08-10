// Read-only: reports what the workout catalogue actually contains, so the
// FBW / A-B / A-B-C shapes can be checked against the real database rather than
// against a handoff note. Signs in as the E2E coach and prints one line per
// programme plus every active assignment's weekly frequency.
//
//   node scripts/check-program-structure.mjs

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

const email = process.env.E2E_TEST_COACH_EMAIL ?? process.env.E2E_COACH_EMAIL;
const password = process.env.E2E_TEST_COACH_PASSWORD ?? process.env.E2E_COACH_PASSWORD;
const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
if (authError) {
  console.error(`coach sign-in failed: ${authError.message}`);
  process.exit(1);
}

const [{ data: programs, error: programError }, { data: days }, { data: entries }, { data: assignments }] = await Promise.all([
  supabase.from("workout_programs").select("id,name,training_frequency,official,status,program_type").order("name"),
  supabase.from("workout_program_days").select("id,program_id,name,sort_order"),
  supabase.from("workout_program_exercises").select("id,day_id"),
  supabase.from("workout_assignments").select("id,program_id,client_id,weekly_frequency,status"),
]);
if (programError) {
  console.error(`read failed: ${programError.message}`);
  process.exit(1);
}

console.log("programme                                     days  freq  exercises  official  status");
for (const program of programs ?? []) {
  const programDays = (days ?? []).filter((day) => day.program_id === program.id).sort((a, b) => a.sort_order - b.sort_order);
  const exercises = programDays.reduce((total, day) => total + (entries ?? []).filter((entry) => entry.day_id === day.id).length, 0);
  console.log(
    `${program.name.padEnd(44).slice(0, 44)}  ${String(programDays.length).padStart(4)}  ${String(program.training_frequency ?? "—").padStart(4)}  ${String(exercises).padStart(9)}  ${String(program.official).padStart(8)}  ${program.status}`,
  );
  console.log(`    ימים: ${programDays.map((day) => day.name).join(" | ") || "—"}`);
}

console.log("\nassignments");
for (const assignment of assignments ?? []) {
  const program = (programs ?? []).find((item) => item.id === assignment.program_id);
  console.log(`  ${program?.name ?? assignment.program_id} → client ${assignment.client_id.slice(0, 8)}… · ${assignment.weekly_frequency}/week · ${assignment.status}`);
}

await supabase.auth.signOut();
