"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ActiveExerciseResult, ActiveWorkoutSession, AssignmentStatus, ClientWorkoutAssignment, CoachWorkoutNote, CompletedWorkout, Exercise, ExerciseSetResult, WorkoutClient, WorkoutNotification, WorkoutPreferences, WorkoutProgram, WorkoutRepositorySnapshot, WorkoutScheduleChange } from "./types";

type Row = Record<string, unknown>;
export type WorkoutLoadResult = Readonly<{ snapshot:WorkoutRepositorySnapshot; currentUserId:string; role:"coach"|"client" }>;
export type AssignmentInput = Readonly<{clientId:string;programId:string;startDate:string;endDate?:string;weeklyFrequency:number;coachNote?:string}>;
export const emptyWorkoutSnapshot:WorkoutRepositorySnapshot={exercises:[],programs:[],clients:[],assignments:[],activeSessions:[],completedWorkouts:[],coachNotes:[],notifications:[],workoutPreferences:[],scheduleChanges:[]};

const text=(value:unknown)=>typeof value==="string"?value:"";
const optionalText=(value:unknown)=>typeof value==="string"&&value?value:undefined;
const numberValue=(value:unknown)=>value===null||value===undefined?undefined:Number(value);
const stringArray=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[];
const rows=(value:unknown)=>Array.isArray(value)?value as Row[]:[];

function mapExercise(row:Row):Exercise{return{id:text(row.id),name:text(row.name),normalizedName:text(row.normalized_name),aliases:stringArray(row.aliases),category:optionalText(row.category),primaryMuscleGroup:optionalText(row.primary_muscle_group),secondaryMuscleGroups:stringArray(row.secondary_muscle_groups),equipment:optionalText(row.equipment),difficulty:optionalText(row.difficulty),video:row.video&&typeof row.video==="object"?row.video as Exercise["video"]:undefined,executionNotes:optionalText(row.execution_notes),sourceWorkbooks:stringArray(row.source_workbooks),sourceReferences:Array.isArray(row.source_references)?row.source_references as Exercise["sourceReferences"]:[],status:row.status==="archived"?"archived":"active"}}
function mapSet(row:Row):ExerciseSetResult{return{id:text(row.id),prescriptionId:optionalText(row.prescription_id),order:Number(row.sort_order),weightKg:numberValue(row.weight_kg),repetitions:numberValue(row.repetitions),notes:optionalText(row.notes),completed:Boolean(row.completed),completedAt:optionalText(row.completed_at)}}

