import { buildProgram, PROGRAM_DEFINITIONS, MOVEMENTS, HOME_MOVEMENTS, type Focus, type ProgramDefinition } from "./program-catalog.ts";
import { isTraineeLevel, type TraineeLevel } from "./trainee-level.ts";
import type { Exercise, WorkoutPreferences, WorkoutProgram } from "./types.ts";

export type TrainingIntake = {
  sex?: string; traineeLevel?: string; weeklyWorkouts?: number; trainingLocation?: string;
  equipment?: string; trainingFocus?: string; trainingSplit?: string; sessionMinutes?: number;
  medicalNotes?: string; medicalReview?: string; experienceMonths?: number; technique?: string;
};
export function intakeFromForm(form: FormData): TrainingIntake {
  const get = (key: string) => String(form.get(key) ?? "").trim();
  const number = (key: string) => get(key) ? Number(get(key)) : undefined;
  return {sex: get("sex"), traineeLevel: get("traineeLevel"), weeklyWorkouts: number("weeklyWorkouts"), trainingLocation: get("trainingLocation"), equipment: get("equipment"), trainingFocus: get("trainingFocus"), trainingSplit: get("trainingSplit"), sessionMinutes: number("sessionMinutes"), medicalNotes: get("medicalNotes"), medicalReview: get("medicalReview"), experienceMonths: number("experienceMonths"), technique: get("technique")};
}
export function trainingPreferences(input: TrainingIntake) {
  return {training_location: input.trainingLocation ?? "", equipment: input.equipment ?? "", training_focus: input.trainingFocus ?? "", training_split: input.trainingSplit ?? "", session_minutes: input.sessionMinutes ?? null, medical_notes: input.medicalNotes ?? "", medical_review: input.medicalReview ?? "", experience_months: input.experienceMonths ?? null, technique: input.technique ?? ""};
}
export function assessedLevel(input: TrainingIntake): TraineeLevel | undefined {
  if (!isTraineeLevel(input.traineeLevel)) return undefined;
  if (input.technique === "learning" || (input.experienceMonths !== undefined && input.experienceMonths < 6)) return "beginner";
  if (input.traineeLevel === "advanced" && (input.technique !== "stable" || input.experienceMonths === undefined || input.experienceMonths < 24)) return "intermediate";
  return input.traineeLevel;
}
export type TrainingRecommendation = {status: "ready" | "review" | "missing"; message: string; programId?: string; definition?: ProgramDefinition; level?: TraineeLevel; frequency?: number};
export function recommendTraining(input: TrainingIntake): TrainingRecommendation {
  if (input.medicalReview === "yes" || input.medicalNotes?.trim()) return {status: "review", message: "הנתונים הרפואיים דורשים בדיקת מאמן לפני הפעלת תוכנית."};
  const level = assessedLevel(input), frequency = input.weeklyWorkouts;
if (!level || !["male", "female"].includes(input.sex ?? "") || !frequency || !Number.isInteger(frequency) || frequency < 2 || frequency > 6 || !["gym", "home"].includes(input.trainingLocation ?? "") || !["gym", "trx", "bodyweight", "bodyweight_station", "dumbbells", "dumbbells_bench"].includes(input.equipment ?? "") || !["balanced", "glutes", "back"].includes(input.trainingFocus ?? "") || !["auto", "FBW", "A-B", "PPL"].includes(input.trainingSplit ?? "") || !input.sessionMinutes || input.sessionMinutes < 30 || input.sessionMinutes > 120 || input.medicalReview !== "no" || input.experienceMonths === undefined || !Number.isFinite(input.experienceMonths) || input.experienceMonths < 0 || !["learning", "stable"].includes(input.technique ?? "")) return {status: "missing", message: "להתאמה אוטומטית יש להשלים רמה, ניסיון, טכניקה, מין, 2–6 אימונים בשבוע, מיקום, ציוד, דגש, פיצול, זמן ושאלת מגבלות רפואיות."};
  if (input.equipment === "bodyweight") return {status: "review", message: "לכיסוי הגב בתוכניות משקל גוף נדרש מתח ומתקן חתירה יציב. ללא מתקן יש לפנות למאמן להתאמה."};
  if (input.equipment === "gym" && input.trainingLocation !== "gym") return {status: "review", message: "תוכנית משקולות ומכונות דורשת גישה לחדר כושר; יש לעדכן ציוד או לבחור עם המאמן."};
  const focus = input.trainingFocus as Focus;
  const homeEquipment=["bodyweight_station","dumbbells","dumbbells_bench"].includes(input.equipment??"") ? input.equipment as NonNullable<ProgramDefinition["homeEquipment"]> : undefined;
  if (input.sex === "male" && focus !== "balanced") return {status: "review", message: "דגש ישבן או גב לגברים דורש התאמה של המאמן במאגר הנוכחי."};
  let split = input.trainingSplit === "auto" ? (level === "beginner" || frequency <= 3 ? "FBW" : frequency === 4 ? "A-B" : "PPL") : input.trainingSplit;
  if (input.equipment === "trx") split = "FBW";
  if (homeEquipment) {
    if (focus !== "balanced" || !["auto","FBW"].includes(input.trainingSplit!)) return {status:"review",message:"התוכניות הביתיות הנוספות הן FBW מאוזן; דגש או פיצול אחר דורשים התאמת מאמן."};
    split="FBW";
    if (homeEquipment === "bodyweight_station" && level === "beginner") return {status:"review",message:"תוכנית משקל גוף למתחילים קיימת במאגר; המאמן יוודא התאמה של תרגילי המשיכה והמתקן לפני השיוך."};
  }
  if (split === "PPL" && frequency < 3) return {status: "review", message: "PPL דורש לפחות שלושה אימונים בשבוע. מומלץ לבחור FBW או A-B."};
  if (split === "FBW" && frequency > 3) return {status: "review", message: "בתוכניות FBW יש לבחור 2–3 אימונים בשבוע עם יום התאוששות ביניהם."};
  if (split === "A-B" && frequency > 4) return {status: "review", message: "בתוכניות A-B במאגר יש לבחור 2–4 אימונים בשבוע."};
  if (input.sessionMinutes < 45 && split === "PPL") return {status: "review", message: "לתוכנית PPL נדרשות לפחות 45 דקות לאימון, או קיצור אישי על ידי המאמן."};
  const def = PROGRAM_DEFINITIONS.find(d => (d.sex === input.sex || d.sex === "all") && d.homeEquipment === homeEquipment && d.trx === (input.equipment === "trx") && d.focus === focus && d.split === split && (!d.level || d.level === level));
  // Balanced gym FBW and men's A-B already exist as approved templates.
  const legacy = input.equipment === "gym" && focus === "balanced" ? split === "FBW" ? level === "beginner" ? "FBW משקולות חופשי מתחילים" : "אימון FBW מלא לחדר כושר" : split === "A-B" ? "A-B" : undefined : undefined;
  if (!def && !legacy) return {status: "review", message: "אין תבנית המתאימה לכל התשובות; נדרשת בחירת מאמן."};
  return {status: "ready", definition: def, programId: def?.id ?? legacy, level, frequency, message: `${def?.name ?? legacy} · ${frequency} אימונים בשבוע${level !== input.traineeLevel ? " · רמה הותאמה לניסיון ולטכניקה" : ""}`};
}

