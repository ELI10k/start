// Read-only production audit for Eli Cohen's workout assignment and complete
// programme tree. It reports missing prescriptions, duplicate sort positions,
// unresolved exercises and whether the active assignment points at a saved
// programme. No rows are changed.

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
if (authError) throw authError;

const read = async (promise, label) => {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
};

let clients = await read(
  supabase.from("profiles").select("id,full_name").eq("role", "client").ilike("full_name", "%אלי%כהן%"),
  "clients",
);

// Some production coach roles may inspect assignments without receiving the
// client's profile row. In that case audit every active assignment visible to
// the coach, while deliberately keeping the client identity out of the report.
if (!clients.length) {
  const visibleAssignments = await read(
    supabase.from("workout_assignments").select("client_id").eq("status", "active"),
    "visible active assignments",
  );
  clients = [...new Set(visibleAssignments.map((assignment) => assignment.client_id))]
    .map((id) => ({ id, full_name: "לקוח בתוכנית פעילה" }));
}

for (const client of clients) {
  const assignments = await read(
    supabase.from("workout_assignments")
      .select("id,program_id,status,start_date,end_date,weekly_frequency,assigned_at")
      .eq("client_id", client.id)
      .order("assigned_at", { ascending: true }),
    "assignments",
  );
  console.log(`\n${client.full_name}: ${assignments.length} assignment(s)`);
  for (const assignment of assignments) {
    const programs = await read(
      supabase.from("workout_programs").select("id,name,status,official,updated_at").eq("id", assignment.program_id),
      "program",
    );
    const program = programs[0];
    const days = await read(
      supabase.from("workout_program_days").select("id,name,sort_order").eq("program_id", assignment.program_id).order("sort_order"),
      "days",
    );
    console.log(`  ${assignment.status}: ${program?.name ?? "MISSING PROGRAM"} · ${assignment.weekly_frequency}/week · ${days.length} day(s)`);
    for (const day of days) {
      const entries = await read(
        supabase.from("workout_program_exercises")
          .select("id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes,workout_exercises(name,primary_muscle_group),workout_set_prescriptions(id,sort_order,repetitions)")
          .eq("day_id", day.id)
          .order("sort_order"),
        "entries",
      );
      const duplicateOrders = entries.filter((entry, index) => entries.findIndex((item) => item.sort_order === entry.sort_order) !== index);
      const unresolved = entries.filter((entry) => !entry.workout_exercises);
      const incomplete = entries.filter((entry) => entry.exercise_id !== "exercise-155pu7s" && (!entry.sets_text || !entry.reps_text || !entry.rest_text));
      const prescriptionMismatch = entries.filter((entry) => entry.exercise_id !== "exercise-155pu7s" && Number.parseInt(entry.sets_text ?? "", 10) !== entry.workout_set_prescriptions.length);
      console.log(`    ${day.name}: ${entries.length} exercises · duplicate order ${duplicateOrders.length} · unresolved ${unresolved.length} · incomplete ${incomplete.length} · set mismatch ${prescriptionMismatch.length}`);
      for (const entry of entries) {
        console.log(`      ${entry.sort_order + 1}. ${entry.workout_exercises?.name ?? entry.exercise_id} · ${entry.sets_text ?? "—"}×${entry.reps_text ?? "—"} · rest ${entry.rest_text ?? "—"}`);
      }
    }
  }
}

if (!clients.length) console.log("No active client assignment was visible to the coach account.");
await supabase.auth.signOut();
