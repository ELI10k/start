import { buildProgram, estimatedDayMinutes, PROGRAM_DEFINITIONS, MOVEMENTS, HOME_MOVEMENTS, type Focus, type ProgramDefinition, type TrainingGoal } from "./program-catalog.ts";
import { isTraineeLevel, type TraineeLevel } from "./trainee-level.ts";
import type { Exercise, WorkoutPreferences, WorkoutProgram } from "./types.ts";

export type TrainingIntake = {
  sex?: string; traineeLevel?: string; weeklyWorkouts?: number; trainingLocation?: string;
  equipment?: string; trainingFocus?: string; trainingSplit?: string; sessionMinutes?: number;
  medicalNotes?: string; medicalReview?: string; experienceMonths?: number; technique?: string;
  trainingGoal?:TrainingGoal; bodyweightCapacity?:string;
};
export function intakeFromForm(form: FormData): TrainingIntake {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const number = (key: string) => get(key) ? Number(get(key)) : undefined;
  return {sex: get("sex"), traineeLevel: get("traineeLevel"), weeklyWorkouts: number("weeklyWorkouts"), trainingLocation: get("trainingLocation"), equipment: get("equipment"), trainingFocus: get("trainingFocus"), trainingSplit: get("trainingSplit"), sessionMinutes: number("sessionMinutes"), medicalNotes: get("medicalNotes"), medicalReview: get("medicalReview"), experienceMonths: number("experienceMonths"), technique: get("technique"),trainingGoal:(get("trainingGoal")||"general") as TrainingGoal,bodyweightCapacity:get("bodyweightCapacity")};
}
export function trainingPreferences(input: TrainingIntake) {
  return {training_location: input.trainingLocation ?? "", equipment: input.equipment ?? "", training_focus: input.trainingFocus ?? "", training_split: input.trainingSplit ?? "", session_minutes: input.sessionMinutes ?? null, medical_notes: input.medicalNotes ?? "", medical_review: input.medicalReview ?? "", experience_months: input.experienceMonths ?? null, technique: input.technique ?? "",training_goal:input.trainingGoal??"general",bodyweight_capacity:input.bodyweightCapacity??""};
}
export function assessedLevel(input: TrainingIntake): TraineeLevel | undefined {
  if (!isTraineeLevel(input.traineeLevel)) return undefined;
  if (input.technique === "learning" || (input.experienceMonths !== undefined && input.experienceMonths < 6)) return "beginner";
  if (input.traineeLevel === "advanced" && (input.technique !== "stable" || input.experienceMonths === undefined || input.experienceMonths < 24)) return "intermediate";
  return input.traineeLevel;
}
export type TrainingRecommendation = {status: "ready" | "review" | "missing"; message: string; programId?: string; definition?: ProgramDefinition; level?: TraineeLevel; frequency?: number; goal?:TrainingGoal; regressPushups?:boolean; estimatedMinutes?:number};
export function recommendTraining(input: TrainingIntake): TrainingRecommendation {
  if (input.medicalReview === "yes" || input.medicalNotes?.trim()) return {status: "review", message: "הנתונים הרפואיים דורשים בדיקת מאמן לפני הפעלת תוכנית."};
  const level = assessedLevel(input), frequency = input.weeklyWorkouts;
  if(input.trainingGoal&&!(["general","hypertrophy","strength"] as string[]).includes(input.trainingGoal))return{status:"missing",message:"יש לבחור מטרת אימון תקינה."};
if (!level || !["male", "female"].includes(input.sex ?? "") || !frequency || !Number.isInteger(frequency) || frequency < 2 || frequency > 6 || !["gym", "home"].includes(input.trainingLocation ?? "") || !["gym", "trx", "bodyweight", "bodyweight_station", "dumbbells", "dumbbells_bench"].includes(input.equipment ?? "") || !["balanced", "glutes", "back"].includes(input.trainingFocus ?? "") || !["auto", "FBW", "A-B", "PPL"].includes(input.trainingSplit ?? "") || !input.sessionMinutes || input.sessionMinutes < 30 || input.sessionMinutes > 120 || input.medicalReview !== "no" || input.experienceMonths === undefined || !Number.isFinite(input.experienceMonths) || input.experienceMonths < 0 || !["learning", "stable"].includes(input.technique ?? "")) return {status: "missing", message: "להתאמה אוטומטית יש להשלים רמה, ניסיון, טכניקה, מין, 2–6 אימונים בשבוע, מיקום, ציוד, דגש, פיצול, זמן ושאלת מגבלות רפואיות."};
  if (input.equipment === "bodyweight") return {status: "review", message: "לכיסוי הגב בתוכניות משקל גוף נדרש מתח ומתקן חתירה יציב. ללא מתקן יש לפנות למאמן להתאמה."};
  if (input.equipment === "gym" && input.trainingLocation !== "gym") return {status: "review", message: "תוכנית משקולות ומכונות דורשת גישה לחדר כושר; יש לעדכן ציוד או לבחור עם המאמן."};
  const focus = input.trainingFocus as Focus;
  if(input.trainingGoal==="strength"&&["trx","bodyweight","bodyweight_station"].includes(input.equipment!))return{status:"review",message:"מטרת כוח עם רצועות או משקל גוף דורשת בחירת וריאציות ועומס על ידי המאמן; אין המרה אוטומטית לחזרות מעטות בלבד."};
  const homeEquipment=["bodyweight_station","dumbbells","dumbbells_bench"].includes(input.equipment??"") ? input.equipment as NonNullable<ProgramDefinition["homeEquipment"]> : undefined;
  if (input.sex === "male" && focus !== "balanced") return {status: "review", message: "דגש ישבן או גב לגברים דורש התאמה של המאמן במאגר הנוכחי."};
  let split = input.trainingSplit === "auto" ? (level === "beginner" || frequency <= 3 ? "FBW" : frequency === 4 ? "A-B" : "PPL") : input.trainingSplit;
  if (input.equipment === "trx") split = "FBW";
  if (homeEquipment) {
    if (focus !== "balanced" || !["auto","FBW"].includes(input.trainingSplit!)) return {status:"review",message:"התוכניות הביתיות הנוספות הן FBW מאוזן; דגש או פיצול אחר דורשים התאמת מאמן."};
    split="FBW";
    if (homeEquipment === "bodyweight_station" && level === "beginner") return {status:"review",message:"תוכנית משקל גוף למתחילים קיימת במאגר; המאמן יוודא התאמה של תרגילי המשיכה והמתקן לפני השיוך."};
    if(homeEquipment==="bodyweight_station"&&input.bodyweightCapacity!=="verified")return{status:"review",message:"לפני שיוך משקל גוף נדרשת בדיקת יכולת: 10 שכיבות סמיכה, 10 חתירות, 10 לחיצות כתף ברצפה ו־10 מתח בשליטה עם שתי חזרות ברזרבה; אחרת המאמן בוחר רגרסיות מתאימות."};
  }
  if (split === "PPL" && frequency < 3) return {status: "review", message: "PPL דורש לפחות שלושה אימונים בשבוע. מומלץ לבחור FBW או A-B."};
  if (split === "FBW" && frequency > 3) return {status: "review", message: "בתוכניות FBW יש לבחור 2–3 אימונים בשבוע עם יום התאוששות ביניהם."};
  if (split === "A-B" && frequency > 4) return {status: "review", message: "בתוכניות A-B במאגר יש לבחור 2–4 אימונים בשבוע."};
  if (input.sessionMinutes < 45 && split === "PPL") return {status: "review", message: "לתוכנית PPL נדרשות לפחות 45 דקות לאימון, או קיצור אישי על ידי המאמן."};
  const def = PROGRAM_DEFINITIONS.find(d => (d.sex === input.sex || d.sex === "all") && d.homeEquipment === homeEquipment && d.trx === (input.equipment === "trx") && d.focus === focus && d.split === split && (!d.level || d.level === level));
  if (!def) return {status: "review", message: "אין תבנית המתאימה לכל התשובות; נדרשת בחירת מאמן."};
  const goal=input.trainingGoal??"general",regressPushups=input.equipment==="dumbbells"&&input.bodyweightCapacity!=="verified";
  const planned=buildProgram(def,level,{frequency,goal,minutes:input.sessionMinutes,regressPushups});
  const estimate=Math.max(...planned.days.map(estimatedDayMinutes));
  if(estimate>input.sessionMinutes!)return{status:"review",message:`התוכנית אינה נכנסת בבטחה בזמן שנבחר: נדרשות בהערכה לפחות ${estimate} דקות, או גרסה מקוצרת שנבנתה עם המאמן. לא מקצרים מנוחות ולא מסתירים תרגילים כדי להבטיח זמן לא מציאותי.`};
  return {status: "ready", definition: def, programId:def.id, level, frequency,goal,regressPushups,estimatedMinutes:estimate,message:`${def.name} · ${frequency} אימונים בשבוע · עד כ־${estimate} דקות בהערכה${level !== input.traineeLevel ? " · רמה הותאמה לניסיון ולטכניקה" : ""}`};
}

