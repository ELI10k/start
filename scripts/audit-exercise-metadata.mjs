// What the exercise bank is missing, per exercise.
//
//   node scripts/audit-exercise-metadata.mjs [--json]
//
// Read-only. It invents nothing: an exercise with no muscle group is reported as
// having none, because a guessed classification is worse than a blank - a coach
// can fill a blank, but has no reason to doubt a wrong answer.
//
// "How to perform" counts the execution notes copied verbatim from the source
// workbooks as well as coach-written guidance, since that is what the guidance
// panel falls back to.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e"), quiet: true });
config({ path: join(root, ".env.local"), override: false, quiet: true });

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

const { data, error } = await supabase
  .from("workout_exercises")
  .select("id,name,primary_muscle_group,equipment,video,execution_notes,how_to,cues,common_mistakes,image_url,status")
  .eq("status", "active")
  .order("name");
if (error) {
  console.error(`read failed: ${error.message}`);
  process.exit(1);
}

const FIELDS = [
  { key: "muscleGroup", label: "קבוצת שריר", has: (row) => Boolean(row.primary_muscle_group) },
  { key: "equipment", label: "ציוד", has: (row) => Boolean(row.equipment) },
  { key: "video", label: "וידאו", has: (row) => Boolean(row.video?.url) },
  { key: "howTo", label: "איך מבצעים", has: (row) => Boolean(row.how_to || row.execution_notes) },
  { key: "cues", label: "דגשים", has: (row) => (row.cues ?? []).length > 0 },
  { key: "mistakes", label: "טעויות נפוצות", has: (row) => (row.common_mistakes ?? []).length > 0 },
  { key: "image", label: "תמונה", has: (row) => Boolean(row.image_url) },
];

const exercises = (data ?? []).map((row) => ({
  id: row.id,
  name: row.name,
  missing: FIELDS.filter((field) => !field.has(row)).map((field) => field.key),
}));

const incomplete = exercises.filter((exercise) => exercise.missing.length);

console.log(`${exercises.length} active exercises · ${incomplete.length} with something missing\n`);
console.log("field              present   missing");
console.log("-".repeat(42));
for (const field of FIELDS) {
  const missing = exercises.filter((exercise) => exercise.missing.includes(field.key)).length;
  console.log(`${field.label.padEnd(18)}${String(exercises.length - missing).padStart(7)}${String(missing).padStart(10)}`);
}

// The exercises worth a coach's attention first: the ones missing something the
// screen leans on rather than something it can do without.
const CRITICAL = ["muscleGroup", "video", "howTo"];
const urgent = incomplete.filter((exercise) => exercise.missing.some((field) => CRITICAL.includes(field)));
console.log(`\n${urgent.length} exercise(s) missing a muscle group, a video or a how-to:\n`);
for (const exercise of urgent) {
  const labels = exercise.missing
    .filter((field) => CRITICAL.includes(field))
    .map((field) => FIELDS.find((item) => item.key === field).label);
  console.log(`  ${exercise.name}  →  ${labels.join(", ")}`);
}

await mkdir(join(root, "reports"), { recursive: true });
await writeFile(join(root, "reports/exercise-metadata-audit.json"), JSON.stringify({ total: exercises.length, exercises: incomplete }, null, 2));
console.log(`\nfull list: reports/exercise-metadata-audit.json`);

await supabase.auth.signOut();
