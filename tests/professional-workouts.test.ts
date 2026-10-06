import test from "node:test";
import assert from "node:assert/strict";
import {BUILT_IN_PROGRAMS,PROGRAM_DEFINITIONS,buildProgram,weeklyWorkingSets,estimatedDayMinutes} from "../lib/workouts/program-catalog.ts";
import {recommendTraining,personalizeProgram,intakeFromForm,trainingPreferences,type TrainingIntake} from "../lib/workouts/personalization.ts";
import {weeklySchedule} from "../lib/workouts/schedule.ts";
import {getTodayWorkoutDay} from "../lib/workouts/progress.ts";
import {planWarmup} from "../lib/workouts/warmup.ts";
import {nextWorkoutChallenge} from "../lib/workouts/challenge.ts";
import type {ExerciseSetResult} from "../lib/workouts/types.ts";

const base:TrainingIntake={sex:"female",traineeLevel:"advanced",weeklyWorkouts:4,trainingLocation:"gym",equipment:"gym",trainingFocus:"back",trainingSplit:"A-B",sessionMinutes:90,medicalReview:"no",experienceMonths:36,technique:"stable"};
const working=(p:typeof BUILT_IN_PROGRAMS[number])=>p.days.flatMap(d=>d.exercises).filter(e=>e.movementPattern);

