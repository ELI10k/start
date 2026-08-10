// Assigns a source programme to the demo client, through the same tables the
// coach UI writes to, and reports what the client will see afterwards.
//
//   node scripts/assign-demo-program.mjs                  # report only
//   node scripts/assign-demo-program.mjs --apply          # assign
//   node scripts/assign-demo-program.mjs --apply --program "אימון FBW מלא לחדר כושר"
//
// Runs as the coach, so every write goes through the same row-level policies a
// coach is bound by. Nothing here can touch a client the coach is not assigned.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e") });
config({ path: join(root, ".env.local"), override: false });

const apply = process.argv.includes("--apply");
const programFlag = process.argv.indexOf("--program");
const wantedProgram = programFlag >= 0 ? process.argv[programFlag + 1] : "אימון FBW מלא לחדר כושר";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data: session, error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_COACH_EMAIL,
  password: process.env.E2E_COACH_PASSWORD,
});
if (authError) {
  console.error(`sign-in failed: ${authError.message}`);
  process.exit(1);
}
const coachId = session.user.id;

const { data: relationships } = await supabase
  .from("coach_client_relationships")
  .select("client_id")
  .eq("coach_id", coachId)
  .eq("status", "active");
const clientIds = (relationships ?? []).map((row) => row.client_id);
const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", clientIds);

const demo = (profiles ?? []).find((row) => (row.email ?? "").includes("client")) ?? (profiles ?? [])[0];
if (!demo) {
  console.error("no client assigned to this coach");
  process.exit(1);
}

const { data: program } = await supabase
  .from("workout_programs")
  .select("id,name,training_frequency")
  .eq("name", wantedProgram)
  .maybeSingle();
if (!program) {
  console.error(`programme not found: ${wantedProgram}`);
  process.exit(1);
}

const { data: days } = await supabase
  .from("workout_program_days")
  .select("id,name,sort_order")
  .eq("program_id", program.id)
  .order("sort_order");

console.log(`client   ${demo.full_name} <${demo.email}>`);
console.log(`program  ${program.name} (${(days ?? []).length} day(s))`);

for (const day of days ?? []) {
  const { data: entries } = await supabase
    .from("workout_program_exercises")
    .select("id,exercise_id,sort_order,sets_text,reps_text,rest_text")
    .eq("day_id", day.id)
    .order("sort_order");
  const ids = (entries ?? []).map((entry) => entry.exercise_id).filter(Boolean);
  const { data: exercises } = ids.length
    ? await supabase.from("workout_exercises").select("id,name,video").in("id", ids)
    : { data: [] };
  const byId = new Map((exercises ?? []).map((row) => [row.id, row]));
  const withVideo = (entries ?? []).filter((entry) => byId.get(entry.exercise_id)?.video?.url).length;
  console.log(`  ${day.name} — ${(entries ?? []).length} exercises, ${withVideo} with a video link`);
  for (const entry of entries ?? []) {
    const exercise = byId.get(entry.exercise_id);
    const prescription = [entry.sets_text, entry.reps_text, entry.rest_text].filter(Boolean).join(" × ");
    console.log(`     ${String(entry.sort_order).padStart(2)}. ${(exercise?.name ?? "—").padEnd(40)} ${prescription}`);
  }
}

const { data: existing } = await supabase
  .from("workout_assignments")
  .select("id,program_id,status,start_date")
  .eq("client_id", demo.id)
  .eq("status", "active");
console.log(`\nactive assignments for this client: ${(existing ?? []).length}`);

if (!apply) {
  console.log("\n(report only — pass --apply to assign)");
  await supabase.auth.signOut();
  process.exit(0);
}

// The tables refuse a direct write - assignment goes through the same guarded
// functions the coach UI calls, so the policy checks and the write trigger run.
for (const row of existing ?? []) {
  if (row.program_id === program.id) continue;
  const { error } = await supabase.rpc("set_workout_assignment_status", {
    p_assignment_id: row.id,
    p_status: "archived",
  });
  if (error) console.error(`could not archive ${row.id}: ${error.message}`);
  else console.log(`archived previous assignment ${row.id}`);
}

if ((existing ?? []).some((row) => row.program_id === program.id)) {
  console.log("already assigned — nothing to do");
} else {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.rpc("assign_workout_program", {
    p_program_id: program.id,
    p_client_id: demo.id,
    p_start_date: today,
    p_end_date: null,
    p_weekly_frequency: program.training_frequency ?? 3,
    p_coach_note: null,
  });
  if (error) {
    console.error(`assignment failed: ${error.message}`);
    process.exit(1);
  }
  console.log(`assigned ${program.name} from ${today}`);
}

await supabase.auth.signOut();
