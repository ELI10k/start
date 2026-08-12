import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The training-day screen used to be three grey tiles. These pin what it does
// now, and the boundaries that make it safe to edit a programme a client is
// already training.

test("sets, reps and rest are editable fields, each with its own label", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  assert.match(day, /label="סטים"/);
  assert.match(day, /label="חזרות"/);
  assert.match(day, /label="מנוחה"/);
  // The label names the exercise, so a screen reader - and a test - can tell one
  // row's set count from another's.
  assert.match(day, /name=\{`סטים ל\$\{exercise\?\.name/);
  assert.match(day, /<input aria-label=\{name\}/);
});

test("nothing is written until the coach saves", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  // Edits accumulate in a draft; a half-typed rep range must not reach a client
  // who is mid-week.
  assert.match(day, /const \[draft, setDraft\] = useState/);
  assert.match(day, /const dirty = Object\.keys\(draft\)\.length > 0/);
  assert.match(day, /disabled=\{!dirty \|\| saving\}/);
});

test("only this day's slots change, and completed workouts are untouched", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  // Every other day is written back exactly as it was read.
  assert.match(day, /days: program\.days\.map\(\(item\) => item\.id !== dayId \? item :/);
  // A completed workout carries its own rows, so a change applies forward only -
  // and the screen says so rather than leaving the coach to wonder.
  assert.match(day, /אימונים שכבר בוצעו נשארים כפי שהיו/);
});

test("a changed set count grows the per-set rows with it", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  assert.match(day, /function prescriptionsFor/);
  // A count that is not a number - "עד כישלון" - leaves the existing rows alone
  // rather than deleting them.
  assert.match(day, /if \(!Number\.isFinite\(count\) \|\| count <= 0\) return entry\.setPrescriptions/);
  assert.match(day, /Math\.min\(count, 12\)/);
});

test("an approved programme is editable in place, by a coach", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  // It used to be three grey tiles and an invitation to copy eleven exercises to
  // change one rep range. The fields are unconditional now; official only earns
  // the programme a warning that its clients share it.
  assert.doesNotMatch(day, /const readOnly = program\.official/);
  assert.doesNotMatch(day, /יצירת עותק לעריכה/);
  assert.match(day, /const shared = program\.official/);
  assert.match(day, /השינויים כאן יחולו על כולם/);

  const editor = await source("components/workouts/coach/CustomProgramEditor.tsx");
  // The builder - add, remove, reorder, replace, duplicate - refused to open an
  // official programme at all.
  assert.doesNotMatch(editor, /if\(!draft\|\|draft\.official\)return null/);
  assert.match(editor, /if\(!draft\)return null/);

  const store = await source("lib/workouts/storage.ts");
  assert.doesNotMatch(store, /saveCustomWorkoutProgram[^\n]*if\(program\.official\)return snapshot/);
});

test("the four editable fields include the coach's own note", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  assert.match(day, /type EditableField = "sets" \| "reps" \| "rest" \| "notes"/);
  assert.match(day, /label="טכניקה \/ הערה"/);
  assert.match(day, /notes: \(patch\.notes \?\? entry\.notes \?\? ""\)\.trim\(\) \|\| undefined/);
});

test("the save stops rejecting official, and stops emptying the tree", async () => {
  const migration = await source("supabase/migrations/202608110008_coach_edits_official_programmes.sql");
  // The three things that blocked an in-place edit, in the order they bit.
  assert.doesNotMatch(migration, /coalesce\(\(p_program->>'official'\)::boolean,false\) then raise exception 'not_authorized'/);
  assert.match(migration, /if not v_official and v_coach is distinct from auth\.uid\(\) then raise exception 'program_not_owned'/);
  assert.doesNotMatch(migration, /delete from public\.workout_program_days where program_id=v_id;/);
  assert.match(migration, /on conflict\(id\) do update set day_id=excluded\.day_id/);

  // A save may change what a programme prescribes, never what it is or who owns
  // it: official and coach_id stay out of the update list.
  const programUpsert = migration.slice(migration.indexOf("insert into public.workout_programs"));
  const updateList = programUpsert.slice(programUpsert.indexOf("do update set"), programUpsert.indexOf(";"));
  assert.doesNotMatch(updateList, /official=/);
  assert.doesNotMatch(updateList, /coach_id=/);
});

test("only a coach may write, official or not", async () => {
  const migration = await source("supabase/migrations/202608110008_coach_edits_official_programmes.sql");
  assert.match(migration, /if public\.current_role\(\) <> 'coach' or v_id is null then raise exception 'not_authorized'/);
});

test("a completed workout carries its own copy of what it was performed under", async () => {
  const migration = await source("supabase/migrations/202608110008_coach_edits_official_programmes.sql");
  // Before this, the prescription and the day's name were read live off the
  // programme, so editing a programme would have retitled and re-prescribed
  // workouts that were already in the past.
  assert.match(migration, /alter table public\.workout_sessions add column if not exists day_name text/);
  assert.match(migration, /add column if not exists prescribed_sets text/);
  assert.match(migration, /alter table public\.workout_sets add column if not exists prescribed_repetitions text/);
  // Existing rows are filled in, not left null.
  assert.match(migration, /update public\.workout_sessions s\s+set day_name = d\.name/);
  // And future ones snapshot on write.
  assert.match(migration, /create trigger workout_session_exercises_snapshot before insert/);
  assert.match(migration, /create trigger workout_sets_snapshot_prescription before insert/);
});

test("history pins the rows it points at: they cannot be deleted by a save", async () => {
  const migration = await source("supabase/migrations/202608110008_coach_edits_official_programmes.sql");
  assert.match(migration, /raise exception 'exercise_has_history'/);
  assert.match(migration, /raise exception 'day_has_history'/);
  // Replacing the exercise in a trained slot is still allowed - the slot keeps
  // its identity, so the client's past keeps pointing at something real.
  assert.match(migration, /on conflict\(id\) do update set day_id=excluded\.day_id,exercise_id=excluded\.exercise_id/);
});

test("editing is not gated on the client-side role, which arrives late", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  // The route is already coach-only in the proxy and the RPC re-checks server
  // side, so a role read from the snapshot added nothing but a race: the fields
  // rendered read-only until it arrived.
  assert.doesNotMatch(day, /role === "coach"/);
  const proxy = await source("proxy.ts");
  assert.match(proxy, /\(profile\.role === "coach"\) !== coachPath/);
});

test("the muscle group is a tag on every exercise card", async () => {
  for (const path of [
    "components/workouts/WorkoutDayPreview.tsx",
    "components/workouts/client/AssignedProgram.tsx",
    "components/workouts/client/WorkoutSession.tsx",
    "components/workouts/client/TodayWorkout.tsx",
  ]) {
    const text = await source(path);
    assert.match(text, /primaryMuscleGroup \?\? "קבוצת שריר לא סווגה"|primaryMuscleGroup\?\?"קבוצת שריר לא סווגה"/, `${path} does not tag the muscle group`);
  }
  // The builder shows it too, from the same bank field.
  const builder = await source("components/workouts/coach/CustomProgramEditor.tsx");
  assert.match(builder, /className="pill pill--green">\{exercise\?\.primaryMuscleGroup/);
});

test("video and guidance sit together everywhere an exercise is named", async () => {
  for (const path of [
    "components/workouts/WorkoutDayPreview.tsx",
    "components/workouts/coach/CustomProgramEditor.tsx",
    "components/workouts/client/AssignedProgram.tsx",
    "components/workouts/client/WorkoutSession.tsx",
    "components/workouts/client/TodayWorkout.tsx",
    "components/workouts/coach/ExerciseDirectory.tsx",
  ]) {
    const text = await source(path);
    assert.match(text, /ExerciseGuidanceButton/, `${path} is missing the guidance button`);
  }
});

test("today's screen lists today's exercises rather than only naming the day", async () => {
  const today = await source("components/workouts/client/TodayWorkout.tsx");
  // The client could not see what was coming, or read the coach's דגשים, without
  // starting the workout first.
  assert.match(today, /id="today-exercises"/);
  assert.match(today, /\[\.\.\.day\.exercises\]\.sort\(\(a,b\)=>a\.order-b\.order\)/);
  // Reused, not reimplemented: the sheet and its content come from the shared
  // component, and the fields come from the same catalogue entry.
  assert.match(today, /import ExerciseGuidanceButton from "@\/components\/workouts\/ExerciseGuidanceButton"/);
  assert.doesNotMatch(today, /buildGuidanceView|normalizeGuidance/);
  assert.match(today, /getExercise/);
});

test("a missing catalogue field is named, never filled in with something plausible", async () => {
  const guidance = await source("lib/workouts/exercise-guidance.ts");
  // Every section is either present with real content or absent and listed as
  // missing - there is no default string standing in for a coach's words.
  assert.match(guidance, /else missing\.push\("how-to"\)/);
  assert.match(guidance, /else missing\.push\("cues"\)/);
  assert.match(guidance, /else missing\.push\("mistakes"\)/);
  const panel = await source("components/workouts/ExerciseGuidanceButton.tsx");
  assert.match(panel, /לא הועלתה תמונה לתרגיל/);
  assert.match(panel, /view\.missing\.length > 0/);
  // The client's card says the group is unclassified rather than guessing one.
  const today = await source("components/workouts/client/TodayWorkout.tsx");
  assert.match(today, /primaryMuscleGroup\?\?"קבוצת שריר לא סווגה"/);
});

test("the guidance sheet closes three ways and gives the page back", async () => {
  const sheet = await source("components/client/BottomSheet.tsx");
  assert.match(sheet, /className="sheet-backdrop" onClick=\{onClose\}/);
  assert.match(sheet, /if \(event\.key === "Escape"\)/);
  // Whatever the page's overflow was before the sheet opened is what it gets
  // back - the cleanup restores it rather than clearing it to a guess.
  assert.match(sheet, /const previousOverflow = document\.body\.style\.overflow/);
  assert.match(sheet, /document\.body\.style\.overflow = previousOverflow/);
  const button = await source("components/workouts/ExerciseGuidanceButton.tsx");
  assert.match(button, /onClick=\{\(\) => setOpen\(false\)\}/);
});
