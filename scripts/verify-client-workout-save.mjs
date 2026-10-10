import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

config({ path: new URL("../.env.e2e", import.meta.url).pathname, quiet: true });
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const base = process.argv[2] ?? "https://start.elicohenfitness.co.il";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const coachEmail = process.env.E2E_COACH_EMAIL;
const coachPassword = process.env.E2E_COACH_PASSWORD;
for (const [name, value] of Object.entries({ supabaseUrl, anonKey, serviceKey, coachEmail, coachPassword })) {
  if (!value) throw new Error(`Missing required verification setting: ${name}`);
}

const coach = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: auth, error: authError } = await coach.auth.signInWithPassword({ email: coachEmail, password: coachPassword });
if (authError || !auth.session) throw new Error(`Test coach sign-in failed: ${authError?.code ?? "missing_session"}`);

const { data: coachProfile, error: coachProfileError } = await admin.from("profiles").select("is_test_account").eq("id", auth.session.user.id).single();
if (coachProfileError) throw coachProfileError;
assert.equal(coachProfile.is_test_account, true, "Mutation verification is restricted to the isolated test coach");

const id = randomUUID();
const clientPassword = `${randomUUID()}Aa1!`;
let clientId;
let programId;
const browser = await chromium.launch({ headless: true });

function check(error, step) {
  if (error) throw new Error(`${step}: ${error.code ?? error.message}`);
}

try {
  const created = await admin.auth.admin.createUser({
    email: `workout-round-trip-${id}@example.invalid`,
    password: clientPassword,
    email_confirm: true,
    app_metadata: { role: "client", is_test_account: true },
  });
  check(created.error, "create disposable client");
  clientId = created.data.user.id;
  check((await admin.from("profiles").upsert({ id: clientId, email: created.data.user.email, full_name: "בדיקת שמירת אימון", role: "client", status: "active", is_test_account: true })).error, "create disposable profile");
  check((await admin.from("client_profiles").upsert({ user_id: clientId, onboarding_completed: true })).error, "create disposable intake");
  check((await admin.from("coach_client_relationships").upsert({ coach_id: auth.session.user.id, client_id: clientId, status: "active" }, { onConflict: "coach_id,client_id" })).error, "create isolated relationship");

  const source = await admin.from("workout_programs").select("id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,status,official,workout_program_days(id,name,sort_order,workout_program_exercises(id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes))").eq("official", true).eq("status", "active").limit(1).single();
  check(source.error, "load source programme");
  programId = `e2e-program-${id}`;
  const sourceDay = source.data.workout_program_days.sort((a, b) => a.sort_order - b.sort_order)[0];
  assert.ok(sourceDay?.workout_program_exercises.length, "source programme must contain an exercise");
  const exercise = sourceDay.workout_program_exercises.sort((a, b) => a.sort_order - b.sort_order)[0];
  const dayId = `e2e-day-${id}`;
  const exerciseId = `e2e-slot-${id}`;
  check((await admin.from("workout_programs").insert({ id: programId, coach_id: auth.session.user.id, name: `E2E שמירת אימון ${id}`, description: "Disposable round-trip verification", program_type: source.data.program_type, difficulty: source.data.difficulty, training_frequency: 1, equipment: source.data.equipment ?? [], source_workbook: "E2E", status: "active", official: false })).error, "create disposable programme");
  check((await admin.from("workout_program_days").insert({ id: dayId, program_id: programId, name: "אימון בדיקה", sort_order: 0 })).error, "create disposable day");
  check((await admin.from("workout_program_exercises").insert({ id: exerciseId, day_id: dayId, exercise_id: exercise.exercise_id, sort_order: 0, sets_text: exercise.sets_text ?? "3", reps_text: exercise.reps_text ?? "10", rest_text: exercise.rest_text ?? "60 שניות", notes: "before-round-trip" })).error, "create disposable exercise");
  const assignment = await admin.from("workout_assignments").insert({ client_id: clientId, program_id: programId, assigned_by: auth.session.user.id, start_date: new Date().toISOString().slice(0, 10), weekly_frequency: 1, status: "active" }).select("id").single();
  check(assignment.error, "assign disposable programme");

  const key = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const encoded = `base64-${Buffer.from(JSON.stringify(auth.session)).toString("base64")}`;
  const cookies = [];
  for (let index = 0; index * 3180 < encoded.length; index += 1) cookies.push({ name: encoded.length <= 3180 ? key : `${key}.${index}`, value: encoded.slice(index * 3180, (index + 1) * 3180), domain: new URL(base).hostname, path: "/", secure: base.startsWith("https"), sameSite: "Lax" });
  cookies.push({ name: "start-device-id", value: `workout-round-trip-${id}`, domain: new URL(base).hostname, path: "/", secure: base.startsWith("https"), sameSite: "Lax" });
  const context = await browser.newContext({ locale: "he-IL", viewport: { width: 1280, height: 900 } });
  await context.addCookies(cookies);
  const page = await context.newPage();
  await page.goto(`${base}/coach/clients/${clientId}?tab=workouts`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "עריכת התוכנית" }).click();
  await page.waitForURL((url) => url.searchParams.get("clientId") === clientId && url.searchParams.get("assignmentId") === assignment.data.id);
  await page.getByText(`עריכת התוכנית של בדיקת שמירת אימון`, { exact: true }).waitFor();
  const marker = `round-trip-${randomUUID()}`;
  await page.getByLabel("טכניקה / הערה").first().fill(marker);
  await page.getByRole("button", { name: "שמירת תוכנית" }).click();
  await page.getByRole("status").filter({ hasText: "נשמרו ונטענו מחדש" }).waitFor({ timeout: 30_000 });
  await page.reload({ waitUntil: "networkidle" });
  await assert.doesNotReject(async () => assert.equal(await page.getByLabel("טכניקה / הערה").first().inputValue(), marker));
  const persisted = await admin.from("workout_program_exercises").select("notes").eq("id", exerciseId).single();
  check(persisted.error, "read saved exercise");
  assert.equal(persisted.data.notes, marker);
  console.log(JSON.stringify({ clientContext: "passed", browserReload: "passed", databaseRoundTrip: "passed", disposableData: "removed" }, null, 2));
} finally {
  await browser.close();
  if (clientId) check((await admin.auth.admin.deleteUser(clientId)).error, "remove disposable client");
  if (programId) check((await admin.from("workout_programs").delete().eq("id", programId).eq("coach_id", auth.session.user.id).eq("official", false)).error, "remove disposable programme");
}
