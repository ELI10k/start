import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/202608020002_background_reminder_scheduler.sql", import.meta.url),
  "utf8",
);
const route = readFileSync(new URL("../app/api/cron/reminders/route.ts", import.meta.url), "utf8");
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("reminder rules are callable for a named client, not only the caller",()=>{
  for(const fn of ["ensure_in_app_reminders_for_client","ensure_workout_day_reminders_for_client"])
    assert.match(migration,new RegExp(`create or replace function public\\.${fn}\\(p_client_id uuid\\)`));
  assert.match(migration,/create or replace function public\.run_scheduled_reminders\(\) returns integer/);
});

test("the per-client rules never read auth.uid()",()=>{
  // A scheduler run has no session, so a rule that still reads auth.uid() would
  // silently do nothing for every client.
  for(const fn of ["ensure_in_app_reminders_for_client","ensure_workout_day_reminders_for_client","run_scheduled_reminders"]){
    const start=migration.indexOf(`create or replace function public.${fn}`);
    assert.ok(start>=0,fn);
    const body=migration.slice(start,migration.indexOf("end $$;",start));
    assert.doesNotMatch(body,/auth\.uid\(\)/,fn);
  }
});

test("the original entry points still exist and stay client-gated",()=>{
  for(const fn of ["ensure_in_app_reminders","ensure_workout_day_reminders"])
    assert.match(migration,new RegExp(`create or replace function public\\.${fn}\\(\\) returns void`));
  assert.match(migration,/public\.current_role\(\) <> 'client'/);
});

test("reminders keep the dedupe keys that make re-runs idempotent",()=>{
  for(const key of ["check-in-reminder-","weight-reminder-","workout-morning-","workout-evening-"])
    assert.ok(migration.includes(key),key);
});

test("only the service role may run the batch",()=>{
  assert.match(migration,/revoke all on function[\s\S]*?from public, anon, authenticated;/);
  assert.match(migration,/grant execute on function public\.run_scheduled_reminders\(\) to service_role/);
});

test("one failing client cannot stop the run",()=>{
  assert.match(migration,/exception when others then/);
  assert.match(migration,/raise warning 'reminder generation failed/);
});

test("the cron route refuses anything without the shared secret",()=>{
  assert.match(route,/process\.env\.CRON_SECRET/);
  assert.match(route,/isAuthorizedCronRequest\(request, secret\)/);
  assert.match(route,/status: 401/);
  assert.match(route,/run_scheduled_reminders/);
});

test("the cron route never leaks the service key to the browser",()=>{
  assert.doesNotMatch(route,/NEXT_PUBLIC_SUPABASE_SERVICE/);
  assert.match(route,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route,/runtime = "nodejs"/);
});

test("a schedule is registered for the reminder route",()=>{
  const cron=(vercel.crons??[]).find((entry:{path:string})=>entry.path==="/api/cron/reminders");
  assert.ok(cron,"no cron entry for the reminder route");
  assert.match(cron.schedule,/^[\d,*\/ -]+$/);
});