export function personalizeProgram(template: WorkoutProgram, recommendation: TrainingRecommendation, minutes: number): WorkoutProgram {
  if(template.id!==recommendation.programId)throw new Error("Recommendation and template do not match");
  if(recommendation.status!=="ready"||!recommendation.definition)throw new Error("Professional intake requires a ready reviewed definition");
  const program=buildProgram(recommendation.definition,recommendation.level,{frequency:recommendation.frequency,goal:recommendation.goal,minutes,regressPushups:recommendation.regressPushups});
  if(program.days.some(d=>estimatedDayMinutes(d)>minutes))throw new Error("Professional programme exceeds the available session time");
  return {...program,description:`${minutes} דקות זמינות לפי האפיון. ${program.description}`};
}

const patterns: Record<string, string> = {};
patterns["bodyweight-wall-pushup"]="chest";
for (const [movement, ids] of Object.entries(MOVEMENTS)) for (const id of ids) patterns[id] = movement;
for (const movements of Object.values(HOME_MOVEMENTS)) for (const [movement,id] of Object.entries(movements)) patterns[id] = movement;
Object.assign(patterns, {"resistance-suspenders-squat": "squat", "resistance-suspended-hip-thrust": "hip", "resistance-straps-aided-lunges": "lunge", "resistance-suspender-chest-press": "chest", "resistance-suspended-row": "row", "resistance-suspender-reverse-flys": "rear", "resistance-suspender-forward-y-raise": "shoulder", "resistance-suspender-arm-curl": "curl", "resistance-suspender-arm-extension": "triceps"});
export function movementPattern(exercise: Exercise) {
  if (patterns[exercise.id]) return patterns[exercise.id];
  const name = exercise.name;
  if (/פלאנק|plank/i.test(name)) return "plank";
  if (/חתיר/.test(name)) return "row";
  if (/פולי עליון.*(משיכ|רחב)|משיכ.*פולי|מתח/.test(name)) return "vertical";
  if (/פשיטת ירך|גשר|hip.thrust/i.test(name)) return "hip";
  if (/הרחקת ירך|הרחקת רגל.*לצד/.test(name)) return "abduction";
  if (/דדליפט|דד ליפט/.test(name)) return "hinge";
  if (/סקוואט|לחיצת רגל/.test(name)) return "squat";
  if (/מכרע|לאנג/.test(name)) return "lunge";
  if (/כפיפ.*(ברכ|רגל)/.test(name)) return "legcurl";
  if (/פשיט.*(ברכ|רגל)/.test(name)) return "legextension";
  if (/עקבים|תאומים/.test(name)) return "calf";
  if (/כפיפ.*מרפק|פטיש/.test(name)) return "curl";
  if (/פשיט.*מרפק|לחיצה צרפתית|קיק בק/.test(name)) return "triceps";
  if (/לחיצ.*חזה|שכיבות סמיכה/.test(name)) return "chest";
  if (/לחיצ.*כתפ/.test(name)) return "shoulder";
  if (/הרחק.*כתפ/.test(name)) return "lateral";
  if (/הרחקה אופקית|כתף אחורית|משיכה אל הפנים/.test(name)) return "rear";
  if (exercise.primaryMuscleGroup === "שרירי ליבה" || exercise.primaryMuscleGroup === "בטן") return "abs";
  return undefined;
}
export function alternativeExercises(prescribed: Exercise | undefined, catalogue: readonly Exercise[], preferences?: WorkoutPreferences): Exercise[] {
  if (!prescribed?.primaryMuscleGroup) return [];
  if(preferences?.requiresCoachReview)return [];
  const pattern = movementPattern(prescribed);
  const muscle = prescribed.primaryMuscleGroup === "בטן" ? "שרירי ליבה" : prescribed.primaryMuscleGroup;
  const unilateral=(e:Exercise)=>patterns[e.id]==="lunge"||e.id==="resistance-dumbbell-one-arm-bent-over-row"||e.id==="resistance-dumbbell-kickback"||/יד אחת|רגל אחת|one.arm/i.test(e.name);
  return catalogue.filter(item => {
    if (item.id === prescribed.id || item.status !== "active") return false;
    if(preferences){
      const level=preferences.traineeLevel??"beginner";
      const rank=level==="advanced"?2:level==="intermediate"?1:0;
      const difficulty=item.difficulty??"";
      const candidateRank=/מתקדמ|מתקדם/.test(difficulty)?2:/בינוני/.test(difficulty)?1:/מתחיל/.test(difficulty)?0:undefined;
      if(candidateRank!==undefined&&candidateRank>rank)return false;
      // Imported exercises do not always carry a difficulty value or an
      // explicit pattern id. If their name/group gives us a real movement
      // pattern, they are still safe to compare below (notably abdominal
      // exercises imported from the coach's original workbook).
      if(candidateRank===undefined&&!movementPattern(item))return false;
      const needsCapacity=item.id==="exercise-hdg3yz"||item.id==="exercise-say88l"||item.id==="exercise-1rpyv0f"||/מתח|שכיבות סמיכה/.test(item.name);
      if(needsCapacity&&item.id!=="bodyweight-wall-pushup"&&preferences.bodyweightCapacity!=="verified")return false;
    }
    if ((item.primaryMuscleGroup === "בטן" ? "שרירי ליבה" : item.primaryMuscleGroup) !== muscle) return false;
    // Timed and repetition prescriptions are not interchangeable.
    if (/פלאנק|plank/i.test(item.name) !== /פלאנק|plank/i.test(prescribed.name)) return false;
    if (pattern && movementPattern(item) !== pattern) return false;
    // Existing targets/side notes and the time budget survive a self-service
    // swap. A bilateral-to-unilateral change needs a coach to rewrite them.
    if(unilateral(item)!==unilateral(prescribed))return false;
    if (preferences?.trainingLocation === "home") {
      const available=preferences.equipment;
      if (available.includes("משקולות יד") && !available.some(e=>/מכונה|פולי|מוט/.test(e))) {
        const mode=available.includes("ספסל")?"dumbbells_bench":"dumbbells";
        const allowed=new Set(["bodyweight-wall-pushup",...Object.values(HOME_MOVEMENTS.dumbbells),...(mode==="dumbbells_bench"?Object.values(HOME_MOVEMENTS.dumbbells_bench):[])]);
        // Catalogue metadata often labels bench/ball exercises as dumbbells only.
        // Use verified home variants rather than guessing from that label.
        if (!allowed.has(item.id)) return false;
      }
      if (available.includes("מתח / מתקן חתירה") && !Object.values(HOME_MOVEMENTS.bodyweight_station).includes(item.id)) return false;
    }
    if (preferences?.trainingLocation === "home" && item.equipment && !/משקל גוף/.test(item.equipment)) {
      const available = preferences.equipment.join(" ");
      if (/רצועות תלייה/.test(item.equipment)) return /TRX|trx|רצועות|תלייה/.test(available);
      return preferences.equipment.includes(item.equipment);
    }
    return true;
  }).slice(0, 40);
}
