// Checks the trainee-level mapping against the catalogue that actually exists.
//
//   node scripts/check-level-programmes.mjs
//
// Read-only. The mapping matches by exact name, and this is what proves those
// names are real: a level whose programme is missing assigns nothing, silently,
// and a coach would only find out when a client's workouts screen stayed empty.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { missingProgrammes, PROGRAMMES_BY_LEVEL, programmesForLevel, TRAINEE_LEVEL_LABELS, TRAINEE_LEVELS } from "../lib/workouts/trainee-level.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e"), quiet: true });
config({ path: join(root, ".env.local"), override: false, quiet: true });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_TEST_COACH_EMAIL ?? process.env.E2E_COACH_EMAIL,
  password: process.env.E2E_TEST_COACH_PASSWORD ?? process.env.E2E_COACH_PASSWORD,
});
if (authError) {
  console.error(`coach sign-in failed: ${authError.message}`);
  process.exit(1);
}

const { data, error } = await supabase.from("workout_programs").select("id,name,training_frequency,status").eq("status", "active");
if (error) {
  console.error(`read failed: ${error.message}`);
  process.exit(1);
}
const catalogue = (data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), trainingFrequency: row.training_frequency ? Number(row.training_frequency) : undefined }));

let ok = true;
for (const level of TRAINEE_LEVELS) {
  const resolved = programmesForLevel(level, catalogue);
  const missing = missingProgrammes(level, catalogue);
  const expected = PROGRAMMES_BY_LEVEL[level].length;
  console.log(`\n${TRAINEE_LEVEL_LABELS[level]} — ${resolved.length}/${expected}`);
  for (const programme of resolved) console.log(`  ✓ ${programme.name}  (${programme.trainingFrequency ?? "—"}/week)`);
  for (const name of missing) {
    ok = false;
    console.log(`  ✗ חסרה במאגר: ${name}`);
  }
}

// A duplicate name would make the exact match ambiguous.
const names = catalogue.map((programme) => programme.name.trim());
const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
if (duplicates.length) {
  ok = false;
  console.log(`\nduplicate programme names in the catalogue: ${duplicates.join(", ")}`);
}

console.log(ok ? "\nevery level resolves to real programmes" : "\nsome levels cannot be fully assigned");
await supabase.auth.signOut();
process.exit(ok ? 0 : 1);
