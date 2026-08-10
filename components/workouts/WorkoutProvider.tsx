"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseWorkoutRepository, emptyWorkoutSnapshot, type AssignmentInput } from "@/lib/workouts/supabase-repository";
import { archiveWorkoutProgram, cancelWorkoutSession, duplicateWorkoutProgram, saveActiveWorkoutSession, saveCoachWorkoutNote, saveCompletedWorkout, saveCustomWorkoutProgram, saveWorkoutPreferences, startWorkoutSession, updateAssignmentStatus } from "@/lib/workouts/storage";
import { normalizeGuidance } from "@/lib/workouts/exercise-guidance";
import type { ActiveWorkoutSession, AssignmentStatus, CoachWorkoutNote, CompletedWorkout, Exercise, ExerciseGuidance, WorkoutPreferences, WorkoutProgram, WorkoutRepositorySnapshot } from "@/lib/workouts/types";

type ContextValue={
  snapshot:WorkoutRepositorySnapshot;
  currentClientId:string;
  role:"coach"|"client"|"";
  loading:boolean;
  persistenceError:string;
  assign:(input:AssignmentInput)=>Promise<boolean>;
  setAssignmentStatus:(id:string,status:AssignmentStatus)=>Promise<boolean>;
  setAssignmentFrequency:(id:string,weeklyFrequency:number)=>Promise<boolean>;
  duplicate:(programId:string)=>Promise<string|undefined>;
  archive:(programId:string)=>Promise<boolean>;
  deleteProgram:(programId:string)=>Promise<boolean>;
  saveProgram:(program:WorkoutProgram)=>Promise<boolean>;
  startSession:(session:ActiveWorkoutSession)=>Promise<boolean>;
  saveSession:(session:ActiveWorkoutSession)=>void;
  cancelSession:(clientId:string)=>Promise<boolean>;
  completeSession:(workout:CompletedWorkout)=>Promise<boolean>;
  saveCoachNote:(note:CoachWorkoutNote)=>Promise<boolean>;
  saveExerciseGuidance:(exerciseId:string,guidance:ExerciseGuidance)=>Promise<boolean>;
  savePreferences:(preferences:WorkoutPreferences)=>Promise<boolean>;
  moveScheduledWorkout:(assignmentId:string,dayId:string,originalDate:string,newDate:string,confirmConflict:boolean)=>Promise<{ok:boolean;conflict?:boolean}>;
  skipScheduledWorkout:(assignmentId:string,dayId:string,date:string,reason:string)=>Promise<boolean>;
  snoozeScheduledWorkout:(assignmentId:string,date:string)=>Promise<boolean>;
  getProgram:(id:string)=>WorkoutProgram|undefined;
  getExercise:(id:string)=>Exercise|undefined;
};
const Context=createContext<ContextValue|null>(null);

