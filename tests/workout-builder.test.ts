import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the builder can reorder, replace, duplicate and move an exercise between days", async () => {
  const editor = await source("components/workouts/coach/CustomProgramEditor.tsx");

  // Drag is the mouse path.
  assert.match(editor, /draggable/);
  assert.match(editor, /onDragStart/);
  assert.match(editor, /onDrop/);
  assert.match(editor, /const dropOn=/);

  // The pre-existing button path is still there - it is the only one that works
  // on a phone, where HTML5 drag never fires.
  assert.match(editor, /aria-label="הזזת תרגיל למעלה"/);
  assert.match(editor, /aria-label="הזזת תרגיל למטה"/);
  assert.match(editor, /const moveExercise=/);

  assert.match(editor, /const duplicateExercise=/);
  assert.match(editor, /const replaceExercise=/);
  assert.match(editor, /const moveExerciseToDay=/);
  assert.match(editor, /const removeExercise=/);
});

test("replacing an exercise keeps the prescription the coach typed", async () => {
  const editor = await source("components/workouts/coach/CustomProgramEditor.tsx");
  // Only the exercise identity changes; sets, reps, rest and notes belong to the
  // slot, so a swap must not reset them.
  assert.match(editor, /patchExercise\(dayId,slotId,\{exerciseId\}\)/);
});

test("duplicating produces an independent slot, not a shared reference", async () => {
  const editor = await source("components/workouts/coach/CustomProgramEditor.tsx");
  assert.match(editor, /id:uid\("workout-exercise"\),setPrescriptions:source\.setPrescriptions\?\.map\(set=>\(\{\.\.\.set,id:uid\("set"\)\}\)\)/);
});

test("order is renumbered before every save, so it survives a reload", async () => {
  const editor = await source("components/workouts/coach/CustomProgramEditor.tsx");
  // normalizeDays rewrites day.order and exercise.order from array position.
  assert.match(editor, /const normalizeDays=/);
  assert.match(editor, /days:normalizeDays\(draft\.days\)/);
  assert.match(editor, /exercises:day\.exercises\.map\(\(exercise,exerciseIndex\)=>\(\{\.\.\.exercise,order:exerciseIndex/);
});

test("the drag handle is hidden where dragging cannot work", async () => {
  const css = await source("app/globals.css");
  assert.match(css, /@media \(pointer: coarse\) \{ \.exercise-slot__handle \{ display: none; \} \}/);
});

test("a missing video is stated, and never blocks the workout", async () => {
  const session = await source("components/workouts/client/WorkoutSession.tsx");
  const detail = await source("components/workouts/client/ExerciseDetail.tsx");

  assert.match(detail, /לתרגיל זה עדיין לא נוסף סרטון/);
  assert.match(session, /אין סרטון/);

  // Nothing about the session gates on a link existing.
  assert.doesNotMatch(session, /video[^\n]*\?\s*null\s*:/);
  assert.doesNotMatch(session, /disabled=\{[^}]*video/);
});

test("a programme's workout count is never presented as its weekly cadence", async () => {
  const directory = await source("components/workouts/coach/WorkoutProgramsDirectory.tsx");
  const coachProgram = await source("components/workouts/coach/CoachWorkoutProgram.tsx");
  const assigned = await source("components/workouts/client/AssignedProgram.tsx");

  // FBW is one workout run three times a week; A-B is two workouts run four
  // times. Labelling the template count "ימים" made the first read as "train
  // once a week".
  assert.doesNotMatch(directory, /days\.length\} ימים/);
  assert.match(directory, /אימונים שונים/);
  assert.match(directory, /אימונים בשבוע/);

  assert.doesNotMatch(coachProgram, /label="ימי אימון"/);
  assert.match(coachProgram, /label="אימונים שונים"/);

  assert.match(assigned, /label="אימונים שונים"/);
  assert.match(assigned, /label="אימונים בשבוע"/);
});

test("the coach can set the weekly frequency when assigning, not just accept the default", async () => {
  const coachProgram = await source("components/workouts/coach/CoachWorkoutProgram.tsx");
  assert.match(coachProgram, /weeklyFrequency:Number\(frequency\)/);
  assert.match(coachProgram, /min="1" max="7"/);
  // The source default is offered but not imposed.
  assert.match(coachProgram, /useState\(String\(program\?\.trainingFrequency\?\?""\)\)/);
  assert.match(coachProgram, /ברירת המחדל מהמקור/);
});

test("the workout shows what the source carries about an exercise", async () => {
  const session = await source("components/workouts/client/WorkoutSession.tsx");
  // Muscle group and equipment, then the source's own notes.
  assert.match(session, /exercise\?\.primaryMuscleGroup,exercise\?\.equipment/);
  assert.match(session, /current\.notes\|\|exercise\?\.executionNotes/);
});
