import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { canonicalizeEquipment, canonicalizeMuscle, categorizeExercise, EXERCISE_CATEGORIES } from "./lib/exercise-taxonomy.mjs";

process.loadEnvFile(process.env.ENV_FILE || ".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Missing Supabase environment variables");

const apply = process.argv.includes("--apply");
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: exercises, error } = await supabase
  .from("workout_exercises")
  .select("id,name,category,equipment,primary_muscle_group,secondary_muscle_groups,source_references,status")
  .order("id");
if (error) throw error;

const changes = exercises.map((exercise) => {
  const equipment = canonicalizeEquipment(exercise);
  if (!equipment) throw new Error(`Could not infer equipment for ${exercise.id}: ${exercise.name}`);
  const primaryMuscleGroup = canonicalizeMuscle(exercise.primary_muscle_group);
  if (!primaryMuscleGroup) throw new Error(`Missing primary muscle for ${exercise.id}: ${exercise.name}`);
  const secondaryMuscleGroups = [...new Set((exercise.secondary_muscle_groups ?? [])
    .map(canonicalizeMuscle)
    .filter((muscle) => muscle && muscle !== primaryMuscleGroup))];
  const category = categorizeExercise({ ...exercise, equipment });
  return {
    before: exercise,
    after: { category, equipment, primary_muscle_group: primaryMuscleGroup, secondary_muscle_groups: secondaryMuscleGroups },
    changed: exercise.category !== category
      || exercise.equipment !== equipment
      || exercise.primary_muscle_group !== primaryMuscleGroup
      || JSON.stringify(exercise.secondary_muscle_groups ?? []) !== JSON.stringify(secondaryMuscleGroups),
  };
}).filter(({ changed }) => changed);

const counts = (rows, readCategory) => Object.fromEntries(EXERCISE_CATEGORIES.map((category) => [
  category,
  rows.filter((row) => readCategory(row) === category).length,
]));

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  total: exercises.length,
  changed: changes.length,
  categoriesAfter: counts(exercises.map((exercise) => {
    const change = changes.find(({ before }) => before.id === exercise.id);
    return change?.after ?? exercise;
  }), (exercise) => exercise.category),
  equipmentChanges: changes.filter(({ before, after }) => before.equipment !== after.equipment).map(({ before, after }) => ({ id: before.id, name: before.name, from: before.equipment, to: after.equipment })),
  muscleChanges: changes.filter(({ before, after }) => before.primary_muscle_group !== after.primary_muscle_group).map(({ before, after }) => ({ id: before.id, name: before.name, from: before.primary_muscle_group, to: after.primary_muscle_group })),
}, null, 2));

if (apply) {
  for (let index = 0; index < changes.length; index += 20) {
    const batch = changes.slice(index, index + 20);
    const results = await Promise.all(batch.map(({ before, after }) => supabase
      .from("workout_exercises")
      .update(after)
      .eq("id", before.id)));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  }

  const { data: verified, error: verificationError } = await supabase
    .from("workout_exercises")
    .select("id,category,equipment,primary_muscle_group,secondary_muscle_groups,status");
  if (verificationError) throw verificationError;
  const invalid = (verified ?? []).filter((exercise) => !EXERCISE_CATEGORIES.includes(exercise.category)
    || !exercise.equipment || !exercise.primary_muscle_group);
  if (invalid.length) throw new Error(`Taxonomy verification failed for ${invalid.length} exercises`);
  console.log(JSON.stringify({ applied: changes.length, verified: verified.length, invalid: invalid.length }, null, 2));
}