export function personalizeProgram(template: WorkoutProgram, recommendation: TrainingRecommendation, minutes: number): WorkoutProgram {
  const program = recommendation.definition ? buildProgram(recommendation.definition, recommendation.level) : template;
  // Fixed repetitions; less time reduces sets, never removes an entire muscle group.
  const shorter = minutes <= 45;
  return {...program, description: `${recommendation.frequency} אימונים בשבוע לפי אפיון הלקוח; ${minutes} דקות זמינות לאימון. ${program.description?.replace(/\d+ אימונים בשבוע[;,]?/g, "")??""}`, trainingFrequency: recommendation.frequency, days: program.days.map(day => ({...day, exercises: day.exercises.map(entry => {
    if (entry.exerciseId === "exercise-155pu7s") return entry;
    const count = shorter ? 2 : Number(entry.sets) || entry.setPrescriptions?.length || 2;
    const repetitions = entry.reps && /^\d+( שניות)?$/.test(entry.reps) ? entry.reps : "10";
    return {...entry, sets: String(count), reps: repetitions, setPrescriptions: Array.from({length: count}, (_, i) => ({id: `${entry.id}-set-${i}`, order: i, repetitions}))};
  })}))};
}

const patterns: Record<string, string> = {};
for (const [movement, ids] of Object.entries(MOVEMENTS)) for (const id of ids) patterns[id] = movement;
for (const movements of Object.values(HOME_MOVEMENTS)) for (const [movement,id] of Object.entries(movements)) patterns[id] = movement;
Object.assign(patterns, {"resistance-suspenders-squat": "squat", "resistance-suspended-hip-thrust": "hip", "resistance-straps-aided-lunges": "lunge", "resistance-suspender-chest-press": "chest", "resistance-suspended-row": "row", "resistance-suspender-reverse-flys": "rear", "resistance-suspender-forward-y-raise": "shoulder", "resistance-suspender-arm-curl": "curl", "resistance-suspender-arm-extension": "triceps"});
function movementPattern(exercise: Exercise) {
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
  const pattern = movementPattern(prescribed);
  const muscle = prescribed.primaryMuscleGroup === "בטן" ? "שרירי ליבה" : prescribed.primaryMuscleGroup;
  return catalogue.filter(item => {
    if (item.id === prescribed.id || item.status !== "active") return false;
    if ((item.primaryMuscleGroup === "בטן" ? "שרירי ליבה" : item.primaryMuscleGroup) !== muscle) return false;
    // Timed and repetition prescriptions are not interchangeable.
    if (/פלאנק|plank/i.test(item.name) !== /פלאנק|plank/i.test(prescribed.name)) return false;
    if (pattern && movementPattern(item) !== pattern) return false;
    if (preferences?.trainingLocation === "home") {
      const available=preferences.equipment;
      if (available.includes("משקולות יד") && !available.some(e=>/מכונה|פולי|מוט/.test(e))) {
        const mode=available.includes("ספסל")?"dumbbells_bench":"dumbbells";
        const allowed=new Set([...Object.values(HOME_MOVEMENTS.dumbbells),...(mode==="dumbbells_bench"?Object.values(HOME_MOVEMENTS.dumbbells_bench):[])]);
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
