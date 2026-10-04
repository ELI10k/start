import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { BUILT_IN_PROGRAMS } from "./program-catalog";
import { personalizeProgram, recommendTraining, type TrainingIntake } from "./personalization";
import type { WorkoutProgram } from "./types";
import { israelDateKey } from "@/lib/progress/measurements";

// Called only after the action verifies the client/coach identity. The database
// checks the active relationship again and writes the whole tree atomically.
export async function assignPersonalizedTraining(admin: ReturnType<typeof createSupabaseAdminClient>, clientId: string, input: TrainingIntake): Promise<string> {
  const recommendation = recommendTraining(input);
  if (recommendation.status !== "ready") return recommendation.message;
  const {data: relationship, error: relationshipError} = await admin.from("coach_client_relationships").select("coach_id").eq("client_id", clientId).eq("status", "active").limit(1).maybeSingle();
  if (relationshipError || !relationship) return "האפיון נשמר. נדרש שיוך מאמן לפני הפעלת תוכנית.";
  const {data: row, error} = await admin.from("workout_programs").select("*,workout_program_days(*,workout_program_exercises(*,workout_set_prescriptions(*)))").eq("status", "active").eq("official", true).or(`id.eq.${recommendation.programId},name.eq.${recommendation.programId}`).limit(1).maybeSingle();
  if (error || !row) return "האפיון נשמר; התוכנית המומלצת אינה זמינה במאגר. נדרשת בדיקת מאמן.";
  const template: WorkoutProgram = BUILT_IN_PROGRAMS.find(p => p.id === row.id) ?? {
    id: row.id, name: row.name, description: row.description, programType: row.program_type, difficulty: row.difficulty, trainingFrequency: row.training_frequency, equipment: row.equipment ?? [], sourceWorkbook: row.source_workbook, status: "active", official: true,
    days: row.workout_program_days.map((d: Record<string, unknown>) => ({id: String(d.id), name: String(d.name), order: Number(d.sort_order), exercises: (d.workout_program_exercises as Record<string, unknown>[]).map(e => ({id: String(e.id), exerciseId: String(e.exercise_id), order: Number(e.sort_order), sets: e.sets_text as string, reps: e.reps_text as string, rest: e.rest_text as string, notes: e.notes as string}))})),
  };
  const personalized = personalizeProgram(template, recommendation, input.sessionMinutes!);
  const id = `personal-${randomUUID()}`;
  const program = {...personalized, id, name: `${template.name} — מותאם אישית`, official: false, duplicatedFromId: template.id, days: personalized.days.map((day, n) => ({...day, id: `${id}-day-${n}`, exercises: day.exercises.map((entry, i) => ({...entry, id: `${id}-day-${n}-ex-${i}`, notes: [entry.effort ? `RPE יעד: ${entry.effort}` : "", entry.notes].filter(Boolean).join("\n"), setPrescriptions: entry.setPrescriptions?.map((set, j) => ({...set, id: `${id}-day-${n}-ex-${i}-set-${j}`}))}))}))};
  const {data: result, error: assignmentError} = await admin.rpc("assign_intake_workout", {p_client_id: clientId, p_coach_id: relationship.coach_id, p_program: program, p_start_date: israelDateKey(), p_location: input.trainingLocation, p_equipment: input.equipment === "trx" ? ["TRX", "משקל גוף"] : ["משקולות יד", "מוט", "מכונה ייעודית", "כבל פולי", "משקל גוף"]});
  if (assignmentError) {console.error("Personalized training assignment failed", {code: assignmentError.code}); return "האפיון נשמר, אך שיוך האימון נכשל. אפשר לשמור שוב או לשייך ממסך האימונים.";}
  return result === "already_active" ? `האפיון נשמר. התוכנית הפעילה נשמרה; המלצה: ${recommendation.message}` : `שויכה תוכנית מותאמת: ${recommendation.message}`;
}