export function WorkoutProvider({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const authScope=pathname==="/login"||pathname.startsWith("/auth/")?"auth":pathname.startsWith("/coach")?"coach":"client";
  const repository=useMemo(()=>createSupabaseWorkoutRepository(),[]);
  const[snapshot,setSnapshot]=useState<WorkoutRepositorySnapshot>(emptyWorkoutSnapshot);
  const[currentClientId,setCurrentClientId]=useState("");
  const[role,setRole]=useState<"coach"|"client"|"">("");
  const[loading,setLoading]=useState(true);
  const[loadedAuthScope,setLoadedAuthScope]=useState("");
  const[persistenceError,setPersistenceError]=useState("");
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  const refresh=useCallback(async()=>{const loaded=await repository.load();setSnapshot(loaded.snapshot);setCurrentClientId(loaded.role==="client"?loaded.currentUserId:"");setRole(loaded.role);setPersistenceError("");return loaded},[repository]);
  useEffect(()=>{let active=true;repository.load().then((loaded)=>{if(active){setSnapshot(loaded.snapshot);setCurrentClientId(loaded.role==="client"?loaded.currentUserId:"");setRole(loaded.role);setPersistenceError("")}}).catch(()=>{if(active){setSnapshot(emptyWorkoutSnapshot);setCurrentClientId("");setRole("");setPersistenceError("יש להתחבר כדי לטעון את נתוני האימונים.")}}).finally(()=>{if(active){setLoadedAuthScope(authScope);setLoading(false)}});return()=>{active=false}},[authScope,repository]);
  const fail=useCallback(()=>{setPersistenceError("השמירה ב-Supabase נכשלה. יש לרענן ולנסות שוב.");return false},[]);
  const value=useMemo<ContextValue>(()=>({
    snapshot,currentClientId,role,loading:loading||loadedAuthScope!==authScope,persistenceError,
    assign:async(input)=>{if(input.endDate&&input.endDate<input.startDate)return false;if(snapshot.assignments.some((item)=>item.clientId===input.clientId&&item.programId===input.programId&&item.status==="active"))return false;const replaced=snapshot.assignments.find((item)=>item.clientId===input.clientId&&item.status==="active");if(replaced&&!window.confirm("כבר קיימת ללקוח תוכנית פעילה. להחליף אותה ולשמור אותה בהיסטוריה?"))return false;try{await repository.assign(input);await refresh();return true}catch{return fail()}},
    setAssignmentStatus:async(id,status)=>{try{await repository.setAssignmentStatus(id,status);setSnapshot((current)=>updateAssignmentStatus(current,id,status));return true}catch{return fail()}},
    setAssignmentFrequency:async(id,weeklyFrequency)=>{if(!Number.isInteger(weeklyFrequency)||weeklyFrequency<1||weeklyFrequency>7)return false;try{await repository.setAssignmentFrequency(id,weeklyFrequency);setSnapshot((current)=>({...current,assignments:current.assignments.map((item)=>item.id===id?{...item,weeklyFrequency}:item)}));return true}catch{return fail()}},
    duplicate:async(programId)=>{const source=snapshot.programs.find((program)=>program.id===programId);if(!source)return undefined;const id=`${programId}-copy-${Date.now()}`;const program=duplicateWorkoutProgram(source,id);try{await repository.saveProgram(program);setSnapshot((current)=>({...current,programs:[...current.programs,program]}));return id}catch{fail();return undefined}},
    archive:async(programId)=>{try{await repository.archiveProgram(programId);setSnapshot((current)=>({...current,programs:archiveWorkoutProgram(current.programs,programId)}));return true}catch{return fail()}},
    deleteProgram:async(programId)=>{try{await repository.deleteProgram(programId);setSnapshot((current)=>({...current,programs:current.programs.filter((program)=>program.id!==programId)}));return true}catch{return fail()}},
    saveProgram:async(program)=>{try{await repository.saveProgram(program);setSnapshot((current)=>saveCustomWorkoutProgram(current,program));return true}catch{return fail()}},
    startSession:async(session)=>{if(snapshot.activeSessions.some((item)=>item.clientId===session.clientId))return false;try{await repository.saveActiveSession(session);setSnapshot((current)=>startWorkoutSession(current,session));return true}catch{return fail()}},
    saveSession:(session)=>{setSnapshot((current)=>saveActiveWorkoutSession(current,session));saveQueue.current=saveQueue.current.then(()=>repository.saveActiveSession(session)).catch(()=>{setPersistenceError("השמירה ב-Supabase נכשלה. יש לרענן ולנסות שוב.")})},
    cancelSession:async(clientId)=>{try{await saveQueue.current;await repository.cancelActiveSession();setSnapshot((current)=>cancelWorkoutSession(current,clientId));return true}catch{return fail()}},
    completeSession:async(workout)=>{if(snapshot.completedWorkouts.some((item)=>item.id===workout.id))return false;try{await saveQueue.current;await repository.completeSession(workout);setSnapshot((current)=>saveCompletedWorkout(current,workout));return true}catch{return fail()}},
    saveCoachNote:async(note)=>{try{await repository.saveCoachNote(note);setSnapshot((current)=>saveCoachWorkoutNote(current,note));return true}catch{return fail()}},
    saveExerciseGuidance:async(exerciseId,guidance)=>{const normalized=normalizeGuidance(guidance);try{await repository.saveExerciseGuidance(exerciseId,normalized);setSnapshot((current)=>({...current,exercises:current.exercises.map((exercise)=>exercise.id===exerciseId?{...exercise,...normalized}:exercise)}));return true}catch{return fail()}},
    savePreferences:async(preferences)=>{try{await repository.savePreferences(preferences);setSnapshot((current)=>saveWorkoutPreferences(current,preferences));return true}catch{return fail()}},
    moveScheduledWorkout:async(assignmentId,dayId,originalDate,newDate,confirmConflict)=>{try{const result=await repository.moveScheduledWorkout(assignmentId,dayId,originalDate,newDate,confirmConflict);if(result.ok)await refresh();return result}catch{fail();return{ok:false}}},
    skipScheduledWorkout:async(assignmentId,dayId,date,reason)=>{try{await repository.skipScheduledWorkout(assignmentId,dayId,date,reason);await refresh();return true}catch{return fail()}},
    snoozeScheduledWorkout:async(assignmentId,date)=>{try{await repository.snoozeScheduledWorkout(assignmentId,date);return true}catch{return fail()}},
    getProgram:(id)=>snapshot.programs.find((program)=>program.id===id),
    getExercise:(id)=>snapshot.exercises.find((exercise)=>exercise.id===id),
  }),[authScope,currentClientId,fail,loadedAuthScope,loading,persistenceError,refresh,repository,role,snapshot]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkouts(){const value=useContext(Context);if(!value)throw new Error("useWorkouts must be inside WorkoutProvider");return value}
