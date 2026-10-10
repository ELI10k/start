import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {exerciseTaxonomy,equipmentTags,presentExercise,MUSCLE_FOLDERS} from "../lib/workouts/exercise-taxonomy.ts";
import {queryExercises} from "../lib/workouts/repository.ts";
import type {Exercise} from "../lib/workouts/types.ts";
import {canonicalizeEquipment,canonicalizeMuscle,categorizeExercise} from "../scripts/lib/exercise-taxonomy.mjs";
const source=JSON.parse(await readFile(new URL("../data/exercise-taxonomy-audit.json",import.meta.url),"utf8"));
const all:Exercise[]=source.map((e:Partial<Exercise>)=>({normalizedName:e.name!,aliases:[],secondaryMuscleGroups:[],cues:[],commonMistakes:[],sourceWorkbooks:[],sourceReferences:[],status:"active",...e}));
const get=(id:string)=>all.find(e=>e.id===id)!;
test("every live catalogue exercise has one folder, a readable muscle name, a focus and atomic equipment",()=>{
 assert.equal(all.length,266);
 const counts=new Map<string,number>();
 for(const e of all){const t=exerciseTaxonomy(e);assert.ok([...MUSCLE_FOLDERS,"חימום"].includes(t.folder));assert.ok(t.focus);assert.match(t.name,/ — /);assert.doesNotMatch(t.name,/לשון צונחת|\|/);assert.ok(t.equipment.length);assert.equal(new Set(t.equipment).size,t.equipment.length);for(const tag of t.equipment)assert.doesNotMatch(tag,/ ו-| או /);counts.set(t.folder,(counts.get(t.folder)??0)+1);}
 assert.equal([...counts.values()].reduce((a,b)=>a+b),266);
});
test("abdomen is a folder, hip abduction is glute emphasis under legs, shoulder heads are distinct",()=>{
 assert.equal(exerciseTaxonomy(get("exercise-p2ohuv")).folder,"בטן");
 assert.equal(exerciseTaxonomy(get("resistance-standing-hip-abduction-machine")).folder,"רגליים");
 assert.equal(exerciseTaxonomy(get("resistance-standing-hip-abduction-machine")).focus,"ישבן צידי");
 assert.match(exerciseTaxonomy(get("resistance-band-standing-waist-twist")).name,/בטן צידית/);
 assert.match(exerciseTaxonomy(get("exercise-mx59uy")).focus,/אמצעית/);
 assert.match(exerciseTaxonomy(get("resistance-cable-forward-raise")).focus,/קדמית/);
 assert.match(exerciseTaxonomy(get("exercise-yjtm56")).focus,/אחורית/);
});
test("known source classification errors do not leak into navigation",()=>{
 assert.equal(exerciseTaxonomy(get("bodyweight-floor-hyperextension")).folder,"גב");
 assert.equal(exerciseTaxonomy(get("resistance-machine-shoulder-press")).folder,"כתפיים");
 assert.equal(exerciseTaxonomy(get("resistance-hang-clean")).folder,"רגליים");
});
test("compound equipment is split and home filter never claims machines or a pulley are household gear",()=>{
 assert.deepEqual(equipmentTags(get("resistance-dumbbell-straight-arm-pullover-stability-ball")),["משקולות יד","כדור פיזיו"]);
 assert.equal(exerciseTaxonomy(get("resistance-band-standing-waist-twist")).home,true);
 assert.equal(exerciseTaxonomy(get("resistance-standing-hip-abduction-machine")).home,false);
 assert.equal(exerciseTaxonomy(get("resistance-cable-shoulder-press")).home,false);
 assert.ok(equipmentTags(get("exercise-139gtlw")).includes("ספסל"));
});
test("presentation preserves ids, equipment and swap taxonomy, media and source aliases",()=>{
 for(const e of all){const decorated=presentExercise(e);assert.equal(decorated.id,e.id);assert.equal(decorated.equipment,e.equipment);assert.equal(decorated.primaryMuscleGroup,e.primaryMuscleGroup);assert.equal(decorated.video,e.video);assert.equal(decorated.imageUrl,e.imageUrl);assert.ok(decorated.aliases.includes(e.name));assert.equal(presentExercise(decorated).name,decorated.name);}
 assert.equal(queryExercises(all,{search:"אופניים"}).some(e=>e.id==="exercise-p2ohuv"),true);
 assert.equal(queryExercises(all,{search:"בטן צידית"}).some(e=>e.id==="resistance-band-standing-waist-twist"),true);
});
test("directory initially shows folders, retains loading/errors and renders emphasis separately",async()=>{
 const ui=await readFile(new URL("../components/workouts/coach/ExerciseDirectory.tsx",import.meta.url),"utf8");
 assert.match(ui,/!browsing/);assert.match(ui,/MUSCLE_FOLDERS\.map/);assert.match(ui,/דגש: \{t.focus\}/);assert.match(ui,/MuscleIllustration/);assert.match(ui,/if\(loading\)/);assert.match(ui,/if\(persistenceError\)/);
});

test("exercise taxonomy keeps broad categories separate from precise equipment",()=>{
 assert.equal(categorizeExercise({id:"free-weight",name:"לחיצת חזה",category:"משקולות ומכונות",equipment:"משקולות יד"}),"משקולות");
 assert.equal(categorizeExercise({id:"cable",name:"חתירה",category:"משקולות ומכונות",equipment:"כבל"}),"מכונות");
 assert.equal(categorizeExercise({id:"bodyweight",name:"פלאנק",category:"ליבה",equipment:"משקל גוף"}),"משקל גוף");
 assert.equal(categorizeExercise({id:"suspension",name:"חתירה ברצועות תלייה",category:"כוח",equipment:"רצועות תלייה"}),"TRX");
});
test("exercise taxonomy normalizes legacy equipment and muscle labels",()=>{
 assert.equal(canonicalizeEquipment({id:"cable",name:"חתירה",equipment:"פולי"}),"כבל פולי");
 assert.equal(canonicalizeEquipment({id:"exercise-yt2erg",name:"קיק בק במשקולת בודדת"}),"משקולות יד");
 assert.equal(canonicalizeMuscle("ליבה"),"שרירי ליבה");
});
