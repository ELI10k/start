import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { weeklySchedule } from "../lib/workouts/schedule.ts";
import type { ClientWorkoutAssignment, CompletedWorkout, WorkoutProgram } from "../lib/workouts/types.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const program = (dayNames: readonly string[]): WorkoutProgram => ({
  id: "program-1",
  name: dayNames.length === 1 ? "FBW" : dayNames.join("-"),
  equipment: [],
  sourceWorkbook: "test",
  status: "active",
  official: true,
  days: dayNames.map((name, order) => ({ id: `day-${order}`, name, order, exercises: [] })),
});

const assignment = (weeklyFrequency: number): ClientWorkoutAssignment => ({
  id: "assignment-1",
  clientId: "client-1",
  programId: "program-1",
  assignedAt: "2026-08-01T00:00:00.000Z",
  startDate: "2026-08-01",
  weeklyFrequency,
  status: "active",
});

// Sunday 2026-08-09 starts the week; Tuesday 2026-08-11 is inside it.
const TODAY = "2026-08-11";
const completed = (dayId: string, date: string): CompletedWorkout => ({
  id: `workout-${dayId}-${date}`,
  clientId: "client-1",
  assignmentId: "assignment-1",
  programId: "program-1",
  dayId,
  startedAt: `${date}T06:00:00.000Z`,
  completedAt: `${date}T07:00:00.000Z`,
  durationSeconds: 3600,
  exerciseResults: [],
  totalVolume: 0,
});

test("FBW is one workout trained three times a week, not one session", () => {
  const schedule = weeklySchedule(program(["FBW"]), assignment(3), [], "client-1", TODAY);
  assert.equal(schedule.length, 3);
  assert.deepEqual(schedule.map((session) => session.day.name), ["FBW", "FBW", "FBW"]);
  assert.deepEqual(schedule.map((session) => session.occurrence), [0, 1, 2]);
});

test("A-B at four a week cycles the two workouts", () => {
  const schedule = weeklySchedule(program(["A", "B"]), assignment(4), [], "client-1", TODAY);
  assert.deepEqual(schedule.map((session) => session.day.name), ["A", "B", "A", "B"]);
});

test("A-B-C runs at whatever frequency the coach set for this client", () => {
  assert.equal(weeklySchedule(program(["A", "B", "C"]), assignment(3), [], "client-1", TODAY).length, 3);
  const four = weeklySchedule(program(["A", "B", "C"]), assignment(4), [], "client-1", TODAY);
  assert.deepEqual(four.map((session) => session.day.name), ["A", "B", "C", "A"]);
});

test("the second FBW of the week ticks the second row, not the first one twice", () => {
  const schedule = weeklySchedule(
    program(["FBW"]),
    assignment(3),
    [completed("day-0", "2026-08-09"), completed("day-0", "2026-08-10")],
    "client-1",
    TODAY,
  );
  assert.deepEqual(schedule.map((session) => session.completed), [true, true, false]);
});

test("last week's workouts do not tick this week's rows", () => {
  const schedule = weeklySchedule(program(["FBW"]), assignment(2), [completed("day-0", "2026-08-07")], "client-1", TODAY);
  assert.deepEqual(schedule.map((session) => session.completed), [false, false]);
});

test("a programme with no days schedules nothing rather than throwing", () => {
  assert.deepEqual(weeklySchedule(program([]), assignment(3), [], "client-1", TODAY), []);
});

test("the coach can change one client's frequency without re-assigning", async () => {
  const migration = await source("supabase/migrations/202608110001_assignment_frequency.sql");
  assert.match(migration, /create or replace function public\.set_workout_assignment_frequency/);
  // Coach-only, their own client only, and only while the assignment still runs.
  assert.match(migration, /public\.current_role\(\)<>'coach' or not public\.is_coach_for\(v_client_id\)/);
  assert.match(migration, /v_status not in \('active','paused'\)/);
  assert.match(migration, /p_weekly_frequency<1 or p_weekly_frequency>7/);

  const repository = await source("lib/workouts/supabase-repository.ts");
  assert.match(repository, /setAssignmentFrequency:async\(id:string,weeklyFrequency:number\)/);

  // The status RPC archives sessions; the frequency RPC must not touch them.
  assert.doesNotMatch(migration, /workout_sessions/);

  const editor = await source("components/workouts/coach/CoachWorkoutProgram.tsx");
  assert.match(editor, /function FrequencyControl/);
  assert.match(editor, /אימונים בשבוע ללקוח הזה/);
});
