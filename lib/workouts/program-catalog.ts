import type { WorkoutProgram, WorkoutExercise } from "./types.ts";
import type { TraineeLevel } from "./trainee-level.ts";

export type Focus = "balanced" | "glutes" | "back";
export type Split = "FBW" | "A-B" | "PPL";
export type ProgramDefinition = { id: string; name: string; sex: "male" | "female" | "all"; focus: Focus; split: Split; trx: boolean; homeEquipment?: "bodyweight_station" | "dumbbells" | "dumbbells_bench"; level?: TraineeLevel; frequency: number };
const levels: TraineeLevel[] = ["beginner", "intermediate", "advanced"];
const male = ["מתאמן מתחיל", "מתאמן בינוני", "מתאמן מתקדם"];
const female = ["מתאמנת מתחילה", "מתאמנת בינונית", "מתאמנת מתקדמת"];
const focusLabel = (focus: Focus) => focus === "glutes" ? " דגש לישבן" : focus === "back" ? " דגש לגב" : "";
const baseDefinitions: ProgramDefinition[] = [
  ...([['male', 'balanced'], ['female', 'balanced'], ['female', 'glutes'], ['female', 'back']] as const).map(([sex, focus]) => ({
    id: `lifefit-trx-${sex}-${focus}`, name: `אימון TRX FBW ל${sex === "male" ? "גברים" : "נשים"}${focusLabel(focus)}`,
    sex, focus, split: "FBW" as const, trx: true, frequency: 3,
  })),
  ...levels.map((level, i) => ({id: `lifefit-ppl-male-${level}`, name: `אימון Push Pull Legs משקולות ומכונות ${male[i]}`, sex: "male" as const, focus: "balanced" as const, split: "PPL" as const, trx: false, level, frequency: i === 0 ? 3 : i === 1 ? 4 : 6})),
  ...(["glutes", "back"] as const).map(focus => ({id: `lifefit-fbw-female-${focus}`, name: `אימון FBW לנשים${focusLabel(focus)}`, sex: "female" as const, focus, split: "FBW" as const, trx: false, frequency: 3})),
  ...(["PPL", "A-B"] as const).flatMap(split => (["glutes", "back"] as const).flatMap(focus => levels.map((level, i) => ({
    id: `lifefit-${split.toLowerCase()}-female-${focus}-${level}`, name: `אימון נשים ${split === "PPL" ? "Push Pull Legs" : split}${focusLabel(focus)} משקולות ומכונות ${female[i]}`,
    sex: "female" as const, focus, split, trx: false, level, frequency: split === "A-B" ? (i === 0 ? 2 : 4) : (i === 0 ? 3 : i === 1 ? 4 : 6),
  })))),
  ...levels.map((level, i) => ({id:`lifefit-fbw-male-balanced-${level}`,name:`אימון FBW לגברים משקולות ומכונות ${male[i]}`,sex:"male" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,level,frequency:3})),
  ...levels.map((level,i)=>({id:`lifefit-fbw-female-balanced-${level}`,name:`אימון FBW לנשים מאוזן משקולות ומכונות ${female[i]}`,sex:"female" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,level,frequency:3})),
  ...levels.map((level,i)=>({id:`lifefit-a-b-male-balanced-${level}`,name:`אימון A-B לגברים משקולות ומכונות ${male[i]}`,sex:"male" as const,focus:"balanced" as const,split:"A-B" as const,trx:false,level,frequency:i===0?2:4})),
  ...levels.slice(1).map((level,i)=>({id:`lifefit-home-bodyweight-${level}`,name:`אימון FBW משקל גוף ${["בינוני","מתקדם"][i]} — מתח ומתקן חתירה`,sex:"all" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,homeEquipment:"bodyweight_station" as const,level,frequency:3})),
  ...(["dumbbells","dumbbells_bench"] as const).flatMap(homeEquipment=>levels.map((level,i)=>({id:`lifefit-home-${homeEquipment}-${level}`,name:`אימון FBW ביתי ${homeEquipment==="dumbbells"?"משקולות יד בלבד":"משקולות יד וספסל"} — ${["מתחילים","בינוני","מתקדמים"][i]}`,sex:"all" as const,focus:"balanced" as const,split:"FBW" as const,trx:false,homeEquipment,level,frequency:3}))),
];
export const PROGRAM_DEFINITIONS = baseDefinitions.map(def=>({...def,id:`${def.id}-v2`}));

