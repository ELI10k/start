// Checks the exercise bank in the database against the workbook import, and
// checks that every programme entry points at a bank exercise that exists.
// Read-only.
//
//   node scripts/verify-exercise-library.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e") });
config({ path: join(root, ".env.local"), override: false });

const imported = JSON.parse(readFileSync(join(root, "data/exercises.json"), "utf8"));
const importedById = new Map(imported.map((row) => [row.id, row]));

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

const { data: bank } = await supabase
  .from("workout_exercises")
  .select("id,name,video,primary_muscle_group,equipment,execution_notes,category")
  .limit(1000);
const bankById = new Map((bank ?? []).map((row) => [row.id, row]));

const problems = [];

// 1. Every link that exists in the workbook import must be on the right row.
let linkChecked = 0;
for (const source of imported) {
  const url = source.video?.url;
  if (!url) continue;
  linkChecked += 1;
  const row = bankById.get(source.id);
  if (!row) {
    problems.push(`missing from the bank: ${source.name} (${source.id})`);
  } else if (row.video?.url !== url) {
    problems.push(`link mismatch on ${source.name}: db=${row.video?.url ?? "none"} source=${url}`);
  }
}

// 2. Every programme entry must resolve to a bank exercise.
const { data: programs } = await supabase.from("workout_programs").select("id,name").order("name");
let entries = 0;
let unresolved = 0;
let withLink = 0;
for (const program of programs ?? []) {
  const { data: days } = await supabase.from("workout_program_days").select("id,name").eq("program_id", program.id);
  for (const day of days ?? []) {
    const { data: rows } = await supabase
      .from("workout_program_exercises")
      .select("id,exercise_id")
      .eq("day_id", day.id);
    for (const row of rows ?? []) {
      entries += 1;
      const exercise = row.exercise_id ? bankById.get(row.exercise_id) : null;
      if (!exercise) {
        unresolved += 1;
        problems.push(`${program.name} / ${day.name}: entry ${row.id} points at a missing exercise`);
      } else if (exercise.video?.url) {
        withLink += 1;
      }
    }
  }
}

console.log(`bank rows                 ${(bank ?? []).length}`);
console.log(`imported rows             ${imported.length}`);
console.log(`links checked against src ${linkChecked}`);
console.log(`  with video              ${(bank ?? []).filter((row) => row.video?.url).length}`);
console.log(`  with muscle group       ${(bank ?? []).filter((row) => row.primary_muscle_group).length}`);
console.log(`  with equipment          ${(bank ?? []).filter((row) => row.equipment).length}`);
console.log(`  with execution notes    ${(bank ?? []).filter((row) => row.execution_notes).length}`);
console.log(`\nprogramme entries         ${entries}`);
console.log(`  resolve to the bank     ${entries - unresolved}`);
console.log(`  of those, with a link   ${withLink}`);

// Rows the bank has but the import does not - these came from somewhere else and
// are worth knowing about, though they are not an error.
const extra = (bank ?? []).filter((row) => !importedById.has(row.id));
if (extra.length) console.log(`\nbank rows not in the workbook import: ${extra.length}`);

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const problem of problems.slice(0, 20)) console.log(`  ${problem}`);
  process.exitCode = 1;
} else {
  console.log("\nno mismatches");
}

await supabase.auth.signOut();
