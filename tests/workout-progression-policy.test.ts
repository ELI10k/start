import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { progressionDecision } from "../lib/workouts/challenge.ts";

test("progression requires two easy complete exposures and respects recovery gates",()=>{
  assert.equal(progressionDecision({allDone:true,difficulty:"easy",successfulExposures:1}),"hold");
  assert.equal(progressionDecision({allDone:true,difficulty:"easy",successfulExposures:2}),"increase");
  assert.equal(progressionDecision({allDone:true,difficulty:"medium",successfulExposures:2}),"hold");
  assert.equal(progressionDecision({allDone:true,difficulty:"hard",successfulExposures:2}),"reduce");
  assert.equal(progressionDecision({allDone:true,difficulty:"easy",successfulExposures:2,deload:true}),"hold");
  assert.equal(progressionDecision({allDone:true,difficulty:"easy",successfulExposures:2,fatigued:true}),"hold");
});

test("deload persistence keeps the latest workout safety guards",async()=>{
  const sql=await readFile(new URL("../supabase/migrations/20261011120000_workout_deload_mode.sql",import.meta.url),"utf8");
  assert.match(sql,/training_mode text not null default 'normal'/);
  assert.match(sql,/warmup_completed_percents/);
  assert.match(sql,/exercise swap notice failed/);
  assert.match(sql,/training_mode=excluded\.training_mode/);
});