// IDs reference the existing, video-backed exercise catalogue. No fabricated media.
export const MOVEMENTS = {
  squat: ["exercise-mhdxgx", "exercise-1w08fkm", "exercise-1fdd4gb"],
  hinge: ["resistance-dumbbell-stiff-legged-deadlift-copy", "resistance-dumbbell-stiff-legged-deadlift-copy", "resistance-bellbar-stiff-legged-deadlift"],
  chest: ["resistance-seated-machine-chest-press", "exercise-ptjiss", "exercise-rr4mtu"],
  incline: ["exercise-139gtlw", "exercise-139gtlw", "exercise-139gtlw"],
  row: ["resistance-lever-lying-t-bar-row", "exercise-1u5j1lv", "resistance-lever-lying-t-bar-row"],
  // A seniority label does not establish ten controlled pull-ups. Adjustable
  // pulldown load remains the default; pull-ups require an individual choice.
  vertical: ["exercise-1ly3xqh", "exercise-1ly3xqh", "exercise-1ly3xqh"],
  shoulder: ["exercise-14tz34b", "exercise-14tz34b", "exercise-14tz34b"],
  lateral: ["exercise-mx59uy", "exercise-mx59uy", "exercise-mx59uy"],
  rear: ["resistance-lever-seated-reverse-flys", "exercise-yjtm56", "exercise-yjtm56"],
  curl: ["exercise-vba4vh", "exercise-f2juxe", "exercise-1nk9ffl"],
  triceps: ["exercise-yspcn", "exercise-yspcn", "exercise-cw8lzv"],
  hip: ["resistance-barbell-hip-thrust", "resistance-barbell-hip-thrust", "resistance-barbell-hip-thrust"],
  abduction: ["resistance-sitting-hip-abduction-machine", "exercise-1oc1t8h", "exercise-1oc1t8h"],
  lunge: ["resistance-lunges-with-dumbells", "resistance-lunges-with-dumbells", "resistance-lunges-with-dumbells"],
  legcurl: ["exercise-1mo876e", "exercise-1mo876e", "exercise-1lrrpsj"],
  legextension: ["exercise-igalw2", "exercise-igalw2", "exercise-igalw2"],
  calf: ["resistance-standing-calf-raise-smith-machine", "resistance-standing-calf-raise-smith-machine", "resistance-standing-calf-raise-smith-machine"],
  abs: ["exercise-pn4ire", "resistance-cable-kneeling-crunch", "resistance-cable-kneeling-crunch"],
  plank: ["bodyweight-front-plank", "bodyweight-front-plank", "bodyweight-front-plank"],
} satisfies Record<string, string[]>;
export type Movement = keyof typeof MOVEMENTS;
export const HOME_MOVEMENTS: Record<NonNullable<ProgramDefinition["homeEquipment"]>, Partial<Record<Movement,string>>> = {
  dumbbells:{squat:"exercise-1w08fkm",hinge:"resistance-dumbbell-stiff-legged-deadlift-copy",lunge:"resistance-lunges-with-dumbells",chest:"exercise-hdg3yz",row:"resistance-dumbbell-bent-over-row",lateral:"exercise-mx59uy",rear:"exercise-1fr384u",curl:"exercise-vba4vh",triceps:"resistance-dumbbell-kickback",calf:"resistance-plantar-flexion-dumbbell",abs:"exercise-pn4ire",plank:"bodyweight-front-plank"},
  dumbbells_bench:{squat:"exercise-1w08fkm",hinge:"resistance-dumbbell-stiff-legged-deadlift-copy",lunge:"resistance-lunges-with-dumbells",chest:"resistance-dumbell-bench-press",row:"resistance-dumbbell-one-arm-bent-over-row",lateral:"exercise-mx59uy",rear:"exercise-1fr384u",curl:"exercise-vba4vh",triceps:"resistance-dumbbell-kickback",calf:"resistance-plantar-flexion-dumbbell",abs:"exercise-pn4ire",plank:"bodyweight-front-plank"},
  bodyweight_station:{squat:"exercise-n1izh5",lunge:"exercise-2ez0zf",legcurl:"bodyweight-sliding-leg-curl",chest:"exercise-hdg3yz",row:"bodyweight-inverted-row",vertical:"exercise-say88l",shoulder:"exercise-1rpyv0f",curl:"exercise-1fo5t9c",triceps:"bodyweight-kneeling-arm-extension",abs:"exercise-pn4ire",plank:"bodyweight-front-plank"},
};
const trx: Partial<Record<Movement, string>> = {squat: "resistance-suspenders-squat", hinge: "resistance-suspended-hip-thrust", hip: "resistance-suspended-hip-thrust", lunge: "resistance-straps-aided-lunges", chest: "resistance-suspender-chest-press", row: "resistance-suspended-row", rear: "resistance-suspender-reverse-flys", shoulder: "resistance-suspender-forward-y-raise", curl: "resistance-suspender-arm-curl", triceps: "resistance-suspender-arm-extension", abs: "exercise-pn4ire", plank: "bodyweight-front-plank"};
const compound=new Set<Movement>(["squat","hinge","hip","lunge","chest","incline","row","vertical","shoulder"]);
export type TrainingGoal="general"|"hypertrophy"|"strength";
export type ProgramOptions={frequency?:number;minutes?:number;goal?:TrainingGoal;regressPushups?:boolean};
export const DESIGN_REVISION="professional-v2";
const regions:Record<Movement,string[]>={squat:["legs","glutes"],hinge:["legs","glutes"],hip:["glutes"],lunge:["legs","glutes"],chest:["chest"],incline:["chest"],row:["back"],vertical:["back"],shoulder:["shoulders"],lateral:["shoulders"],rear:["shoulders"],curl:["biceps"],triceps:["triceps"],abduction:["glutes"],legcurl:["legs"],legextension:["legs"],calf:["calves"],abs:["core"],plank:["core"]};
/** Highest dose in any rotating calendar week, not a misleading cycle average. */
export function weeklyWorkingSets(program:WorkoutProgram):Record<string,number>{
 const maximum:Record<string,number>={};if(!program.days.length)return maximum;
 for(let offset=0;offset<program.days.length;offset++){
  const total:Record<string,number>={};
  for(let session=0;session<(program.trainingFrequency??program.days.length);session++)for(const e of program.days[(offset+session)%program.days.length].exercises){
   if(!e.movementPattern)continue;
   for(const region of regions[e.movementPattern as Movement]??[])total[region]=(total[region]??0)+Number(e.sets);
  }
  for(const region of Object.keys(total))maximum[region]=Math.max(maximum[region]??0,total[region]);
 }
 return maximum;
}
/** Planning estimate, not a promise: ten minutes preparation, bilateral time, working recovery and transitions. */
export function estimatedDayMinutes(day:WorkoutProgram["days"][number]):number{let seconds=600;for(const e of day.exercises){if(e.exerciseId==="exercise-155pu7s")continue;const sets=Number(e.sets)||1,reps=Number.parseInt(e.reps??"10");const work=e.reps?.includes("שניות")?reps:reps*3*(e.sides??1);seconds+=sets*work+Math.max(0,sets-1)*Number.parseInt(e.rest??"90")+60;}return Math.ceil(seconds/60);}
const progression="יעד החזרות נשאר קבוע. אחרי שתי חשיפות מוצלחות בכל הסטים בטכניקה יציבה וברזרבת המאמץ שנקבעה, מוסיפים את תוספת העומס הקטנה הזמינה. אם הקפיצה גדולה מדי נשארים במשקל. אם היעד לא הושלם מפחיתים עומס ב־5–10% או בוחרים וריאציה קלה יותר; לא מוסיפים חזרות אוטומטית. כאב אינו מאמץ: מפסיקים ופונים למאמן. ירידה בביצוע בשתי חשיפות או עייפות מתמשכת מצריכות שבוע הקלה: פחות סטים ורזרבה של 4 חזרות, ואחריו הערכה מחדש.";
export function buildProgram(def:ProgramDefinition,level:TraineeLevel=def.level??"beginner",options:ProgramOptions={}):WorkoutProgram{
 const index=levels.indexOf(level),frequency=options.frequency??def.frequency,goal=options.goal??"general";let days:[string,Movement[]][];
 if(def.homeEquipment==="bodyweight_station")days=[["FBW A",["row","squat","chest","legcurl","shoulder","curl","abs"]],["FBW B",["vertical","lunge","chest","legcurl","shoulder","triceps","plank"]]];
 else if(def.homeEquipment)days=[["FBW A",["row","squat","chest","hinge","lateral","curl","abs"]],["FBW B",["row","lunge","chest","hinge","rear","triceps","plank"]]];
 else if(def.trx){days=[["FBW A",["squat","row","chest","hinge","shoulder","curl","abs"]],["FBW B",["lunge","row","chest","hip","rear","triceps","plank"]]];if(def.focus==="glutes")days=days.map(([name,moves])=>[name,["hip",...moves.filter(m=>m!=="hip"&&m!=="hinge")]]);if(def.focus==="back")days=days.map(([name,moves])=>[name,["row",...moves.filter(m=>m!=="row")]]);}
 else if(def.split==="A-B"){const upper:Movement[]=def.focus==="back"?["row","vertical","chest","shoulder","curl","triceps","abs"]:["chest","row","vertical","shoulder","curl","triceps","abs"];const lower:Movement[]=def.focus==="glutes"?["hip","squat","hinge","legcurl","abduction","calf","plank"]:["squat","hinge","lunge","legcurl","calf","plank"];days=[["A — פלג גוף עליון",upper],["B — רגליים וישבן",lower]];}
 else if(def.split==="FBW"){if(def.focus==="glutes")days=[["FBW A",["hip","chest","row","squat","lateral","curl","abs"]],["FBW B",["lunge","incline","vertical","legcurl","shoulder","abduction","triceps","plank"]]];else if(def.focus==="back")days=[["FBW A",["row","squat","chest","hinge","vertical","lateral","curl","abs"]],["FBW B",["vertical","lunge","incline","legcurl","row","shoulder","triceps","plank"]]];else days=[["FBW A",["squat","chest","row","hinge","lateral","curl","abs"]],["FBW B",["lunge","incline","vertical","legcurl","shoulder","triceps","plank"]]];}
 else days=[["Push — חזה, כתפיים ויד אחורית",["chest","incline","shoulder","lateral","triceps","abs"]],["Pull — גב ויד קדמית",["vertical","row","rear","curl","plank"]],["Legs — רגליים וישבן",def.focus==="glutes"?["hip","squat","hinge","legcurl","abduction","calf","abs"]:["squat","hinge","legcurl","legextension","calf","abs"]]];
 // Remove redundant leg compounds before reducing a novice split to token sets.
 if(index===0&&def.focus==="glutes"&&def.split!=="FBW")days=days.map(([name,moves])=>[name,moves.filter(m=>m!=="hinge")]);
 if(index===0&&def.split==="A-B"&&def.focus!=="glutes")days=days.map(([name,moves])=>[name,moves.filter(m=>m!=="lunge")]);
 const equipment=def.homeEquipment==="bodyweight_station"?["משקל גוף","מתח / מתקן חתירה","מגבת"]:def.homeEquipment?["משקולות יד","משקל גוף",...(def.homeEquipment==="dumbbells_bench"?["ספסל"]:[])]:def.trx?["TRX","משקל גוף"]:["משקולות","מכונות","כבל פולי"];
 const schedule=def.split==="FBW"?"2–3 אימונים בשבוע עם יום ללא אימון כוח ביניהם; A/B מתחלפים גם בין שבועות.":def.split==="A-B"?"A עליון ו־B תחתון. בארבעה אימונים: A/B/מנוחה/A/B/מנוחה/מנוחה. בשניים מפרידים ביום מנוחה; בשלושה ממשיכים A/B בין שבועות.":"בשלושה: Push/מנוחה/Pull/מנוחה/Legs. בארבעה או חמישה ממשיכים ברצף בין שבועות. בשישה: Push/Pull/Legs/Push/Pull/Legs/מנוחה. אין להוסיף גב או ישבן ל־Push.";
 const homeNotes=def.homeEquipment==="bodyweight_station"?"נדרשים מתח ומתקן חתירה יציבים ומגבת על משטח מתאים, לא רהיט מאולתר; יכולת המשיכה והכתפיים נבדקת לפני שיוך.":def.homeEquipment==="dumbbells_bench"?"ספסל אימון שטוח ויציב, ללא צורך בכוונון.":def.homeEquipment==="dumbbells"?"ללא ספסל: אם שכיבות סמיכה ברצפה אינן מתאימות, בוחרים גרסת קיר מאושרת.":"";
 let program:WorkoutProgram={id:def.id,name:def.name,description:`גרסה מקצועית 2. ${frequency} אימונים בשבוע. מטרה: ${goal==="strength"?"כוח":goal==="hypertrophy"?"בניית שריר":"כושר וכוח כלליים"}. ${schedule} ${progression} במשקל גוף וברצועות משנים וריאציה או מנוף מאושרים כדי לעמוד ביעד וברזרבת המאמץ, ולא לפי שם הרמה בלבד; מתעדים את הווריאציה. ${homeNotes}`,programType:def.split==="PPL"?"Push Pull Legs":def.split,difficulty:["מתחילים","בינוני","מתקדמים"][index],trainingFrequency:frequency,equipment,sourceWorkbook:"LIFE FIT — מקצועי v2",status:"active",official:true,days:days.map(([name,moves],order)=>{
 const id=`${def.id}-day-${order}`;return{id,name,order,exercises:[{id:`${id}-warmup`,exerciseId:"exercise-155pu7s",order:0,notes:"חימום כללי קל 3–5 דקות וסטי הכנה קצרים לתנועות העמוסות הראשונות. הכנה אינה אימון: לא להתקרב לכשל. ההכנה כלולה בהערכת הזמן."},...moves.map((m,position):WorkoutExercise=>{
 const emphasis=(def.focus==="back"&&["row","vertical"].includes(m))||(def.focus==="glutes"&&["hip","abduction"].includes(m)),isCompound=compound.has(m),timed=m==="plank";
 const strengthLift=goal==="strength"&&index>0&&!def.trx&&def.homeEquipment!=="bodyweight_station"&&!(def.homeEquipment==="dumbbells"&&m==="chest");
 const reps=timed?`${[20,25,30][index]} שניות`:String(["calf","abduction","lateral","rear"].includes(m)?12:isCompound?(strengthLift?6:10):12);const rir=index===0?3:2;
 let exerciseId=def.homeEquipment?HOME_MOVEMENTS[def.homeEquipment][m]!:def.trx?trx[m]!:MOVEMENTS[m][index],variation="";
 if(def.homeEquipment==="bodyweight_station"&&m==="squat"&&index===2){exerciseId="exercise-2ez0zf";variation="מכרע דינמי במשקל גוף לכל רגל במקום סקוואט דו־רגלי קל, רק לאחר שליטה בגרסה הבסיסית; ללא החזקה סטטית.";}
 if(def.homeEquipment==="dumbbells"&&m==="chest"&&(index===0||options.regressPushups)){exerciseId="bodyweight-wall-pushup";variation="גרסת קיר: להתאים מרחק מהקיר ליעד ולרזרבת המאמץ. לא לבצע גרסת רצפה בלי שליטה.";}
 if(def.trx&&["squat","lunge","hip","hinge"].includes(m))variation="התקדמות רגליים באמצעות פחות סיוע או מנוף מאושר, לא שינוי זווית שרירותי. אם אין עומס מספק מבקשים וריאציה מאושרת מהמאמן.";
 const sides=m==="lunge"||(def.homeEquipment==="bodyweight_station"&&m==="squat"&&index===2)||(def.homeEquipment==="dumbbells_bench"&&m==="row")?2:1;
 const sets=timed?2:index===0?(emphasis&&m==="row"?3:2):isCompound?(emphasis&&index===2?4:3):(goal==="hypertrophy"?3:2),rest=timed?60:isCompound?(strengthLift?180:index===0?90:150):90;
 const note=timed?"יעד זמן לכל סט. מסיימים לפני אובדן מנח האגן או הגב. אחרי שתי חשיפות קלות אפשר להוסיף 5 שניות עד 40 שניות; מעבר לכך שינוי וריאציה רק עם מאמן.":`להשאיר ${rir} חזרות במיכל. כל הסטים באותה טכניקה וטווח תנועה; אין צורך בכשל.`;
 const entryId=`${id}-ex-${position}`;return{id:entryId,exerciseId,order:position+1,movementPattern:m,sides,sets:String(sets),reps,rest:`${rest} שניות`,effort:timed?undefined:String(10-rir),notes:`${note} ${sides===2?"היעד לכל צד בנפרד; זמן שני הצדדים כלול בתכנון.":""} ${m==="hinge"?"כיפוף קל בברכיים, תנועת אגן לאחור וגב ניטרלי; לעצור את הירידה לפני שינוי מנח הגב, ללא נעילת ברכיים.":m==="hip"?"לסיים בפשיטת ירך בלי קשת בגב התחתון.":m==="row"?"גו יציב ללא תנופה; בגרסת ספסל לשמור את התמיכה.":""} ${variation} ${def.trx?"לוודא עיגון תקין; בדחיפה ומשיכה לשנות זווית בהדרגה ולתעד אותה.":""}`,setPrescriptions:Array.from({length:sets},(_,n)=>({id:`${entryId}-set-${n}`,order:n,repetitions:reps}))};})]};})};
 // Conservative product starting-dose ceilings, not universal physiological limits.
 const cap=index===0?12:18;const capFor=(region:string)=>["biceps","triceps","core","calves"].includes(region)?8:cap;
 for(let i=0;i<100;i++){const volume=weeklyWorkingSets(program),over=Object.keys(volume).filter(r=>volume[r]>capFor(r));if(!over.length)break;const candidates=program.days.flatMap(d=>d.exercises).filter(e=>e.movementPattern&&regions[e.movementPattern as Movement].some(r=>over.includes(r))&&Number(e.sets)>(compound.has(e.movementPattern as Movement)?2:1));const candidate=candidates.sort((a,b)=>Number(b.sets)-Number(a.sets)||b.order-a.order)[0];if(!candidate)break;program=changeSets(program,candidate.id,Number(candidate.sets)-1);}
 if(options.minutes)for(const day of program.days)for(let i=0;i<50&&estimatedDayMinutes(program.days.find(d=>d.id===day.id)!)>options.minutes;i++){const current=program.days.find(d=>d.id===day.id)!;const candidates=current.exercises.filter(e=>e.movementPattern&&Number(e.sets)>(compound.has(e.movementPattern as Movement)?2:1)).sort((a,b)=>Number(compound.has(a.movementPattern as Movement))-Number(compound.has(b.movementPattern as Movement))||b.order-a.order);if(!candidates.length)break;program=changeSets(program,candidates[0].id,Number(candidates[0].sets)-1);}
 const estimates=program.days.map(d=>`${d.name}: כ־${estimatedDayMinutes(d)} דקות`).join("; ");return{...program,description:`${program.description} הערכת זמן כולל הכנה ומעברים: ${estimates}. זו הערכה; אם צריך יותר מנוחה לא מקצרים אותה כדי לעמוד בזמן.`};
}
function changeSets(program:WorkoutProgram,entryId:string,count:number):WorkoutProgram{return{...program,days:program.days.map(d=>({...d,exercises:d.exercises.map(e=>e.id!==entryId?e:{...e,sets:String(count),setPrescriptions:Array.from({length:count},(_,n)=>({id:`${e.id}-set-${n}`,order:n,repetitions:e.reps}))})}))};}
export const BUILT_IN_PROGRAMS=PROGRAM_DEFINITIONS.map(def=>buildProgram(def));
