// Read-only inspection of one programme and everything that would stand in the way
// of editing it in place: the `official` flag, who owns it, and whether any client
// has already trained on it - because save_workout_program_tree deletes the day
// rows before re-inserting them, and workout_sessions.day_id references those rows
// with ON DELETE RESTRICT.
//
// Signs in over Supabase's HTTP API rather than through the form, so the password
// never reaches a browser. Same approach as e2e/support/session.ts.
import { readFileSync } from "node:fs";

const PROGRAM_ID = process.argv[2] ?? "workout-program-18nf8g8";

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

const grant = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
  body: JSON.stringify({ email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
});
if (!grant.ok) throw new Error(`Supabase rejected the E2E coach sign-in (HTTP ${grant.status}).`);
const session = await grant.json();

const rest = async (path) => {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anon, authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error(`${path.split("?")[0]} -> HTTP ${response.status}`);
  return response.json();
};

const [program] = await rest(`workout_programs?id=eq.${PROGRAM_ID}&select=*`);
console.log("=== programme ===");
console.log(JSON.stringify({
  id: program?.id,
  name: program?.name,
  official: program?.official,
  coach_id: program?.coach_id,
  status: program?.status,
  signed_in_coach: session.user.id,
  owned_by_signed_in_coach: program?.coach_id === session.user.id,
}, null, 2));

const days = await rest(`workout_program_days?program_id=eq.${PROGRAM_ID}&select=id,name,sort_order&order=sort_order`);
const slots = await rest(`workout_program_exercises?day_id=in.(${days.map((d) => d.id).join(",")})&select=id,day_id,exercise_id,sets_text,reps_text,rest_text,notes,sort_order&order=sort_order`);
console.log("=== tree ===");
console.log(JSON.stringify({ days: days.length, slots: slots.length }, null, 2));

// The reason an in-place save is not just a permission question.
const sessions = await rest(`workout_sessions?program_id=eq.${PROGRAM_ID}&select=id,status,day_id,client_id,completed_at`);
const trained = await rest(`workout_session_exercises?workout_exercise_id=in.(${slots.map((s) => s.id).join(",")})&select=session_id,workout_exercise_id`);
console.log("=== history pinning this programme ===");
console.log(JSON.stringify({
  sessions: sessions.length,
  completedSessions: sessions.filter((s) => s.status === "completed").length,
  sessionsPinningDayRows: [...new Set(sessions.map((s) => s.day_id))],
  sessionExerciseRowsPinningSlots: trained.length,
  deleteOfDayRowsWouldBeRefused: sessions.length > 0 || trained.length > 0,
}, null, 2));

console.log("=== current prescription (restore reference) ===");
console.log(JSON.stringify(slots.map((s) => ({ id: s.id, sets: s.sets_text, reps: s.reps_text, rest: s.rest_text, notes: s.notes })), null, 2));
