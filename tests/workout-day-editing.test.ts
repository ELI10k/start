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

test("an approved programme is read-only, and says why", async () => {
  const day = await source("components/workouts/WorkoutDayPreview.tsx");
  // save_workout_program_tree rejects anything flagged official, so offering
  // editable fields there would be offering a save that cannot succeed.
  assert.match(day, /const readOnly = program\.official/);
  assert.match(day, /const canEdit = !readOnly/);
  assert.match(day, /יצירת עותק לעריכה/);

  const migration = await source("supabase/migrations/202607200004_workout_persistence.sql");
  assert.match(migration, /coalesce\(\(p_program->>'official'\)::boolean,false\) then raise exception 'not_authorized'/);
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
    "components/workouts/coach/ExerciseDirectory.tsx",
  ]) {
    const text = await source(path);
    assert.match(text, /ExerciseGuidanceButton/, `${path} is missing the guidance button`);
  }
});
