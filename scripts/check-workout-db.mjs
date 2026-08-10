// Reports what the workout tables actually hold, so the import can be compared
// against the database rather than assumed. Read-only.
//
//   node scripts/check-workout-db.mjs

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
  email: process.env.E2E_COACH_EMAIL,
  password: process.env.E2E_COACH_PASSWORD,
});
if (authError) {
  console.error(`sign-in failed: ${authError.message}`);
  process.exit(1);
}

const { data: programs, error } = await supabase
  .from("workout_programs")
  .select("id,name,program_type,status,training_frequency,official")
  .order("name");
if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`workout_programs: ${programs.length}`);
for (const program of programs) {
  const { data: days } = await supabase
    .from("workout_program_days")
    .select("id,name,sort_order")
    .eq("program_id", program.id)
    .order("sort_order");
  let exerciseCount = 0;
  let linked = 0;
  let withPrescription = 0;
  for (const day of days ?? []) {
    const { data: entries } = await supabase
      .from("workout_program_exercises")
      .select("id,exercise_id,sets_text,reps_text,rest_text,notes")
      .eq("day_id", day.id);
    exerciseCount += (entries ?? []).length;
    linked += (entries ?? []).filter((entry) => entry.exercise_id).length;
    withPrescription += (entries ?? []).filter((entry) => entry.sets_text && entry.reps_text).length;
  }
  console.log(
    `  ${program.name.padEnd(28)} official=${program.official} days=${(days ?? []).length} ex=${exerciseCount} linked=${linked} prescribed=${withPrescription}`,
  );
}

const { data: exercises, error: exerciseError } = await supabase
  .from("workout_exercises")
  .select("id,name,video,primary_muscle_group,equipment,execution_notes,category")
  .limit(1000);
if (exerciseError) console.error(`workout_exercises: ${exerciseError.message}`);

const rows = exercises ?? [];
console.log(`\nworkout_exercises: ${rows.length}`);
console.log(`  with video            ${rows.filter((row) => row.video?.url).length}`);
console.log(`  with primary_muscle   ${rows.filter((row) => row.primary_muscle_group).length}`);
console.log(`  with category         ${rows.filter((row) => row.category).length}`);
console.log(`  with equipment        ${rows.filter((row) => row.equipment).length}`);
console.log(`  with execution_notes  ${rows.filter((row) => row.execution_notes).length}`);

await supabase.auth.signOut();