export function createSupabaseWorkoutRepository(){
  const supabase=createSupabaseBrowserClient();
  const load=async():Promise<WorkoutLoadResult>=>{
    const{data:{user},error:userError}=await supabase.auth.getUser();if(userError||!user)throw new Error("workout_auth_required");
    const profileResult=await supabase.from("profiles").select("id,full_name,role").eq("id",user.id).single();
    if(profileResult.error||(profileResult.data as Row|undefined)?.role!=="coach"&&(profileResult.data as Row|undefined)?.role!=="client")throw new Error("workout_profile_required");
    const role=(profileResult.data as Row).role as "coach"|"client";
    const results=await Promise.all([
      supabase.from("workout_exercises").select("*").order("name"),
      supabase.from("workout_programs").select("*").order("created_at"),
      supabase.from("workout_program_days").select("*").order("sort_order"),
      supabase.from("workout_program_exercises").select("*").order("sort_order"),
      supabase.from("workout_set_prescriptions").select("*").order("sort_order"),
      supabase.from("workout_assignments").select("*").order("assigned_at"),
      supabase.from("workout_sessions").select("*").in("status",["active","completed"]).order("started_at"),
      supabase.from("workout_session_exercises").select("*").order("sort_order"),
      supabase.from("workout_sets").select("*").order("sort_order"),
      supabase.from("workout_coach_notes").select("*").order("created_at"),
      supabase.from("workout_notifications").select("*").order("created_at"),
      supabase.from("workout_preferences").select("*"),
      supabase.from("workout_schedule_changes").select("*").order("scheduled_date"),
      role==="coach"?supabase.from("profiles").select("id,full_name,role").eq("role","client").eq("status","active"):Promise.resolve({data:[],error:null}),
    ]);
    const failed=results.find((result)=>result.error);if(failed?.error)throw failed.error;
    const exerciseRows=rows(results[0].data),programRows=rows(results[1].data),dayRows=rows(results[2].data),entryRows=rows(results[3].data),prescriptionRows=rows(results[4].data),assignmentRows=rows(results[5].data),sessionRows=rows(results[6].data),resultRows=rows(results[7].data),setRows=rows(results[8].data);
    const programs:WorkoutProgram[]=programRows.map((program)=>({
      id:text(program.id),name:text(program.name),description:optionalText(program.description),programType:optionalText(program.program_type),difficulty:optionalText(program.difficulty),trainingFrequency:numberValue(program.training_frequency),equipment:stringArray(program.equipment),sourceWorkbook:text(program.source_workbook),sourceSheet:optionalText(program.source_sheet),status:program.status==="archived"?"archived" as const:"active" as const,official:Boolean(program.official),duplicatedFromId:optionalText(program.duplicated_from_id),
      days:dayRows.filter((day)=>day.program_id===program.id).map((day)=>({
        id:text(day.id),name:text(day.name),order:Number(day.sort_order),sourceSheet:optionalText(day.source_sheet),
        exercises:entryRows.filter((entry)=>entry.day_id===day.id).map((entry)=>{
          const setPrescriptions=prescriptionRows.filter((set)=>set.program_exercise_id===entry.id).map((set)=>({id:text(set.id),order:Number(set.sort_order),repetitions:optionalText(set.repetitions)}));
          const repetitions=[...new Set(setPrescriptions.map((set)=>set.repetitions).filter((value):value is string=>Boolean(value)))];
          return{id:text(entry.id),exerciseId:text(entry.exercise_id),order:Number(entry.sort_order),sets:optionalText(entry.sets_text)??(setPrescriptions.length?String(setPrescriptions.length):undefined),reps:optionalText(entry.reps_text)??(repetitions.length?repetitions.join(" / "):undefined),rest:optionalText(entry.rest_text),notes:optionalText(entry.notes),sourceRow:numberValue(entry.source_row),setPrescriptions};
        }),
      })),
    }));
    const assignments:ClientWorkoutAssignment[]=assignmentRows.map((row)=>({id:text(row.id),clientId:text(row.client_id),programId:text(row.program_id),assignedAt:text(row.assigned_at),startDate:text(row.start_date),endDate:optionalText(row.end_date),weeklyFrequency:Number(row.weekly_frequency),coachNote:optionalText(row.coach_note),status:row.status as AssignmentStatus}));
    const exerciseResults=(sessionId:string):ActiveExerciseResult[]=>resultRows.filter((row)=>row.session_id===sessionId).map((row)=>({workoutExerciseId:text(row.workout_exercise_id),exerciseId:text(row.exercise_id),skipped:Boolean(row.skipped),completed:Boolean(row.completed),sets:setRows.filter((set)=>set.session_id===sessionId&&set.workout_exercise_id===row.workout_exercise_id).map(mapSet)}));
    const activeSessions:ActiveWorkoutSession[]=sessionRows.filter((row)=>row.status==="active").map((row)=>({id:text(row.id),clientId:text(row.client_id),assignmentId:text(row.assignment_id),programId:text(row.program_id),dayId:text(row.day_id),startedAt:text(row.started_at),currentExerciseIndex:Number(row.current_exercise_index),restEndsAt:optionalText(row.rest_ends_at),workoutNote:optionalText(row.workout_note),perceivedDifficulty:numberValue(row.perceived_difficulty) as ActiveWorkoutSession["perceivedDifficulty"],energy:numberValue(row.energy) as ActiveWorkoutSession["energy"],exerciseResults:exerciseResults(text(row.id))}));
    const completedWorkouts:CompletedWorkout[]=sessionRows.filter((row)=>row.status==="completed").map((row)=>({id:text(row.completion_id),clientId:text(row.client_id),assignmentId:text(row.assignment_id),programId:text(row.program_id),dayId:text(row.day_id),startedAt:text(row.started_at),completedAt:text(row.completed_at),durationSeconds:Number(row.duration_seconds),exerciseResults:exerciseResults(text(row.id)),workoutNote:optionalText(row.workout_note),perceivedDifficulty:numberValue(row.perceived_difficulty) as CompletedWorkout["perceivedDifficulty"],energy:numberValue(row.energy) as CompletedWorkout["energy"],totalVolume:Number(row.total_volume)}));
    const clients:WorkoutClient[]=rows(results[13].data).map((row)=>({id:text(row.id),fullName:text(row.full_name)}));
    const coachNotes:CoachWorkoutNote[]=rows(results[9].data).map((row)=>({id:text(row.id),coachId:text(row.coach_id),clientId:text(row.client_id),exerciseId:optionalText(row.exercise_id),workoutId:optionalText(row.session_id),body:text(row.body),createdAt:text(row.created_at)}));
    const notifications:WorkoutNotification[]=rows(results[10].data).map((row)=>({id:text(row.id),clientId:text(row.client_id),type:row.type as WorkoutNotification["type"],createdAt:text(row.created_at),read:Boolean(row.read)}));
    const workoutPreferences:WorkoutPreferences[]=rows(results[11].data).map((row)=>({clientId:text(row.client_id),trainingTypes:stringArray(row.training_types),equipment:stringArray(row.equipment),trainingLocation:optionalText(row.training_location),preferredDays:Array.isArray(row.preferred_days)?row.preferred_days.map(Number):[]}));
    const scheduleChanges:WorkoutScheduleChange[]=rows(results[12].data).map((row)=>({id:text(row.id),assignmentId:text(row.assignment_id),clientId:text(row.client_id),programId:text(row.program_id),dayId:text(row.day_id),originalDate:text(row.original_date),scheduledDate:text(row.scheduled_date),movedAt:text(row.moved_at),status:row.status==="skipped"?"skipped":"planned",skippedAt:optionalText(row.skipped_at),skippedReason:optionalText(row.skipped_reason)}));
    return{currentUserId:user.id,role,snapshot:{exercises:exerciseRows.map(mapExercise),programs,clients,assignments,activeSessions,completedWorkouts,coachNotes,notifications,workoutPreferences,scheduleChanges}};
  };
  const rpc=async(name:string,args:Row)=>{const{error}=await supabase.rpc(name,args);if(error)throw error};
  return{
    load,
    assign:async(input:AssignmentInput)=>rpc("assign_workout_program",{p_program_id:input.programId,p_client_id:input.clientId,p_start_date:input.startDate,p_end_date:input.endDate??null,p_weekly_frequency:input.weeklyFrequency,p_coach_note:input.coachNote??""}),
    setAssignmentStatus:async(id:string,status:AssignmentStatus)=>rpc("set_workout_assignment_status",{p_assignment_id:id,p_status:status}),
    saveProgram:async(program:WorkoutProgram)=>rpc("save_workout_program_tree",{p_program:program}),
    archiveProgram:async(id:string)=>{const{error}=await supabase.from("workout_programs").update({status:"archived"}).eq("id",id);if(error)throw error},
    deleteProgram:async(id:string)=>rpc("delete_workout_program",{p_program_id:id}),
    saveActiveSession:async(session:ActiveWorkoutSession)=>rpc("save_active_workout",{p_session:session}),
    cancelActiveSession:async()=>rpc("cancel_active_workout",{}),
    completeSession:async(workout:CompletedWorkout)=>rpc("complete_workout",{p_workout:workout}),
    saveCoachNote:async(note:CoachWorkoutNote)=>rpc("save_workout_coach_note",{p_id:note.id,p_client_id:note.clientId,p_exercise_id:note.exerciseId??"",p_session_id:note.workoutId??"",p_body:note.body}),
    savePreferences:async(preferences:WorkoutPreferences)=>{const{error}=await supabase.from("workout_preferences").upsert({client_id:preferences.clientId,training_types:preferences.trainingTypes,equipment:preferences.equipment,training_location:preferences.trainingLocation??null,preferred_days:preferences.preferredDays},{onConflict:"client_id"});if(error)throw error},
    moveScheduledWorkout:async(assignmentId:string,dayId:string,originalDate:string,newDate:string,confirmConflict:boolean)=>{const{data,error}=await supabase.rpc("move_scheduled_workout",{p_assignment_id:assignmentId,p_day_id:dayId,p_original_date:originalDate,p_new_date:newDate,p_confirm_conflict:confirmConflict});if(error)throw error;return data as {ok:boolean;conflict?:boolean}},
    skipScheduledWorkout:async(assignmentId:string,dayId:string,date:string,reason:string)=>rpc("skip_scheduled_workout",{p_assignment_id:assignmentId,p_day_id:dayId,p_date:date,p_reason:reason}),
    snoozeScheduledWorkout:async(assignmentId:string,date:string)=>rpc("snooze_scheduled_workout",{p_assignment_id:assignmentId,p_date:date}),
  };
}
