import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {BUILT_IN_PROGRAMS,weeklyWorkingSets} from "../lib/workouts/program-catalog.ts";
import {workoutAvailability} from "../lib/workouts/availability.ts";
import {weeklySchedule} from "../lib/workouts/schedule.ts";
import {exercisePerformance} from "../lib/workouts/progress.ts";
import {substituteExercise} from "../lib/workouts/substitution.ts";
import {alternativeExercises} from "../lib/workouts/personalization.ts";
import {isCompoundLift,preparationGroup} from "../lib/workouts/warmup.ts";
import {trainingSlots} from "../lib/workouts/professional.ts";
import type {ActiveExerciseResult,CompletedWorkout,ClientWorkoutAssignment,Exercise,WorkoutPreferences} from "../lib/workouts/types.ts";
const p=BUILT_IN_PROGRAMS.find(p=>p.id==="lifefit-fbw-male-balanced-beginner-v3")!;
const a:ClientWorkoutAssignment={id:"a",clientId:"c",programId:p.id,assignedAt:"2026-10-04T08:00:00Z",startDate:"2026-10-04",weeklyFrequency:3,status:"active"};
const result:ActiveExerciseResult={workoutExerciseId:"e",exerciseId:"original",completed:false,skipped:false,difficulty:"easy",warmupCompletedPercents:[50],sets:[{id:"s",order:0,weightKg:40,repetitions:10,completed:false}]};
const completed=(date:string,day=p.days[0],assignment=a):CompletedWorkout=>({id:date,clientId:"c",assignmentId:assignment.id,programId:assignment.programId,dayId:day.id,startedAt:`${date}T08:00:00Z`,completedAt:`${date}T09:00:00Z`,durationSeconds:3600,totalVolume:400,exerciseResults:[{...result,completed:true,performedExerciseId:"replacement",sets:result.sets.map(s=>({...s,completed:true}))}]});
test("swaps clear unrecorded load/reps/preparation and cannot overwrite recorded sets",()=>{
 const swapped=substituteExercise(result,"replacement");
 assert.equal(swapped.performedExerciseId,"replacement");assert.equal(swapped.sets[0].weightKg,undefined);assert.equal(swapped.sets[0].repetitions,undefined);assert.equal(swapped.difficulty,undefined);assert.deepEqual(swapped.warmupCompletedPercents,[]);
 assert.equal(result.sets[0].weightKg,40);
 assert.throws(()=>substituteExercise({...result,sets:result.sets.map(s=>({...s,completed:true}))},"replacement"));
 assert.equal(substituteExercise(swapped,"original").performedExerciseId,undefined);
});
test("history attributes load to the performed exercise, not the replaced prescription",()=>{
 const history=[completed("2026-10-04")];assert.equal(exercisePerformance(history,"c","original").sessions.length,0);assert.equal(exercisePerformance(history,"c","replacement").sessions[0].volume,400);
});
const ex=(id:string,name:string,difficulty="מתחילים"):Exercise=>({id,name,difficulty,normalizedName:name,aliases:[],primaryMuscleGroup:"חזה",equipment:"משקל גוף",secondaryMuscleGroups:[],cues:[],commonMistakes:[],sourceWorkbooks:[],sourceReferences:[],status:"active"});
const prefs:WorkoutPreferences={clientId:"c",trainingTypes:[],equipment:["משקל גוף"],preferredDays:[],traineeLevel:"beginner"};
test("floor pushup alternatives require verified capacity and an appropriate level",()=>{
 const wall=ex("bodyweight-wall-pushup","שכיבות סמיכה בקיר"),floor=ex("exercise-hdg3yz","שכיבות סמיכה");
 assert.equal(alternativeExercises(wall,[floor],prefs).length,0);
 assert.equal(alternativeExercises(wall,[floor],{...prefs,bodyweightCapacity:"verified"}).length,1);
 assert.equal(alternativeExercises(wall,[{...floor,difficulty:"מתקדמים"}],{...prefs,bodyweightCapacity:"verified"}).length,0);
 assert.equal(alternativeExercises(wall,[floor],{...prefs,bodyweightCapacity:"verified",requiresCoachReview:true}).length,0);
});
test("all 38 cycles contain direct calves and separate quad/hamstring coverage",()=>{
 for(const program of BUILT_IN_PROGRAMS){const sets=weeklyWorkingSets(program);for(const region of ["quads","hamstrings","calves"])assert.ok(sets[region]>0,`${program.id} ${region}`);}
 for(const program of BUILT_IN_PROGRAMS.filter(p=>p.id.includes("trx"))){assert.ok(program.equipment.includes("מגבת"));assert.ok(program.days.flatMap(d=>d.exercises).some(e=>e.movementPattern==="legcurl"));}
});
test("preparation distinguishes lower-body movements and correctly classifies compound lifts",()=>{
 for(const name of ["לחיצת כתפיים","חתירה במכונה","משיכה בפולי עליון","היפ טראסט"])assert.equal(isCompoundLift(name),true,name);
 assert.equal(isCompoundLift("לחיצה צרפתית"),false);assert.notEqual(preparationGroup("squat"),preparationGroup("hinge"));
});
test("FBW blocks a second same-day/next-day workout and unlocks after recovery",()=>{
 const history=[completed("2026-10-04")];
 assert.equal(workoutAvailability(p,a,history,"2026-10-04").status,"recovery");
 assert.equal(workoutAvailability(p,a,history,"2026-10-05").status,"recovery");
 const next=workoutAvailability(p,a,history,"2026-10-06");assert.equal(next.status,"ready");assert.equal(next.day?.id,p.days[1].id);
});
test("four-day upper/lower allows consecutive different days, never two on the same day",()=>{
 const split=BUILT_IN_PROGRAMS.find(p=>p.id==="lifefit-a-b-male-balanced-intermediate-v3")!;
 const assigned={...a,programId:split.id,weeklyFrequency:4};const history=[completed("2026-10-04",split.days[0],assigned)];
 assert.equal(workoutAvailability(split,assigned,history,"2026-10-04").status,"recovery");
 assert.equal(workoutAvailability(split,assigned,history,"2026-10-05").status,"ready");
});
test("partial first weeks do not invent missed sessions and rotation continues next week",()=>{
 const assigned={...a,startDate:"2026-10-08"};
 assert.deepEqual(weeklySchedule(p,assigned,[],"c","2026-10-08").map(s=>s.scheduledDate),["2026-10-08"]);
 assert.equal(weeklySchedule(p,assigned,[],"c","2026-10-11")[0].day.id,p.days[1].id);
 assert.equal(workoutAvailability(p,assigned,[],"2026-10-07").status,"recovery");
 assert.equal(workoutAvailability(p,{...assigned,endDate:"2026-10-08"},[],"2026-10-11").status,"complete");
});
test("weekly completion is not an empty-program error, and recovery crosses week boundaries",()=>{
 const history=[completed("2026-10-04"),completed("2026-10-06",p.days[1]),completed("2026-10-08")];
 assert.equal(workoutAvailability(p,a,history,"2026-10-09").status,"complete");
 assert.equal(workoutAvailability({...p,days:[]},a,[],"2026-10-09").status,"empty");
 assert.equal(workoutAvailability(p,a,[completed("2026-10-10")],"2026-10-11").status,"recovery");
 assert.equal(workoutAvailability(p,a,[completed("2026-10-10")],"2026-10-12").status,"ready");
 assert.deepEqual(trainingSlots(3,true,[0,1,2]),[0,2,4]);assert.deepEqual(trainingSlots(6,true),[]);
});
test("both direct entry and provider enforce availability; server protects physical recovery",async()=>{
 for(const file of ["../components/workouts/client/WorkoutSession.tsx","../components/workouts/WorkoutProvider.tsx"]){const source=await readFile(new URL(file,import.meta.url),"utf8");assert.match(source,/workoutAvailability/);assert.match(source,/status!=="ready"/);}
 const sql=await readFile(new URL("../scripts/professional-workout-guards.sql",import.meta.url),"utf8");assert.match(sql,/workout_recovery_required/);assert.match(sql,/workout_week_complete/);assert.match(sql,/Asia\/Jerusalem/);
});
