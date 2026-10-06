import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {BUILT_IN_PROGRAMS, PROGRAM_DEFINITIONS, buildProgram} from "../lib/workouts/program-catalog.ts";
import {assessedLevel, recommendTraining, personalizeProgram, alternativeExercises, type TrainingIntake} from "../lib/workouts/personalization.ts";
import type {Exercise} from "../lib/workouts/types.ts";
const input: TrainingIntake={sex:"female",traineeLevel:"beginner",weeklyWorkouts:3,trainingLocation:"gym",equipment:"gym",trainingFocus:"glutes",trainingSplit:"auto",sessionMinutes:60,medicalReview:"no",experienceMonths:8,technique:"stable"};
const catalogue=JSON.parse(await readFile(new URL("../data/personalized-workout-exercises.json",import.meta.url),"utf8"));

test("38 distinct programmes, with all prescriptions, real exercises and complete muscle coverage",()=>{
  assert.equal(BUILT_IN_PROGRAMS.length,38);
  assert.equal(new Set(BUILT_IN_PROGRAMS.map(p=>p.name)).size,38);
  for(const p of BUILT_IN_PROGRAMS){
    const groups=new Set<string>();
    for(const day of p.days){
      assert.equal(day.exercises[0].exerciseId,"exercise-155pu7s");
      for(const e of day.exercises){
        const real=catalogue.find((x: {id:string})=>x.id===e.exerciseId);
        assert.ok(real,`${p.name}: missing ${e.exerciseId}`);
        assert.ok(real.video?.url,`${real.name}: no real media`);
        groups.add(real.primary_muscle_group === "בטן" ? "שרירי ליבה" : real.primary_muscle_group);
        if(e.exerciseId==="exercise-155pu7s")continue;
        assert.match(e.reps!,/^\d+( שניות)?$/);
        assert.equal(e.setPrescriptions?.length,Number(e.sets));
        assert.ok(e.rest);
      }
    }
    for(const group of ["חזה","גב","רגליים","כתפיים","יד קדמית","יד אחורית","שרירי ליבה"]) assert.ok(groups.has(group),`${p.name}: ${group}`);
  }
});
test("expanded gym and home catalogue selects the correct sex, level and equipment",()=>{
  for(const level of ["beginner","intermediate","advanced"] as const){
    const base={...input,traineeLevel:level,experienceMonths:36,trainingFocus:"balanced",trainingLocation:"home"};
    for(const equipment of ["dumbbells","dumbbells_bench"]){
      const rec=recommendTraining({...base,equipment});
      assert.equal(rec.programId,`lifefit-home-${equipment}-${level}-v2`);
      const program=buildProgram(rec.definition!);
      assert.equal(program.equipment.includes("ספסל"),equipment==="dumbbells_bench");
      assert.ok(program.days.flatMap(d=>d.exercises).every(e=>!catalogue.find((x:{id:string})=>x.id===e.exerciseId)?.equipment?.match(/מכונה|פולי|מוט/)));
    }
    assert.equal(recommendTraining({...base,trainingLocation:"gym",equipment:"gym",sex:"female"}).programId,`lifefit-fbw-female-balanced-${level}-v2`);
    assert.equal(recommendTraining({...base,trainingLocation:"gym",equipment:"gym",sex:"male",trainingSplit:"A-B"}).programId,`lifefit-a-b-male-balanced-${level}-v2`);
    if(level!=="beginner"){
      assert.equal(recommendTraining({...base,equipment:"bodyweight_station",bodyweightCapacity:"verified"}).programId,`lifefit-home-bodyweight-${level}-v2`);
      assert.equal(recommendTraining({...base,trainingLocation:"gym",equipment:"gym",sex:"male"}).programId,`lifefit-fbw-male-balanced-${level}-v2`);
    }
  }
  assert.equal(recommendTraining({...input,trainingFocus:"balanced",equipment:"bodyweight"}).status,"review");
  assert.equal(recommendTraining({...input,trainingFocus:"balanced",equipment:"dumbbells",weeklyWorkouts:4}).status,"review");
  assert.equal(recommendTraining({...input,equipment:"dumbbells"}).status,"review");
});
test("home substitutions never introduce an unavailable bench, machine or pull-up station",()=>{
  const row=ex("resistance-dumbbell-bent-over-row","חתירה כנגד משקולת","גב","משקולות יד");
  const benchRow=ex("resistance-dumbbell-one-arm-bent-over-row","חתירה ביד אחת","גב","משקולות יד");
  const supported=ex("exercise-1h0qzj6","חתירה מעל הספה","גב","משקולות יד");
  const prefs={clientId:"x",trainingTypes:[],equipment:["משקולות יד","משקל גוף"],trainingLocation:"home",preferredDays:[]};
  assert.equal(alternativeExercises(row,[row,benchRow,supported],prefs).length,0);
  assert.deepEqual(alternativeExercises(row,[row,benchRow,supported],{...prefs,equipment:[...prefs.equipment,"ספסל"]}).map(e=>e.id),[benchRow.id]);
});
test("automatic selection considers level, frequency, equipment and focus",()=>{
  assert.equal(recommendTraining(input).programId,"lifefit-fbw-female-glutes-v2");
  assert.equal(recommendTraining({...input,trainingSplit:"PPL"}).programId,"lifefit-ppl-female-glutes-beginner-v2");
  assert.equal(recommendTraining({...input,traineeLevel:"intermediate",weeklyWorkouts:4}).programId,"lifefit-a-b-female-glutes-intermediate-v2");
  assert.equal(recommendTraining({...input,traineeLevel:"advanced",experienceMonths:36,weeklyWorkouts:6,trainingFocus:"back"}).programId,"lifefit-ppl-female-back-advanced-v2");
  assert.equal(recommendTraining({...input,equipment:"trx",trainingLocation:"home"}).programId,"lifefit-trx-female-glutes-v2");
});
test("medical concerns, missing data and impossible schedules require review",()=>{
  assert.equal(recommendTraining({...input,medicalReview:"yes"}).status,"review");
  assert.equal(recommendTraining({...input,medicalNotes:"כאב ברך"}).status,"review");
  assert.equal(recommendTraining({...input,equipment:""}).status,"missing");
  assert.equal(recommendTraining({...input,weeklyWorkouts:2,trainingSplit:"PPL"}).status,"review");
  assert.equal(recommendTraining({...input,weeklyWorkouts:6,trainingSplit:"FBW"}).status,"review");
  assert.equal(recommendTraining({...input,trainingLocation:"home"}).status,"review");
});
test("experience and technique can lower a self-reported advanced level",()=>{
  assert.equal(assessedLevel({...input,traineeLevel:"advanced",experienceMonths:3}),"beginner");
  assert.equal(assessedLevel({...input,traineeLevel:"advanced",experienceMonths:14}),"intermediate");
  assert.equal(assessedLevel({...input,traineeLevel:"advanced",experienceMonths:36,technique:"learning"}),"beginner");
});
test("short sessions reduce sets while retaining every movement and fixed targets",()=>{
  const rec=recommendTraining({...input,sessionMinutes:40});
  const p=personalizeProgram(buildProgram(rec.definition!),rec,40);
  for(const day of p.days)for(const e of day.exercises)if(e.exerciseId!=="exercise-155pu7s")assert.equal(e.sets,"2");
  const advanced=buildProgram(PROGRAM_DEFINITIONS[0],"advanced");
  assert.match(advanced.days[1].exercises.at(-1)!.reps!,/30 שניות/);
});
const ex=(id:string,name:string,muscle:string,equipment:string):Exercise=>({id,name,normalizedName:name,aliases:[],primaryMuscleGroup:muscle,equipment,secondaryMuscleGroups:[],cues:[],commonMistakes:[],sourceWorkbooks:[],sourceReferences:[],status:"active"});
test("replacements preserve movement, units and home equipment",()=>{
  const row=ex("exercise-126wehi","חתירה במכונה","גב","מכונה ייעודית");
  const trx=ex("resistance-suspended-row","חתירה ברצועות","גב","רצועות תלייה");
  const pull=ex("exercise-1ly3xqh","משיכה בפולי עליון","גב","כבל פולי");
  assert.deepEqual(alternativeExercises(row,[row,trx,pull],{clientId:"x",trainingTypes:[],equipment:["TRX"],trainingLocation:"home",preferredDays:[]}).map(e=>e.id),[trx.id]);
  const plank=ex("bodyweight-front-plank","פלאנק","שרירי ליבה","משקל גוף");
  const abs=ex("exercise-pn4ire","כפיפות בטן","שרירי ליבה","משקל גוף");
  assert.equal(alternativeExercises(plank,[plank,abs]).length,0);
});
