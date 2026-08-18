// Backward-compatibility check for 202608110008.
//
// The old client's entire write path for a programme is one call:
// save_workout_program_tree(p_program jsonb) with the full tree, sent as a coach.
// This replays that call with the tree exactly as it is stored - a no-op save -
// and then re-reads it. If the new function is compatible, the call succeeds and
// the tree comes back byte-identical, which is what the deployed Production code
// depends on.
//
//   node scripts/replay-old-client-save.mjs <programId>
import { readFileSync } from "node:fs";

const programId = process.argv[2];
if (!programId) throw new Error("usage: replay-old-client-save.mjs <programId>");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.e2e", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --as-client proves the other half of the rule: opening official programmes to
// coaches must not open them to anyone else.
const asClient = process.argv.includes("--as-client");
const grant = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
  body: JSON.stringify(asClient
    ? { email: env.E2E_CLIENT_EMAIL, password: env.E2E_CLIENT_PASSWORD }
    : { email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
});
if (!grant.ok) throw new Error(`Supabase rejected the E2E sign-in (HTTP ${grant.status}).`);
const session = await grant.json();
const auth = { apikey: anon, authorization: `Bearer ${session.access_token}`, "content-type": "application/json" };

const rest = async (path) => {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers: auth });
  if (!response.ok) throw new Error(`${path.split("?")[0]} -> HTTP ${response.status}`);
  return response.json();
};

// The same shape lib/workouts/supabase-repository.ts builds from the rows.
async function readTree() {
  const [program] = await rest(`workout_programs?id=eq.${programId}&select=*`);
  if (!program) throw new Error(`no programme ${programId}`);
  const days = await rest(`workout_program_days?program_id=eq.${programId}&select=*&order=sort_order`);
  const slots = days.length ? await rest(`workout_program_exercises?day_id=in.(${days.map((d) => d.id).join(",")})&select=*&order=sort_order`) : [];
  const sets = slots.length ? await rest(`workout_set_prescriptions?program_exercise_id=in.(${slots.map((s) => s.id).join(",")})&select=*&order=sort_order`) : [];
  return { program, days, slots, sets };
}

const fingerprint = (tree) => JSON.stringify({
  program: [tree.program.name, tree.program.official, tree.program.coach_id, tree.program.status, tree.program.duplicated_from_id],
  days: tree.days.map((d) => [d.id, d.name, d.sort_order, d.source_sheet]),
  slots: tree.slots.map((s) => [s.id, s.day_id, s.exercise_id, s.sort_order, s.sets_text, s.reps_text, s.rest_text, s.notes, s.source_row]),
  sets: tree.sets.map((s) => [s.id, s.program_exercise_id, s.sort_order, s.repetitions]).sort(),
});

const before = await readTree();

const payload = {
  id: before.program.id,
  name: before.program.name,
  description: before.program.description ?? undefined,
  programType: before.program.program_type ?? undefined,
  difficulty: before.program.difficulty ?? undefined,
  trainingFrequency: before.program.training_frequency ?? undefined,
  equipment: before.program.equipment ?? [],
  sourceWorkbook: before.program.source_workbook ?? "",
  sourceSheet: before.program.source_sheet ?? undefined,
  status: before.program.status,
  // The old client sends the flag it read back, untouched - which is precisely
  // what the previous function rejected outright.
  official: before.program.official,
  duplicatedFromId: before.program.duplicated_from_id ?? undefined,
  days: before.days.map((day) => ({
    id: day.id,
    name: day.name,
    order: day.sort_order,
    sourceSheet: day.source_sheet ?? undefined,
    exercises: before.slots.filter((slot) => slot.day_id === day.id).map((slot) => ({
      id: slot.id,
      exerciseId: slot.exercise_id,
      order: slot.sort_order,
      sets: slot.sets_text ?? undefined,
      reps: slot.reps_text ?? undefined,
      rest: slot.rest_text ?? undefined,
      notes: slot.notes ?? undefined,
      sourceRow: slot.source_row ?? undefined,
      setPrescriptions: before.sets.filter((set) => set.program_exercise_id === slot.id).map((set) => ({
        id: set.id, order: set.sort_order, repetitions: set.repetitions ?? undefined,
      })),
    })),
  })),
};

const call = await fetch(`${url}/rest/v1/rpc/save_workout_program_tree`, {
  method: "POST", headers: auth, body: JSON.stringify({ p_program: payload }),
});
const body = await call.text();

const after = await readTree();
console.log(JSON.stringify({
  programme: programId,
  official: before.program.official,
  signedInAs: asClient ? "client" : "coach",
  rpcStatus: call.status,
  rpcAccepted: call.ok,
  rpcBody: body.slice(0, 300),
  treeUnchanged: fingerprint(before) === fingerprint(after),
  counts: { days: after.days.length, slots: after.slots.length, sets: after.sets.length },
}, null, 2));
