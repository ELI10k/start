// Repairs only dynamic warm-up rows belonging to currently active workout
// assignments. These rows are check-off instructions, not working sets. The
// script is idempotent and verifies the saved result before exiting.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.local") });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const checked = async (promise, label) => {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
};

const assignments = await checked(
  admin.from("workout_assignments").select("program_id").eq("status", "active"),
  "active assignments",
);
const programIds = [...new Set(assignments.map((row) => row.program_id))];
const days = programIds.length ? await checked(
  admin.from("workout_program_days").select("id").in("program_id", programIds),
  "active programme days",
) : [];
const dayIds = days.map((row) => row.id);
const warmups = dayIds.length ? await checked(
  admin.from("workout_program_exercises").select("id").in("day_id", dayIds).eq("exercise_id", "exercise-155pu7s"),
  "dynamic warm-ups",
) : [];
const warmupIds = warmups.map((row) => row.id);

if (warmupIds.length) {
  await checked(
    admin.from("workout_set_prescriptions").delete().in("program_exercise_id", warmupIds),
    "remove false warm-up sets",
  );
  await checked(
    admin.from("workout_program_exercises").update({
      sets_text: null,
      reps_text: null,
      rest_text: null,
      notes: "צפו בסרטון וסמנו השלמה לאחר ביצוע החימום.",
    }).in("id", warmupIds),
    "normalise dynamic warm-ups",
  );
}

const verified = warmupIds.length ? await checked(
  admin.from("workout_program_exercises")
    .select("id,sets_text,reps_text,rest_text,workout_set_prescriptions(id)")
    .in("id", warmupIds),
  "verify dynamic warm-ups",
) : [];
const invalid = verified.filter((row) => row.sets_text || row.reps_text || row.rest_text || row.workout_set_prescriptions.length);
if (invalid.length) throw new Error(`${invalid.length} dynamic warm-up row(s) still contain working-set data`);

console.log(JSON.stringify({ activePrograms: programIds.length, repairedWarmups: warmupIds.length, verified: invalid.length === 0 }));
