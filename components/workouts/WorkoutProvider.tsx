"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { connectionStore, isOfflineError } from "@/lib/offline/connection";
import { lastCachedUser, readSnapshotCache, rememberCachedUser, writeSnapshotCache } from "@/lib/workouts/snapshot-cache";
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
  /** The snapshot came from the device cache because Supabase was unreachable. */
  offlineData:boolean;
  /** Sets are recorded on the device but Supabase has not accepted them yet. */
  pendingSync:boolean;
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
  const[offline,setOffline]=useState(false);
  const[pendingSync,setPendingSync]=useState(false);
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  // The newest state of the session, whether or not Supabase has it yet. Only
  // the newest matters: an older set row is never worth replaying over a newer one.
  const pendingSession=useRef<ActiveWorkoutSession|null>(null);
  const identity=useRef<{userId:string;role:"coach"|"client"|""}>({userId:"",role:""});

  // Every accepted snapshot is mirrored to the device, so a reload with no
  // network still has the programme and the session in progress.
  const adopt=useCallback((loaded:{snapshot:WorkoutRepositorySnapshot;currentUserId:string;role:"coach"|"client"})=>{
    identity.current={userId:loaded.currentUserId,role:loaded.role};
    setSnapshot(loaded.snapshot);
    setCurrentClientId(loaded.role==="client"?loaded.currentUserId:"");
    setRole(loaded.role);
    setPersistenceError("");
    setOffline(false);
    connectionStore.reportSuccess();
    writeSnapshotCache(loaded.currentUserId,loaded.role,loaded.snapshot);
    rememberCachedUser(loaded.currentUserId,loaded.role);
  },[]);

  const cache=useCallback((next:WorkoutRepositorySnapshot)=>{
    const{userId,role:cachedRole}=identity.current;
    if(cachedRole==="client")writeSnapshotCache(userId,cachedRole,next);
    return next;
  },[]);

  const refresh=useCallback(async()=>{const loaded=await repository.load();adopt(loaded);return loaded},[adopt,repository]);

  // A failed load is two different situations. Not signed in is an error the
  // client has to act on; no network with a usable cache is not - the workout
  // carries on and the banner says why the numbers might be a few minutes old.
  const fallBackToCache=useCallback((error:unknown)=>{
    connectionStore.reportFailure(error);
    const userId=lastCachedUser();
    const cached=userId?readSnapshotCache(userId):undefined;
    if(cached&&isOfflineError(error)){
      identity.current={userId,role:"client"};
      setSnapshot(cached);
      setCurrentClientId(userId);
      setRole("client");
      setOffline(true);
      setPersistenceError("");
      return;
    }
    setSnapshot(emptyWorkoutSnapshot);setCurrentClientId("");setRole("");setOffline(false);
    setPersistenceError(isOfflineError(error)?"אין חיבור לאינטרנט ואין נתוני אימון שמורים במכשיר.":"יש להתחבר כדי לטעון את נתוני האימונים.");
  },[]);

  useEffect(()=>{let active=true;repository.load().then((loaded)=>{if(active)adopt(loaded)}).catch((error)=>{if(active)fallBackToCache(error)}).finally(()=>{if(active){setLoadedAuthScope(authScope);setLoading(false)}});return()=>{active=false}},[adopt,authScope,fallBackToCache,repository]);
  useEffect(()=>connectionStore.start(),[]);

  const fail=useCallback((error?:unknown)=>{
    connectionStore.reportFailure(error);
    setPersistenceError(isOfflineError(error)?"אין חיבור כרגע. הנתונים נשמרו במכשיר וייסנכרנו כשהחיבור יחזור.":"השמירה ב-Supabase נכשלה. יש לרענן ולנסות שוב.");
    return false;
  },[]);

  // One writer for the session, shared by the normal save path and the retry, so
  // a reconnect can never race a save into writing an older set row.
  const flushSession=useCallback(()=>{
    saveQueue.current=saveQueue.current.then(async()=>{
      const target=pendingSession.current;
      if(!target)return;
      try{
        await repository.saveActiveSession(target);
        connectionStore.reportSuccess();
        if(pendingSession.current===target){pendingSession.current=null;setPendingSync(false);setPersistenceError("")}
      }catch(error){
        connectionStore.reportFailure(error);
        setPendingSync(true);
        setPersistenceError(isOfflineError(error)?"אין חיבור כרגע. הסטים נשמרו במכשיר וייסנכרנו כשהחיבור יחזור.":"השמירה ב-Supabase נכשלה. יש לרענן ולנסות שוב.");
      }
    });
  },[repository]);

  // Coming back online is the only automatic retry. It replays the newest
  // session state once; it does not drain a queue of historical edits.
  useEffect(()=>connectionStore.subscribe(()=>{
    if(connectionStore.getSnapshot().online&&pendingSession.current)flushSession();
  }),[flushSession]);
  const value=useMemo<ContextValue>(()=>({
    snapshot,currentClientId,role,loading:loading||loadedAuthScope!==authScope,persistenceError,offlineData:offline,pendingSync,
    assign:async(input)=>{if(input.endDate&&input.endDate<input.startDate)return false;if(snapshot.assignments.some((item)=>item.clientId===input.clientId&&item.programId===input.programId&&item.status==="active"))return false;const replaced=snapshot.assignments.find((item)=>item.clientId===input.clientId&&item.status==="active");if(replaced&&!window.confirm("כבר קיימת ללקוח תוכנית פעילה. להחליף אותה ולשמור אותה בהיסטוריה?"))return false;try{await repository.assign(input);await refresh();return true}catch{return fail()}},
    setAssignmentStatus:async(id,status)=>{try{await repository.setAssignmentStatus(id,status);setSnapshot((current)=>updateAssignmentStatus(current,id,status));return true}catch{return fail()}},
    setAssignmentFrequency:async(id,weeklyFrequency)=>{if(!Number.isInteger(weeklyFrequency)||weeklyFrequency<1||weeklyFrequency>7)return false;try{await repository.setAssignmentFrequency(id,weeklyFrequency);setSnapshot((current)=>({...current,assignments:current.assignments.map((item)=>item.id===id?{...item,weeklyFrequency}:item)}));return true}catch{return fail()}},
    duplicate:async(programId)=>{const source=snapshot.programs.find((program)=>program.id===programId);if(!source)return undefined;const id=`${programId}-copy-${Date.now()}`;const program=duplicateWorkoutProgram(source,id);try{await repository.saveProgram(program);setSnapshot((current)=>({...current,programs:[...current.programs,program]}));return id}catch{fail();return undefined}},
    archive:async(programId)=>{try{await repository.archiveProgram(programId);setSnapshot((current)=>({...current,programs:archiveWorkoutProgram(current.programs,programId)}));return true}catch{return fail()}},
    deleteProgram:async(programId)=>{try{await repository.deleteProgram(programId);setSnapshot((current)=>({...current,programs:current.programs.filter((program)=>program.id!==programId)}));return true}catch{return fail()}},
    saveProgram:async(program)=>{try{await repository.saveProgram(program);setSnapshot((current)=>saveCustomWorkoutProgram(current,program));return true}catch{return fail()}},
    startSession:async(session)=>{if(snapshot.activeSessions.some((item)=>item.clientId===session.clientId))return false;try{await repository.saveActiveSession(session);connectionStore.reportSuccess();setSnapshot((current)=>cache(startWorkoutSession(current,session)));return true}catch(error){return fail(error)}},
    // The device is written to first and synchronously. Whatever the network
    // does next, the set the client just typed is already safe.
    saveSession:(session)=>{setSnapshot((current)=>cache(saveActiveWorkoutSession(current,session)));pendingSession.current=session;setPendingSync(true);flushSession()},
    cancelSession:async(clientId)=>{try{await saveQueue.current;await repository.cancelActiveSession();pendingSession.current=null;setPendingSync(false);connectionStore.reportSuccess();setSnapshot((current)=>cache(cancelWorkoutSession(current,clientId)));return true}catch(error){return fail(error)}},
    completeSession:async(workout)=>{if(snapshot.completedWorkouts.some((item)=>item.id===workout.id))return false;try{await saveQueue.current;await repository.completeSession(workout);pendingSession.current=null;setPendingSync(false);connectionStore.reportSuccess();setSnapshot((current)=>cache(saveCompletedWorkout(current,workout)));return true}catch(error){return fail(error)}},
    saveCoachNote:async(note)=>{try{await repository.saveCoachNote(note);setSnapshot((current)=>saveCoachWorkoutNote(current,note));return true}catch{return fail()}},
    saveExerciseGuidance:async(exerciseId,guidance)=>{const normalized=normalizeGuidance(guidance);try{await repository.saveExerciseGuidance(exerciseId,normalized);setSnapshot((current)=>({...current,exercises:current.exercises.map((exercise)=>exercise.id===exerciseId?{...exercise,...normalized}:exercise)}));return true}catch{return fail()}},
    savePreferences:async(preferences)=>{try{await repository.savePreferences(preferences);setSnapshot((current)=>saveWorkoutPreferences(current,preferences));return true}catch{return fail()}},
    moveScheduledWorkout:async(assignmentId,dayId,originalDate,newDate,confirmConflict)=>{try{const result=await repository.moveScheduledWorkout(assignmentId,dayId,originalDate,newDate,confirmConflict);if(result.ok)await refresh();return result}catch{fail();return{ok:false}}},
    skipScheduledWorkout:async(assignmentId,dayId,date,reason)=>{try{await repository.skipScheduledWorkout(assignmentId,dayId,date,reason);await refresh();return true}catch{return fail()}},
    snoozeScheduledWorkout:async(assignmentId,date)=>{try{await repository.snoozeScheduledWorkout(assignmentId,date);return true}catch{return fail()}},
    getProgram:(id)=>snapshot.programs.find((program)=>program.id===id),
    getExercise:(id)=>snapshot.exercises.find((exercise)=>exercise.id===id),
  }),[authScope,cache,currentClientId,fail,flushSession,loadedAuthScope,loading,offline,pendingSync,persistenceError,refresh,repository,role,snapshot]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkouts(){const value=useContext(Context);if(!value)throw new Error("useWorkouts must be inside WorkoutProvider");return value}
