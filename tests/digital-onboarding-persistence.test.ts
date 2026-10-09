import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("digital onboarding computes targets on the server and records structured stage results",async()=>{
  const action=await source("app/actions/onboarding.ts");
  assert.match(action,/calculateEnergy\(/);assert.match(action,/calculateDietMacros\(/);
  assert.match(action,/onboarding_generation_results:results/);
  assert.match(action,/assignPersonalizedTraining\(admin/);assert.match(action,/assignPersonalizedNutrition\(admin/);
});

test("digital RPCs are service-role-only, atomic and idempotent",async()=>{
  const sql=await source("supabase/migrations/20261007120000_digital_client_workout_assignment.sql");
  for(const fn of ["assign_digital_intake_workout","assign_digital_intake_meal_plan"]){
    assert.match(sql,new RegExp(`revoke all on function public\\.${fn}[\\s\\S]*from public,anon,authenticated`));
    assert.match(sql,new RegExp(`grant execute on function public\\.${fn}[\\s\\S]*to service_role`));
  }
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/where client_id=p_client_id and status='active'/);
  assert.match(sql,/dietary_metadata_verified/);
  assert.match(sql,/generated_from_template_id/);
  assert.match(sql,/personalization_rules_version/);
});
