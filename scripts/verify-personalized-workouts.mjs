import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {config} from "dotenv";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "@playwright/test";
import {BUILT_IN_PROGRAMS} from "../lib/workouts/program-catalog.ts";
import {israelDateKey} from "../lib/date-time.ts";

config({path:new URL("../.env.e2e",import.meta.url).pathname,quiet:true});
config({path:new URL("../.env.local",import.meta.url).pathname,quiet:true});
const base=process.argv[2]??"https://start.elicohenfitness.co.il";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:auth,error:authError}=await client.auth.signInWithPassword({email:process.env.E2E_COACH_EMAIL,password:process.env.E2E_COACH_PASSWORD});
if(authError)throw new Error(`Test coach sign-in failed: ${authError.code}`);
const session=auth.session;
const key=`sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
const encoded=`base64-${Buffer.from(JSON.stringify(session)).toString("base64")}`;
const cookies=[];
for(let n=0;n*3180<encoded.length;n++)cookies.push({name:encoded.length<=3180?key:`${key}.${n}`,value:encoded.slice(n*3180,(n+1)*3180),domain:new URL(base).hostname,path:"/",secure:base.startsWith("https"),sameSite:"Lax"});
cookies.push({name:"start-device-id",value:"personalized-workout-coach-verification",domain:new URL(base).hostname,path:"/",secure:base.startsWith("https"),sameSite:"Lax"});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:1000},locale:"he-IL"});
await context.addCookies(cookies);
const page=await context.newPage();
const report={};
let admin,createdId,copyId;
const check=(error,step)=>{if(error)throw new Error(`${step}: ${error.code??error.message}`)};
try {
  await page.goto(`${base}/coach/workouts`,{waitUntil:"networkidle"});
  await page.getByRole("heading",{name:"תוכניות אימון",exact:true}).waitFor();
  for(const program of BUILT_IN_PROGRAMS)await page.getByRole("heading",{name:program.name,exact:true}).waitFor({timeout:15000});
  report.catalogue=BUILT_IN_PROGRAMS.length;
  await page.getByPlaceholder("חיפוש תוכנית",{exact:true}).fill("TRX");
  await page.getByRole("heading",{name:"אימון TRX FBW לגברים",exact:true}).waitFor();
  await page.screenshot({path:new URL("../reports/personalized-workout-catalog.png",import.meta.url).pathname,fullPage:false});
  await page.goto(`${base}/coach/clients/new`,{waitUntil:"networkidle"});
  await page.getByLabel("מין",{exact:true}).selectOption("female");
  await page.getByLabel("רמת מתאמן",{exact:true}).selectOption("beginner");
  await page.getByLabel("אימונים בשבוע",{exact:true}).fill("3");
  await page.getByLabel("מיקום האימון",{exact:true}).selectOption("gym");
  await page.getByLabel("ציוד זמין לאימון",{exact:true}).selectOption("gym");
  await page.getByLabel("דגש באימון",{exact:true}).selectOption("glutes");
  await page.getByLabel("חלוקת אימונים",{exact:true}).selectOption("auto");
  await page.getByLabel("משך אימון זמין (דקות)",{exact:true}).fill("60");
  await page.getByLabel("חודשי אימון עקבי",{exact:true}).fill("8");
  await page.getByLabel("שליטה בטכניקה",{exact:true}).selectOption("stable");
  await page.getByLabel("פציעה, כאב, היריון או מגבלה רפואית",{exact:true}).selectOption("no");
  await page.getByRole("status").filter({hasText:"אימון FBW לנשים דגש לישבן"}).waitFor();
  report.liveRecommendation="FBW female glutes beginner";
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),"mobile overflow");
  report.mobile="390px, no horizontal overflow";
  for(const equipment of ["dumbbells","dumbbells_bench"]){
    await page.getByLabel("דגש באימון",{exact:true}).selectOption("balanced");
    await page.getByLabel("מיקום האימון",{exact:true}).selectOption("home");
    await page.getByLabel("ציוד זמין לאימון",{exact:true}).selectOption(equipment);
    await page.getByRole("status").filter({hasText:equipment==="dumbbells"?"אימון FBW ביתי משקולות יד בלבד":"אימון FBW ביתי משקולות יד וספסל"}).waitFor();
  }
  report.homeEquipmentRecommendations="dumbbells and dumbbells + bench";

  if(process.env.SUPABASE_SERVICE_ROLE_KEY) {
    admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:coach,error:coachError}=await admin.from("profiles").select("is_test_account").eq("id",session.user.id).single();
    check(coachError,"test coach verification");
    assert.equal(coach.is_test_account,true,"Only an isolated test coach may run mutation smoke tests");
    const live=await admin.from("workout_programs").select("id,status,official,workout_program_days(id,sort_order,workout_program_exercises(id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes,workout_set_prescriptions(repetitions)))").like("id","lifefit-%").eq("official",true).eq("status","active");check(live.error,"revised live catalogue");
    assert.equal(live.data.length,BUILT_IN_PROGRAMS.length);
    for(const expected of BUILT_IN_PROGRAMS){
      const actual=live.data.find(p=>p.id===expected.id);assert.ok(actual,expected.id);assert.equal(actual.workout_program_days.length,expected.days.length);
      for(const day of expected.days){
        const actualDay=actual.workout_program_days.find(d=>d.id===day.id);assert.ok(actualDay);assert.equal(actualDay.workout_program_exercises.length,day.exercises.length);
        for(const entry of day.exercises){
          const actualEntry=actualDay.workout_program_exercises.find(e=>e.id===entry.id);assert.ok(actualEntry);
          assert.equal(actualEntry.exercise_id,entry.exerciseId);assert.equal(actualEntry.sort_order,entry.order);
          assert.equal(actualEntry.sets_text,entry.sets??null);assert.equal(actualEntry.reps_text,entry.reps??null);assert.equal(actualEntry.rest_text,entry.rest??null);
          assert.equal(actualEntry.notes,[entry.effort?`RPE יעד: ${entry.effort}`:null,entry.notes].filter(Boolean).join("\n"));
          assert.equal(actualEntry.workout_set_prescriptions.length,entry.setPrescriptions?.length??0);
          assert.ok(actualEntry.workout_set_prescriptions.every(s=>s.repetitions===entry.reps));
        }
      }
    }
    report.revisedTrees="all 38 live programmes exactly match revised prescriptions";
    const id=randomUUID();
    const createdPassword=`${randomUUID()}Aa1!`;
    const created=await admin.auth.admin.createUser({email:`workout-smoke-${id}@example.invalid`,password:createdPassword,email_confirm:true,app_metadata:{role:"client",is_test_account:true}});
    check(created.error,"create disposable test identity");createdId=created.data.user.id;
    check((await admin.from("profiles").upsert({id:createdId,email:created.data.user.email,full_name:"בדיקת התאמת אימונים",role:"client",status:"active",is_test_account:true})).error,"test profile");
    check((await admin.from("client_profiles").upsert({user_id:createdId,onboarding_completed:true})).error,"test intake");
    check((await admin.from("coach_client_relationships").upsert({coach_id:session.user.id,client_id:createdId,status:"active"},{onConflict:"coach_id,client_id"})).error,"test relationship");
    await page.goto(`${base}/coach/clients/${createdId}?tab=intake`,{waitUntil:"networkidle"});
    const form=page.locator('form').filter({has:page.locator('input[name="clientId"]')});
    await form.getByLabel("מין",{exact:true}).selectOption("female");
    await form.getByLabel("רמת מתאמן",{exact:true}).selectOption("beginner");
    await form.getByLabel("אימונים בשבוע",{exact:true}).fill("3");
    await form.getByLabel("מיקום האימון",{exact:true}).selectOption("gym");
    await form.getByLabel("ציוד זמין לאימון",{exact:true}).selectOption("gym");
    await form.getByLabel("דגש באימון",{exact:true}).selectOption("glutes");
    await form.getByLabel("חלוקת אימונים",{exact:true}).selectOption("auto");
    await form.getByLabel("משך אימון זמין (דקות)",{exact:true}).fill("60");
    await form.getByLabel("חודשי אימון עקבי",{exact:true}).fill("8");
    await form.getByLabel("שליטה בטכניקה",{exact:true}).selectOption("stable");
    await form.getByLabel("פציעה, כאב, היריון או מגבלה רפואית",{exact:true}).selectOption("yes");
    await form.getByRole("button",{name:"שמירת נתוני הקליטה",exact:true}).click();
    await form.getByRole("status").filter({hasText:"דורשים בדיקת מאמן"}).waitFor();
    const before=await admin.from("workout_assignments").select("id").eq("client_id",createdId);check(before.error,"read medical guard");assert.equal(before.data.length,0);
    report.medicalReview="no assignment";
    await page.reload({waitUntil:"networkidle"});
    await form.getByLabel("פציעה, כאב, היריון או מגבלה רפואית",{exact:true}).selectOption("no");
    await form.getByRole("button",{name:"שמירת נתוני הקליטה",exact:true}).click();
    await form.getByRole("status").filter({hasText:"שויכה תוכנית מותאמת"}).waitFor();
    const assignments=await admin.from("workout_assignments").select("id,program_id,weekly_frequency").eq("client_id",createdId).eq("status","active");check(assignments.error,"read assignment");assert.equal(assignments.data.length,1);assert.equal(assignments.data[0].weekly_frequency,3);copyId=assignments.data[0].program_id;
    const days=await admin.from("workout_program_days").select("id,workout_program_exercises(exercise_id,sets_text,reps_text)").eq("program_id",copyId);check(days.error,"read copy");assert.equal(days.data.length,2);assert.ok(days.data.flatMap(d=>d.workout_program_exercises).filter(e=>e.exercise_id!=="exercise-155pu7s").every(e=>e.sets_text==="2"));
    report.personalCopy="2 days; fixed repetitions; fixed targets for 60 minutes";
    await page.reload({waitUntil:"networkidle"});
    assert.equal(await form.getByLabel("דגש באימון",{exact:true}).inputValue(),"glutes");
    assert.equal(await form.getByLabel("משך אימון זמין (דקות)",{exact:true}).inputValue(),"60");
    await form.getByRole("button",{name:"שמירת נתוני הקליטה",exact:true}).click();
    await form.getByRole("status").filter({hasText:"התוכנית הפעילה נשמרה"}).waitFor();
    const repeated=await admin.from("workout_assignments").select("id").eq("client_id",createdId).eq("status","active");assert.equal(repeated.data.length,1);
    report.persistenceAndIdempotency="passed";
    for(const equipment of ["dumbbells","dumbbells_bench"]){
      // Only assignments of this disposable identity are paused for scenario testing.
      check((await admin.from("workout_assignments").update({status:"paused"}).eq("client_id",createdId).eq("status","active")).error,"pause disposable assignment");
      await page.reload({waitUntil:"networkidle"});
      await form.getByLabel("מיקום האימון",{exact:true}).selectOption("home");
      await form.getByLabel("ציוד זמין לאימון",{exact:true}).selectOption(equipment);
      await form.getByLabel("דגש באימון",{exact:true}).selectOption("balanced");
      await form.getByRole("button",{name:"שמירת נתוני הקליטה",exact:true}).click();
      await form.getByRole("status").filter({hasText:"שויכה תוכנית מותאמת"}).waitFor();
      const active=await admin.from("workout_assignments").select("program_id").eq("client_id",createdId).eq("status","active");check(active.error,"home assignment");assert.equal(active.data.length,1);
      const personal=await admin.from("workout_programs").select("duplicated_from_id,equipment").eq("id",active.data[0].program_id).single();check(personal.error,"home copy");
      assert.equal(personal.data.duplicated_from_id,`lifefit-home-${equipment}-beginner-v3`);
      assert.equal(personal.data.equipment.includes("ספסל"),equipment==="dumbbells_bench");
      const preferences=await admin.from("workout_preferences").select("equipment,training_location").eq("client_id",createdId).single();check(preferences.error,"home preferences");
      assert.equal(preferences.data.training_location,"home");assert.equal(preferences.data.equipment.includes("ספסל"),equipment==="dumbbells_bench");
    }
    report.homePersonalAssignments="both equipment options passed";
    // Exercise the real client RPC, never a production client's history.
    const trainee=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    check((await trainee.auth.signInWithPassword({email:created.data.user.email,password:createdPassword})).error,"disposable client sign in");
    const assigned=await admin.from("workout_assignments").select("id,program_id").eq("client_id",createdId).eq("status","active").single();check(assigned.error,"recovery test assignment");
    const exerciseDays=await admin.from("workout_program_days").select("id").eq("program_id",assigned.data.program_id).order("sort_order");check(exerciseDays.error,"recovery test days");
    const today=israelDateKey();const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-date.getUTCDay());const weekStart=date.toISOString().slice(0,10);
    check((await admin.from("workout_assignments").update({start_date:weekStart}).eq("id",assigned.data.id).eq("client_id",createdId)).error,"disposable first week");
    const historicalId=`audit-history-${randomUUID()}`;
    const historical={id:historicalId,client_id:createdId,assignment_id:assigned.data.id,program_id:assigned.data.program_id,day_id:exerciseDays.data[0].id,status:"completed",started_at:`${today}T08:00:00Z`,completed_at:`${today}T09:00:00Z`,duration_seconds:3600,total_volume:0,completion_id:randomUUID()};
    check((await admin.from("workout_sessions").insert(historical)).error,"disposable recovery history");
    const payload={id:`audit-start-${randomUUID()}`,clientId:createdId,assignmentId:assigned.data.id,programId:assigned.data.program_id,dayId:exerciseDays.data[1].id,startedAt:new Date().toISOString(),currentExerciseIndex:0,exerciseResults:[]};
    const blocked=await trainee.rpc("save_active_workout",{p_session:payload});assert.match(blocked.error?.message??"",/workout_recovery_required/);
    const beforeDate=new Date(`${today}T12:00:00Z`);beforeDate.setUTCDate(beforeDate.getUTCDate()-1);
    check((await admin.from("workout_sessions").update({completed_at:beforeDate.toISOString()}).eq("id",historicalId).eq("client_id",createdId)).error,"disposable yesterday history");
    assert.match((await trainee.rpc("save_active_workout",{p_session:payload})).error?.message??"",/workout_recovery_required/);
    beforeDate.setUTCDate(beforeDate.getUTCDate()-1);
    check((await admin.from("workout_sessions").update({completed_at:beforeDate.toISOString()}).eq("id",historicalId).eq("client_id",createdId)).error,"disposable recovered history");
    check((await trainee.rpc("save_active_workout",{p_session:payload})).error,"start after recovery");
    check((await trainee.rpc("save_active_workout",{p_session:payload})).error,"autosave active session");
    check((await trainee.rpc("cancel_active_workout",{})).error,"cancel disposable active session");
    for(let i=0;i<3;i++)check((await admin.from("workout_sessions").insert({...historical,id:`audit-quota-${randomUUID()}`,completion_id:randomUUID()})).error,"disposable weekly quota");
    assert.match((await trainee.rpc("save_active_workout",{p_session:{...payload,id:`audit-quota-start-${randomUUID()}`}})).error?.message??"",/workout_week_complete/);
    report.clientRecoveryRPC="same-day/next-day blocked; recovered start and autosave allowed; weekly quota blocked";
    await trainee.auth.signOut();
  }
} finally {
  await browser.close();
  if(admin&&createdId) {
    // Exact disposable test identity only; production users are never targets.
    const copies=await admin.from("workout_assignments").select("program_id").eq("client_id",createdId);
    const copiedIds=copies.data?.map(a=>a.program_id)??[];
    check((await admin.auth.admin.deleteUser(createdId)).error,"remove disposable test identity");
    for(const programId of new Set([...copiedIds,copyId].filter(Boolean)))check((await admin.from("workout_programs").delete().eq("id",programId).eq("coach_id",session.user.id).eq("official",false)).error,"remove test copy");
    report.disposableTestData="removed";
  }
}
console.log(JSON.stringify(report,null,2));
