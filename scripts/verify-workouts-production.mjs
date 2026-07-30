import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const raw = await new Promise((resolve, reject) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { value += chunk; });
  process.stdin.on("end", () => resolve(value));
  process.stdin.on("error", reject);
});
const parsed = JSON.parse(raw);
const keys = Array.isArray(parsed) ? parsed : Array.isArray(parsed.keys) ? parsed.keys : Array.isArray(parsed.data) ? parsed.data : [];
const keyValue = (item) => item.api_key ?? item.apiKey ?? item.key ?? item.value;
const publicKey = keyValue(keys.find((item) => item.name === "anon" || item.type === "publishable"));
const serviceKey = keyValue(keys.find((item) => item.name === "service_role" || item.type === "secret"));
if (!publicKey || !serviceKey) throw new Error("Required Supabase API keys were not returned by the CLI.");

const url = "https://bacxfweisncnpjgiqxcp.supabase.co";
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = randomUUID();
const password = `${randomUUID()}Aa1!`;
const coachEmail = `workout-coach-${suffix}@example.invalid`;
const clientEmail = `workout-client-${suffix}@example.invalid`;
let coachId;
let clientId;
const check = (error, label) => { if (error) throw new Error(`${label}: ${error.message}`); };

try {
  const coachCreated = await admin.auth.admin.createUser({ email: coachEmail, password, email_confirm: true });
  check(coachCreated.error, "create coach"); coachId = coachCreated.data.user.id;
  const clientCreated = await admin.auth.admin.createUser({ email: clientEmail, password, email_confirm: true });
  check(clientCreated.error, "create client"); clientId = clientCreated.data.user.id;
  check((await admin.from("profiles").insert([
    { id: coachId, email: coachEmail, full_name: "Production Workout Coach", role: "coach", status: "active" },
    { id: clientId, email: clientEmail, full_name: "Production Workout Client", role: "client", status: "active" },
  ])).error, "create profiles");
  check((await admin.from("coach_client_relationships").insert({ coach_id: coachId, client_id: clientId, status: "active" })).error, "create relationship");

  const catalog = await admin.from("workout_programs").select("id,workout_program_days(id,workout_program_exercises(id,exercise_id,workout_set_prescriptions(id)))").eq("official", true).limit(1).single();
  check(catalog.error, "read catalog");
  const program = catalog.data;
  const day = program.workout_program_days[0];
  const entry = day.workout_program_exercises[0];

  const coach = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  check((await coach.auth.signInWithPassword({ email: coachEmail, password })).error, "coach login");
  const assignmentResult = await coach.rpc("assign_workout_program", { p_program_id: program.id, p_client_id: clientId, p_start_date: new Date().toISOString().slice(0, 10), p_end_date: null, p_weekly_frequency: 3, p_coach_note: "production persistence check" });
  check(assignmentResult.error, "assign workout");
  const assignmentId = assignmentResult.data;

  const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  check((await client.auth.signInWithPassword({ email: clientEmail, password })).error, "client login");
  const sessionId = `session-production-${suffix}`;
  const setId = `set-production-${suffix}`;
  const startedAt = new Date().toISOString();
  const exerciseResults = [{ workoutExerciseId: entry.id, exerciseId: entry.exercise_id, skipped: false, completed: true, sets: [{ id: setId, prescriptionId: entry.workout_set_prescriptions[0]?.id, order: 0, weightKg: 42.5, repetitions: 8, completed: true, completedAt: startedAt }] }];
  check((await client.rpc("save_active_workout", { p_session: { id: sessionId, clientId, assignmentId, programId: program.id, dayId: day.id, startedAt, currentExerciseIndex: 0, exerciseResults } })).error, "save active workout");

  const refreshedClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  check((await refreshedClient.auth.signInWithPassword({ email: clientEmail, password })).error, "client refresh login");
  const activeAfterRefresh = await refreshedClient.from("workout_sessions").select("id,status").eq("id", sessionId).single();
  check(activeAfterRefresh.error, "reload active workout");
  const completedAt = new Date().toISOString();
  const completionId = `workout-${sessionId}`;
  check((await refreshedClient.rpc("complete_workout", { p_workout: { id: completionId, clientId, assignmentId, programId: program.id, dayId: day.id, startedAt, completedAt, durationSeconds: 60, exerciseResults, perceivedDifficulty: 3, energy: 4, totalVolume: 340 } })).error, "complete workout");

  const reloggedClient = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  check((await reloggedClient.auth.signInWithPassword({ email: clientEmail, password })).error, "client re-login");
  const history = await reloggedClient.from("workout_sessions").select("completion_id,status").eq("completion_id", completionId).single();
  check(history.error, "reload workout history");
  const sets = await reloggedClient.from("workout_sets").select("weight_kg,repetitions,completed").eq("session_id", sessionId);
  check(sets.error, "reload workout sets");
  const savedSet = sets.data[0];
  console.log(JSON.stringify({ assigned: Boolean(assignmentId), activeAfterRefresh: activeAfterRefresh.data.status === "active", completedAfterRelogin: history.data.status === "completed", savedWeightKg: Number(savedSet.weight_kg), savedRepetitions: savedSet.repetitions, setCompleted: savedSet.completed }));
} finally {
  if (clientId) await admin.auth.admin.deleteUser(clientId);
  if (coachId) await admin.auth.admin.deleteUser(coachId);
}