test("all revised doses respect peak rotating-week ceilings at every supported frequency",()=>{
 for(const def of PROGRAM_DEFINITIONS)for(const frequency of def.split==="FBW"?[2,3]:def.split==="A-B"?[2,3,4]:[3,4,5,6])for(const goal of ["general","hypertrophy","strength"] as const){
  const p=buildProgram(def,def.level??"beginner",{frequency,goal});
  for(const [region,sets] of Object.entries(weeklyWorkingSets(p)))assert.ok(sets<=(["biceps","triceps","core","calves"].includes(region)?8:p.difficulty==="מתחילים"?12:18),`${p.id} ${goal} ${frequency} ${region}=${sets}`);
  for(const e of working(p)){
   assert.match(e.reps!,/^\d+( שניות)?$/);assert.ok(Number(e.sets)>0);
   assert.equal(e.setPrescriptions?.length,Number(e.sets));
   assert.ok(e.setPrescriptions?.every(s=>s.repetitions===e.reps));
   if(e.movementPattern==="plank"){assert.equal(e.effort,undefined);assert.doesNotMatch(e.notes!,/חזרות במיכל/);assert.match(e.notes!,/מנח/);}
   else assert.equal(e.effort,p.difficulty==="מתחילים"?"7":"8");
  }
 }
});
test("A-B is upper/lower, PPL never places pulls or glutes in Push, priorities come first",()=>{
 for(const def of PROGRAM_DEFINITIONS){
  const p=buildProgram(def);
  if(def.split==="A-B"){
   assert.ok(p.days[0].exercises.every(e=>!e.movementPattern||["chest","row","vertical","shoulder","curl","triceps","abs"].includes(e.movementPattern)));
   assert.ok(p.days[1].exercises.every(e=>!e.movementPattern||["hip","squat","hinge","lunge","legcurl","abduction","calf","plank"].includes(e.movementPattern)));
   assert.equal(p.days[def.focus==="glutes"?1:0].exercises[1].movementPattern,def.focus==="glutes"?"hip":def.focus==="back"?"row":"chest");
  }
  if(def.split==="PPL")assert.ok(p.days[0].exercises.every(e=>!["row","vertical","hip","hinge","abduction","lunge"].includes(e.movementPattern??"")));
 }
 const back=BUILT_IN_PROGRAMS.find(p=>p.id==="lifefit-a-b-female-back-advanced-v3")!;
 assert.equal(weeklyWorkingSets(back).back,16);
});
test("unsupported heavy rows are removed; bodyweight advanced legs and unverified pushups have actual variants",()=>{
 for(const p of BUILT_IN_PROGRAMS)assert.ok(!working(p).some(e=>e.exerciseId==="exercise-lp8zrd"));
 const advanced=BUILT_IN_PROGRAMS.find(p=>p.id==="lifefit-home-bodyweight-advanced-v3")!;
 const intermediate=BUILT_IN_PROGRAMS.find(p=>p.id==="lifefit-home-bodyweight-intermediate-v3")!;
 assert.notEqual(working(advanced).find(e=>e.movementPattern==="squat")!.exerciseId,working(intermediate).find(e=>e.movementPattern==="squat")!.exerciseId);
 assert.equal(working(advanced).find(e=>e.movementPattern==="squat")!.sides,2);
 const rec=recommendTraining({...base,weeklyWorkouts:3,trainingFocus:"balanced",trainingSplit:"auto",trainingLocation:"home",equipment:"dumbbells"});
 assert.equal(rec.status,"ready");
 assert.ok(working(personalizeProgram(buildProgram(rec.definition!),rec,90)).filter(e=>e.movementPattern==="chest").every(e=>e.exerciseId==="bodyweight-wall-pushup"));
 assert.equal(recommendTraining({...base,weeklyWorkouts:3,trainingFocus:"balanced",trainingSplit:"auto",trainingLocation:"home",equipment:"bodyweight_station"}).status,"review");
});
test("ready recommendations fit the time budget without cutting rest or silently dropping movements",()=>{
 for(const def of PROGRAM_DEFINITIONS)for(const minutes of [30,40,60,90]){
  const intake:TrainingIntake={...base,sex:def.sex==="all"?"female":def.sex,traineeLevel:def.level??"beginner",weeklyWorkouts:def.frequency,trainingSplit:def.split,trainingFocus:def.focus,equipment:def.homeEquipment??(def.trx?"trx":"gym"),trainingLocation:def.homeEquipment||def.trx?"home":"gym",bodyweightCapacity:"verified",sessionMinutes:minutes};
  const rec=recommendTraining(intake);
  if(rec.status!=="ready"){assert.match(rec.message,/د|זמן|דקות|מאמן/);continue;}
  const p=personalizeProgram(buildProgram(rec.definition!),rec,minutes);
  const full=buildProgram(rec.definition!,rec.level,{frequency:rec.frequency});
  for(const d of p.days){assert.ok(estimatedDayMinutes(d)<=minutes);assert.equal(d.exercises.length,full.days.find(f=>f.id===d.id)!.exercises.length);for(const e of d.exercises)assert.equal(e.rest,full.days.flatMap(f=>f.exercises).find(f=>f.id===e.id)!.rest);}
 }
 assert.equal(recommendTraining({...base,sessionMinutes:30}).status,"review");
 assert.throws(()=>personalizeProgram(BUILT_IN_PROGRAMS[0],{status:"review",message:""},30));
});
test("strength, muscle gain and intake persistence have meaningful targets",()=>{
 const def=PROGRAM_DEFINITIONS.find(d=>d.id==="lifefit-a-b-male-balanced-intermediate-v3")!;
 const strength=buildProgram(def,undefined,{goal:"strength"});
 assert.equal(working(strength).find(e=>e.movementPattern==="chest")!.reps,"6");
 assert.equal(working(strength).find(e=>e.movementPattern==="chest")!.rest,"180 שניות");
 const general=buildProgram(def),muscle=buildProgram(def,undefined,{goal:"hypertrophy"});
 assert.ok(weeklyWorkingSets(muscle).biceps>weeklyWorkingSets(general).biceps);
 const form=new FormData();form.set("trainingGoal","strength");form.set("bodyweightCapacity","verified");
 const prefs=trainingPreferences(intakeFromForm(form));assert.equal(prefs.training_goal,"strength");assert.equal(prefs.bodyweight_capacity,"verified");
 assert.equal(recommendTraining({...base,equipment:"trx",trainingGoal:"strength"}).status,"review");
});
test("professional schedules continue A/B and PPL across weeks without changing legacy schedules",()=>{
 const p=BUILT_IN_PROGRAMS.find(p=>p.id==="lifefit-ppl-male-intermediate-v3")!;
 const a={id:"a",clientId:"c",programId:p.id,assignedAt:"2026-10-04T00:00:00Z",startDate:"2026-10-04",weeklyFrequency:4,status:"active" as const};
 assert.deepEqual(weeklySchedule(p,a,[],"c","2026-10-04").map(s=>s.day.order),[0,1,2,0]);
 assert.deepEqual(weeklySchedule(p,a,[],"c","2026-10-11").map(s=>s.day.order),[1,2,0,1]);
 assert.deepEqual(weeklySchedule({...p,sourceWorkbook:"legacy"},a,[],"c","2026-10-11").map(s=>s.day.order),[0,1,2,0]);
 assert.equal(getTodayWorkoutDay(p,[],"c","2026-10-11",[],4,"a","2026-10-04")?.order,1);
 const completed=weeklySchedule(p,a,[],"c","2026-10-11").map((s,i)=>({id:`c${i}`,clientId:"c",assignmentId:"a",programId:p.id,dayId:s.day.id,startedAt:"2026-10-11T09:00:00Z",completedAt:"2026-10-11T10:00:00Z",durationSeconds:3600,totalVolume:0,exerciseResults:[]}));
 assert.equal(getTodayWorkoutDay(p,completed,"c","2026-10-11",[],4,"a","2026-10-04"),undefined);
});
test("preparation ramps stay brief and prescribed effort alone never increases load",()=>{
 assert.deepEqual(planWarmup(40,{professional:true,compound:true})!.sets.map(s=>s.repetitions),[8,3]);
 assert.deepEqual(planWarmup(10,{professional:true,compound:false})!.sets.map(s=>s.repetitions),[6]);
 assert.ok(planWarmup(1,{professional:true,compound:true})!.sets.every(s=>s.weightKg<=1));
 const sets:ExerciseSetResult[]=[{id:"s",order:0,completed:true,repetitions:10,weightKg:20}];
 assert.equal(nextWorkoutChallenge({sets,targetReps:10,rpe:7,professional:true})!.percent,0);
 assert.equal(nextWorkoutChallenge({sets,targetReps:10,difficulty:"easy",professional:true,successfulExposures:1})!.percent,0);
 assert.ok(nextWorkoutChallenge({sets,targetReps:10,difficulty:"easy",professional:true,successfulExposures:2})!.percent>0);
 assert.ok(nextWorkoutChallenge({sets,targetReps:12,professional:true})!.percent<0);
});
