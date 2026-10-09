"use client";
/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Play, Repeat2, RotateCcw, X } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import ExerciseGuidanceButton from "@/components/workouts/ExerciseGuidanceButton";
import ExerciseThumbnail from "@/components/workouts/ExerciseThumbnail";
import TechniqueVideoButton from "@/components/workouts/client/TechniqueVideoButton";
import { track } from "@/lib/analytics/client";
import { StateBlock } from "@/components/client/AppPatterns";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import WorkoutLoadingState from "@/components/workouts/WorkoutLoadingState";
import WorkoutPreserveImprove from "@/components/workouts/client/WorkoutPreserveImprove";
import { bestComparableSet, exercisePerformance, targetRepetitions, workoutCompletionPercent, workoutVolume } from "@/lib/workouts/progress";
import { isCompoundLift, isFirstExerciseForMuscle, planWarmup, preparationGroup, workingWeightFrom } from "@/lib/workouts/warmup";
import { buildWorkoutReport, type ReportExercise } from "@/lib/workouts/session-report";
import { signalRestOver } from "@/lib/workouts/feedback";
import { nextWorkoutChallenge } from "@/lib/workouts/challenge";
import { workoutRestSeconds } from "@/lib/workouts/rest";
import { alternativeExercises, movementPattern } from "@/lib/workouts/personalization";
import { substituteExercise } from "@/lib/workouts/substitution";
import { isProfessionalProgram } from "@/lib/workouts/professional";
import { workoutAvailability } from "@/lib/workouts/availability";
import { israelDateKey } from "@/lib/date-time";
import type { ActiveExerciseResult, ActiveWorkoutSession, CompletedWorkout, ExerciseSetResult } from "@/lib/workouts/types";
import { useWorkoutWakeLock } from "@/lib/browser/workout-wake-lock";
import { calendarDay, latestSleepHours, sleepToPersist } from "@/lib/health/calculations";
import { resolveHealthProvider, syncWindow } from "@/lib/health/providers";
import { createHealthRepository } from "@/lib/health/repository";

const setCount=(value?:string)=>{const count=Number.parseInt(value??"",10);return Number.isFinite(count)&&count>0?Math.min(count,20):0};
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;

export default function WorkoutSession({programId,dayId}:{programId:string;dayId:string}){
  const router=useRouter();
  const{getProgram,getExercise,currentClientId,snapshot,loading,persistenceError,pendingSync,startSession,saveSession,cancelSession,completeSession}=useWorkouts();
  const program=getProgram(programId);const day=program?.days.find((item)=>item.id===dayId);
  const assignment=snapshot.assignments.find((item)=>item.clientId===currentClientId&&item.programId===programId&&item.status==="active");
  const anySession=snapshot.activeSessions.find((item)=>item.clientId===currentClientId);
  const session=anySession?.programId===programId&&anySession.dayId===dayId?anySession:undefined;
  const[now,setNow]=useState(()=>Date.now());const[summary,setSummary]=useState(false);const[warning,setWarning]=useState("");const[saved,setSaved]=useState<CompletedWorkout>();const[isStarting,setIsStarting]=useState(false);const[isCompleting,setIsCompleting]=useState(false);const[abandon,setAbandon]=useState(false);const[isAbandoning,setIsAbandoning]=useState(false);const[swapping,setSwapping]=useState(false);
  // Whether "there are unfinished exercises" has already been put to the client.
  // This used to be inferred from `warning` holding anything at all - and
  // completing the last exercise writes a warning of its own ("אפשר לסיים את
  // האימון"), so the client most likely to have unfinished exercises was exactly
  // the one who was never asked about them.
  const[confirmedPartial,setConfirmedPartial]=useState(false);
  useWorkoutWakeLock(Boolean(session&&!saved));
  const ordered=[...(day?.exercises??[])].sort((a,b)=>a.order-b.order);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
  // Scheduled against the rest end itself rather than polled off the ticking
  // clock, so the buzz lands on time even if a render is late - and cancels
  // cleanly when the client skips the rest or adds thirty seconds to it.
  const restEndsAt=session?.restEndsAt;
  useEffect(()=>{
    if(!restEndsAt)return;
    const remaining=new Date(restEndsAt).getTime()-Date.now();
    if(remaining<=0)return;
    const timer=window.setTimeout(signalRestOver,remaining);
    return()=>window.clearTimeout(timer);
  },[restEndsAt]);
  if(loading)return <WorkoutLoadingState/>;
  if(!program||!day)notFound();
  // Every set opened with two empty boxes, and the weight the client used last
  // time sat behind a closed "ביצוע קודם" panel. It is the same number nine
  // times out of ten, and it was being retyped once per set, per exercise, per
  // workout - the most repeated keystrokes in the product. The last session's
  // figures are now in the boxes; completing a set is still an explicit tap, so
  // nothing is recorded that the client did not confirm.
  const makeSession=(startingSleepHours?:number,startingEnergy:1|2|3|4|5=3):ActiveWorkoutSession=>({
    id:`session-${currentClientId}-${Date.now()}`,clientId:currentClientId,assignmentId:assignment?.id??"",programId,dayId,
    startedAt:new Date().toISOString(),currentExerciseIndex:0,sleepHours:startingSleepHours,energy:startingEnergy,
    exerciseResults:ordered.map((entry):ActiveExerciseResult=>{
      // Compare like with like: workout 1 is based on workout 1 from the
      // previous week, never on workout 2 merely because it happened later.
      const comparable=snapshot.completedWorkouts.filter((workout)=>workout.programId===programId&&workout.dayId===dayId);
      const last=exercisePerformance(comparable,currentClientId,entry.exerciseId).sessions[0];
      return{workoutExerciseId:entry.id,exerciseId:entry.exerciseId,skipped:false,completed:false,warmupCompletedPercents:[],
        sets:Array.from({length:setCount(entry.sets)},(_,index):ExerciseSetResult=>{
          const previous=last?.sets[index];
          return{id:`${entry.id}-set-${index+1}`,prescriptionId:entry.setPrescriptions?.[index]?.id,order:index,completed:false,
            weightKg:previous?.weightKg,repetitions:previous?.repetitions};
        })};
    }),
  });
  const begin=async(startingSleepHours?:number,startingEnergy:1|2|3|4|5=3)=>{if(isStarting)return;if(!assignment){setWarning("לא נמצאה הקצאת תוכנית פעילה.");return}if(anySession&&!session){setWarning("כבר קיים אימון פעיל אחר.");return}const gate=workoutAvailability(program,assignment,snapshot.completedWorkouts,israelDateKey(),snapshot.workoutPreferences.find(p=>p.clientId===currentClientId),snapshot.scheduleChanges);if(isProfessionalProgram(program)&&(gate.status!=="ready"||gate.day?.id!==dayId)){setWarning(gate.message||"יש להתחיל את האימון הבא בלוח, לאחר ההתאוששות.");return;}setIsStarting(true);try{if(await startSession(makeSession(startingSleepHours,startingEnergy)))track("workout_started",{exercises:ordered.length,sleepHours:startingSleepHours??null,energy:startingEnergy});else setWarning("לא ניתן להתחיל שני אימונים במקביל.")}finally{setIsStarting(false)}};
  if(saved){
    // Assembled here because only this scope holds both the programme's
    // prescriptions and each exercise's history.
    const reportExercises:ReportExercise[]=saved.exerciseResults.map((entry)=>{
      const performed=entry.performedExerciseId??entry.exerciseId;
      const prescription=ordered.find((item)=>item.id===entry.workoutExerciseId);
      const restSeconds=workoutRestSeconds(prescription?.rest);
      // The session just saved is the newest one in the snapshot's history, so
      // "previous" is the one before it.
      const history=exercisePerformance(snapshot.completedWorkouts,currentClientId,performed).sessions
        .filter((session)=>session.workoutId!==saved.id);
      return{
        name:getExercise(performed)?.name??"תרגיל",
        restSeconds,
        sets:entry.sets,
        previousSets:history[0]?.sets??[],
        skipped:entry.skipped,
        completed:entry.completed,
        difficulty:entry.difficulty,
      };
    });
    return <Finished workout={saved} insights={buildWorkoutReport({
      durationSeconds:saved.durationSeconds,
      exercises:reportExercises,
      sleepHours:saved.sleepHours,
      perceivedDifficulty:saved.perceivedDifficulty,
    })}/>;
  }
  if(!session)return <Start program={program.name} day={day.name} count={ordered.length} warning={warning} onStart={begin} starting={isStarting} programId={programId}/>;

  const current=ordered[Math.min(session.currentExerciseIndex,ordered.length-1)];const result=session.exerciseResults.find((item)=>item.workoutExerciseId===current?.id);if(!current||!result)return <main className="client-app-content"><StateBlock title="אין תרגילים זמינים באימון זה" description="מקור התוכנית אינו כולל תרגילים ליום הזה."/></main>;const difficulty=session.perceivedDifficulty??3;const energy=session.energy??3;const sleepHours=session.sleepHours;
  // What is on screen is what is being done. The prescribed exercise is still
  // recorded and is named below when the two differ.
  const performedId=result.performedExerciseId??result.exerciseId;
  const exercise=getExercise(performedId);const prescribed=getExercise(result.exerciseId);
  const dynamicWarmup=exercise?.id==="exercise-155pu7s"||exercise?.primaryMuscleGroup==="חימום";
  const timed=/שניות/.test(current.reps??"");
  const comparableWorkouts=snapshot.completedWorkouts.filter((workout)=>workout.programId===programId&&workout.dayId===dayId);
  const performance=exercisePerformance(comparableWorkouts,currentClientId,performedId);const previous=performance.sessions[0];// The best set that is comparable to today's work, not the heaviest weight ever
  // moved on the exercise: a 12-rep back-off set is not a benchmark for a 10-rep
  // working set, and offering it as one is how a client ends up chasing a number
  // from a different job.
  const repTarget=targetRepetitions(current.reps);
  const best=bestComparableSet(performance.sessions,repTarget);
  // What to load before the working sets, worked out from what was actually
  // lifted last time. No previous session means no honest percentage of anything.
  // Flexion and extension may both be filed under "legs", but they load
  // opposing muscles and each needs its own preparation. Base the decision on
  // the exercise itself, not on whether another exercise shares its broad
  // catalogue group. Bodyweight abdominal work is the explicit exception.
  const abdominalExercise=exercise?.primaryMuscleGroup==="בטן"||exercise?.primaryMuscleGroup==="שרירי ליבה";
  const professional=isProfessionalProgram(program);
  const group=preparationGroup(exercise?movementPattern(exercise):undefined,exercise?.primaryMuscleGroup);
  const earlierGroups=ordered.slice(0,session.currentExerciseIndex).map(entry=>{const e=getExercise(session.exerciseResults.find(r=>r.workoutExerciseId===entry.id)?.performedExerciseId??entry.exerciseId);return preparationGroup(e?movementPattern(e):undefined,e?.primaryMuscleGroup);});
  const needsPreparation=isFirstExerciseForMuscle(group,earlierGroups);
  const chosenLoad=Math.max(0,...result.sets.map(s=>s.weightKg??0))||workingWeightFrom(performance.sessions);
  const warmup=needsPreparation&&!abdominalExercise&&!dynamicWarmup?planWarmup(chosenLoad,{effort:current.effort,compound:isCompoundLift(exercise?.name),repetitions:repTarget,professional}):null;
  const priorEntries=performance.sessions.slice(0,2).map(history=>comparableWorkouts.find(w=>w.id===history.workoutId)?.exerciseResults.find(e=>(e.performedExerciseId??e.exerciseId)===performedId));
  const sameLoad=priorEntries.length===2&&priorEntries[0]?.sets.every((s,i)=>s.weightKg===priorEntries[1]?.sets[i]?.weightKg);
  const successfulExposures=repTarget!==undefined&&sameLoad&&priorEntries.every(e=>e?.difficulty==="easy"&&e.sets.length===setCount(current.sets)&&e.sets.every(s=>s.completed&&(s.repetitions??0)>=repTarget))?2:0;
  const challenge=!timed&&previous?nextWorkoutChallenge({sets:previous.sets,targetReps:repTarget,rpe:Number.parseFloat(current.effort?.match(/\d+(?:\.\d+)?/)?.[0]??"8"),difficulty:professional?priorEntries[0]?.difficulty:result.difficulty,exerciseName:exercise?.name,equipment:exercise?.equipment,professional,successfulExposures}):null;
  const completedExercises=session.exerciseResults.filter((item)=>item.completed).length;const skipped=session.exerciseResults.filter((item)=>item.skipped).length;const completedSets=session.exerciseResults.filter((item)=>item.completed).flatMap((item)=>item.sets).filter((item)=>item.completed).length;const totalSets=session.exerciseResults.flatMap((item)=>item.sets).length;const elapsed=Math.max(0,Math.floor((now-new Date(session.startedAt).getTime())/1000));const rest=Math.max(0,Math.ceil(((session.restEndsAt?new Date(session.restEndsAt).getTime():0)-now)/1000));
  const persist=(patch:Partial<ActiveWorkoutSession>)=>saveSession({...session,...patch});
  // A replacement has to train the same thing, so the list is the catalogue
  // filtered to the prescribed exercise's primary muscle group. Both fields are
  // already classified, so no new data is needed for this.
  const swapPreferences=snapshot.workoutPreferences.find(p=>p.clientId===currentClientId);
  const swapOptions=swapPreferences?alternativeExercises(prescribed,snapshot.exercises,swapPreferences).filter(item=>item.id!==performedId):[];
  const replaceResult=(next:ActiveExerciseResult,extra:Partial<ActiveWorkoutSession>={})=>persist({...extra,exerciseResults:session.exerciseResults.map((item)=>item.workoutExerciseId===next.workoutExerciseId?next:item)});
  const swapLocked=result.completed||result.sets.some(set=>set.completed);
  const changePerformed=(id:string)=>{if(swapLocked){setWarning("כבר נרשמו סטים בתרגיל זה. שומרים את הביצוע; החלפה תתבצע לפני התחלת התרגיל באימון הבא.");return;}replaceResult(substituteExercise(result,id),{restEndsAt:undefined});setSwapping(false);};
  const updateSet=(set:ExerciseSetResult,patch:Partial<ExerciseSetResult>)=>{const nextSet={...set,...patch};if(nextSet.completed&&nextSet.repetitions===undefined)nextSet.repetitions=targetReps(set.order);const nextResult={...result,sets:result.sets.map((item)=>item.id===set.id?nextSet:item)};const restSeconds=patch.completed?workoutRestSeconds(current.rest):null;replaceResult(nextResult,restSeconds?{restEndsAt:new Date(Date.now()+restSeconds*1000).toISOString()}:{});};
  // Marking an exercise done used to leave the client staring at the exercise
  // they had just finished, with nothing saying what to do next; the only way on
  // was the arrow in the footer. Completing it now carries them to the next
  // exercise that still needs doing.
  //
  // A set with no rep count is also completed here, and an empty rep field takes
  // the prescribed target. Reps were only ever a grey placeholder, so a client
  // who logged weights and pressed on produced a workout whose every set read
  // "— reps, volume 0" - and volume is weight times reps.
  const targetReps=(index:number)=>{
    const prescribed=current.setPrescriptions?.[index]?.repetitions??current.reps;
    const parsed=Number.parseInt(String(prescribed??""),10);
    return Number.isFinite(parsed)&&parsed>0?parsed:undefined;
  };
  const completeExercise=()=>{
    const now=new Date().toISOString();
    const nextResult={...result,completed:true,skipped:false,
      sets:result.sets.map((set,index)=>({...set,completed:true,completedAt:set.completedAt??now,repetitions:set.repetitions??targetReps(index)}))};
    // Forward first, then wrap. findIndex scans from zero, so finishing exercise
    // four sent the client back to exercise one - "next" pointing backwards in a
    // workout that is read in order. Anything left behind is still picked up,
    // just after everything ahead has been offered.
    const unfinished=(entry:typeof ordered[number],index:number)=>{
      if(index===session.currentExerciseIndex)return false;
      const entryResult=session.exerciseResults.find((item)=>item.workoutExerciseId===entry.id);
      return Boolean(entryResult&&!entryResult.completed&&!entryResult.skipped);
    };
    const ahead=ordered.findIndex((entry,index)=>index>session.currentExerciseIndex&&unfinished(entry,index));
    const remaining=ahead>=0?ahead:ordered.findIndex(unfinished);
    replaceResult(nextResult,remaining>=0?{currentExerciseIndex:remaining}:{});
    if(remaining<0)setWarning("זה היה התרגיל האחרון שנותר. אפשר לסיים את האימון.");
  };

  const finish=()=>{
    if(session.exerciseResults.some((item)=>!item.completed&&!item.skipped)&&!confirmedPartial){
      setConfirmedPartial(true);
      setWarning("נותרו תרגילים שלא הושלמו. לחיצה נוספת תשמור אותם כחלקיים.");
      return;
    }
    setWarning("");setSummary(true);
  };
  const complete=async()=>{if(isCompleting)return;setIsCompleting(true);try{const completedAt=new Date().toISOString();const workout:CompletedWorkout={id:`workout-${session.id}`,clientId:session.clientId,assignmentId:session.assignmentId,programId,dayId,startedAt:session.startedAt,completedAt,durationSeconds:Math.max(1,Math.floor((Date.now()-new Date(session.startedAt).getTime())/1000)),exerciseResults:session.exerciseResults,workoutNote:session.workoutNote?.trim()||undefined,perceivedDifficulty:difficulty,energy,sleepHours,totalVolume:workoutVolume(session.exerciseResults)};if(await completeSession(workout)){track("workout_completed",{durationSeconds:workout.durationSeconds,sets:completedSets,skipped,difficulty,energy,sleepHours:sleepHours??null});setSaved(workout)}else setWarning("האימון לא נשמר ב-Supabase. יש לנסות שוב.")}finally{setIsCompleting(false)}};
  const exitWithoutSaving=async()=>{if(isAbandoning)return;setIsAbandoning(true);try{if(await cancelSession(currentClientId)){setAbandon(false);router.replace("/workouts");router.refresh()}else{setAbandon(false);setWarning("לא הצלחנו למחוק את האימון הפעיל. נסה שוב.")}}finally{setIsAbandoning(false)}};
  if(summary)return <CompletionForm elapsed={elapsed} exercises={`${completedExercises}/${ordered.length}`} sets={`${completedSets}/${totalSets}`} skipped={skipped} volume={workoutVolume(session.exerciseResults)} note={session.workoutNote??""} setNote={(workoutNote)=>persist({workoutNote})} difficulty={difficulty} setDifficulty={(perceivedDifficulty)=>persist({perceivedDifficulty})} energy={energy} setEnergy={(nextEnergy)=>persist({energy:nextEnergy})} sleepHours={sleepHours} warning={warning||persistenceError} onSave={complete} saving={isCompleting} onBack={()=>setSummary(false)} onExit={()=>{setSummary(false);setAbandon(true)}}/>;

  return <main className="client-app-content">
    {/* Where you are in the workout follows you down the page - on a phone the
        header scrolls away exactly when the set count starts to matter. */}
    <div className="session-sticky">
      <div className="session-sticky__meta">
        <div className="min-w-0">
          <span>{program.name}</span>
          <strong className="block truncate">{day.name}</strong>
        </div>
        <div className="text-end" role="timer" aria-label="טיימר אימון">
          <span className="block">טיימר אימון</span>
          <strong className="block font-mono text-lg">{clock(elapsed)}</strong>
          <span className="block">{completedSets}/{totalSets} סטים</span>
        </div>
      </div>
      <div className="premium-progress">
        <div className="premium-progress__track" role="progressbar" aria-label="התקדמות באימון" aria-valuemin={0} aria-valuemax={100} aria-valuenow={workoutCompletionPercent(totalSets,completedSets)}>
          <span style={{width:`${workoutCompletionPercent(totalSets,completedSets)}%`}}/>
        </div>
      </div>
    </div>

    {/* One exercise at a time. Everything else is a step away, not a scroll away. */}
    <article className="premium-card session-exercise mt-3">
      <header className="session-exercise__head">
        <ExerciseThumbnail exercise={exercise}/>
        <div className="min-w-0 flex-1">
          <span className="session-exercise__count">תרגיל {session.currentExerciseIndex+1} מתוך {ordered.length}</span>
          <h1 className="session-exercise__name" title={exercise?.name}>{exercise?.name??"פרטי תרגיל חסרים"}</h1>
          {result.completed&&<span role="status" className="mt-1 flex items-center justify-center gap-1.5 text-sm font-black text-[#15803D]"><CheckCircle2 aria-hidden="true" size={20} strokeWidth={2.5}/>הושלם</span>}
          {result.performedExerciseId&&prescribed&&<p className="text-xs text-[#5B5F5B]">במקום {prescribed.name} · המאמן יראה את ההחלפה</p>}
        </div>
      </header>

      {/* Muscle group, kit, and the three things you might want mid-set - all
          chips on one wrapping row instead of a column beside the name. */}
      <div className="chip-row session-exercise__chips">
        <span className="pill pill--green">{exercise?.primaryMuscleGroup??"קבוצת שריר לא סווגה"}</span>
        {exercise?.equipment&&<span className="pill">{exercise.equipment}</span>}
        <div className="contents">
        {/* A missing link never blocks the set - it is stated and the workout
            carries on. */}
        {exercise?.video
          ?<a href={exercise.video.url} target="_blank" rel="noreferrer" className="chip">סרטון הסבר טכניקה<ExternalLink aria-hidden="true" size={14}/></a>
          :<span className="pill">אין סרטון</span>}
        <ExerciseGuidanceButton exercise={exercise}/>
        {exercise&&<TechniqueVideoButton exerciseId={exercise.id} exerciseName={exercise.name}/>}
        {/* Not the same as skipping. Skipping records that nothing was done;
            this records that the same muscle was trained on something else,
            which is what actually happened when the rack was busy. */}
        <button type="button" onClick={()=>setSwapping(true)} className="chip"><Repeat2 aria-hidden="true" size={14}/>החלפת תרגיל</button>
        </div>
      </div>

      {!dynamicWarmup&&<dl className="session-stats">
        <Stat label="סטים" value={current.sets??"לא הוגדר"}/>
        <Stat label={timed?"זמן לסט":"חזרות"} value={current.reps??"לא הוגדר"}/>
        <Stat label="מנוחה" value={current.rest??"לא הוגדר"}/>
        <Stat label="רמת מאמץ" value={current.effort?`RPE ${current.effort}`:"לא הוגדר"}/>
      </dl>}

      {(current.notes||exercise?.executionNotes)&&<p className="mt-3 rounded-2xl bg-[#F7F8F7] p-3 text-sm text-[#5B5F5B]">{current.notes||exercise?.executionNotes}</p>}

      {!dynamicWarmup&&!timed&&<PreviousPerformance previous={previous} best={best} targetReps={repTarget} recent={performance.sessions.slice(0,3)}/>}
      {!dynamicWarmup&&!timed&&challenge&&<section className="workout-challenge mt-3"><span>האתגר באימון היום</span><strong>{challenge.weightKg} ק״ג × {repTarget??"לפי התוכנית"}</strong><small>{challenge.reason}</small></section>}

      {/* Some rows in the source workbooks carry no sets - a dynamic warm-up, for
          instance. Rendering an empty table header for those left the client with
          a column heading and nothing to fill in. */}
      {result.sets.length||warmup?
        <section className="mt-4" aria-label="רישום סטים">
          {warmup?<>
            <div className="mb-1 mt-2 flex items-center justify-between gap-3 text-sm font-black">
              <span>סטי חימום</span><span className="text-xs font-normal text-[#5B5F5B]">לא נספרים בנפח האימון</span>
            </div>
            <div className="set-row text-xs font-bold text-[#5B5F5B]" aria-hidden="true">
              <span/><span>משקל (ק״ג)</span><span>חזרות</span><span/>
            </div>
            {warmup.sets.map((set)=><WarmupSetEditor key={`${current.id}-${set.percent}`} set={set} completed={result.warmupCompletedPercents?.includes(set.percent)??false} onToggle={()=>{
              const completedWarmups=result.warmupCompletedPercents??[];
              const isCompleted=completedWarmups.includes(set.percent);
              replaceResult(
                {...result,warmupCompletedPercents:isCompleted?completedWarmups.filter((percent)=>percent!==set.percent):[...completedWarmups,set.percent]},
                isCompleted?{}:{restEndsAt:new Date(Date.now()+60_000).toISOString()},
              );
            }}/>) }
            <div className="mb-1 mt-4 text-sm font-black">סטים עובדים</div>
          </>:null}
          <div className="set-row text-xs font-bold text-[#5B5F5B]" aria-hidden="true">
            <span/><span>{timed?"":"משקל (ק״ג)"}</span><span>{timed?"שניות":"חזרות"}</span><span/>
          </div>
          {result.sets.map((set,index)=>
            <SetEditor key={set.id} set={set} index={index} target={current.setPrescriptions?.[index]?.repetitions??current.reps} onUpdate={(patch)=>updateSet(set,patch)}/>
          )}
        </section>
        :dynamicWarmup
          ?<p className="mt-4 rounded-2xl border border-dashed border-[#16A34A]/40 bg-[#ECFDF3] p-4 text-center text-sm text-[#15803D]">צפו בסרטון, בצעו את החימום הדינאמי וסמנו שבוצע.</p>
          :<p className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] p-4 text-center text-sm text-[#5B5F5B]">לא הוגדרו סטים לתרגיל הזה במקור. אפשר לסמן אותו כהושלם ולהמשיך.</p>}

      {/* The rest countdown belongs where the thumb already is. At the top of the
          page it scrolled out of sight the moment a set was logged, which is the
          moment it starts. */}
      {rest>0&&<RestTimer seconds={rest} onAdd={()=>persist({restEndsAt:new Date(Date.now()+(rest+30)*1000).toISOString()})} onSkip={()=>persist({restEndsAt:undefined})}/>}

      {dynamicWarmup?<button onClick={completeExercise} disabled={result.completed} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 py-2 text-sm font-black text-white disabled:bg-[#ECFDF3] disabled:text-[#15803D]">{result.completed?<><CheckCircle2 aria-hidden="true" size={18}/>החימום הושלם</>:"סימון שבוצע חימום"}</button>:<><div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={()=>replaceResult({...result,skipped:!result.skipped,completed:false})} className="min-h-10 rounded-xl border border-[#D7DAD7] bg-white px-3 py-2 text-sm font-black">{result.skipped?"החזרת התרגיל":"דילוג"}</button>
        <button onClick={completeExercise} disabled={result.completed} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-3 py-2 text-sm font-black text-white disabled:bg-[#ECFDF3] disabled:text-[#15803D]">{result.completed?<><CheckCircle2 aria-hidden="true" size={18}/>הושלם</>:"השלמה"}</button>
      </div></>}
      {!dynamicWarmup&&<div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="איך הרגיש התרגיל">
        <button type="button" aria-pressed={result.difficulty==="easy"} onClick={()=>replaceResult({...result,difficulty:result.difficulty==="easy"?undefined:"easy"})} className={`min-h-10 rounded-xl border px-2 py-2 text-sm font-black ${result.difficulty==="easy"?"border-[#16A34A] bg-[#ECFDF3] text-[#15803D]":"border-[#D7DAD7] bg-white"}`}>קל</button>
        <button type="button" aria-pressed={result.difficulty==="medium"} onClick={()=>replaceResult({...result,difficulty:result.difficulty==="medium"?undefined:"medium"})} className={`min-h-10 rounded-xl border px-2 py-2 text-sm font-black ${result.difficulty==="medium"?"border-[#D97706] bg-[#FFFBEB] text-[#B45309]":"border-[#D7DAD7] bg-white"}`}>בינוני</button>
        <button type="button" aria-pressed={result.difficulty==="hard"} onClick={()=>replaceResult({...result,difficulty:result.difficulty==="hard"?undefined:"hard"})} className={`min-h-10 rounded-xl border px-2 py-2 text-sm font-black ${result.difficulty==="hard"?"border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]":"border-[#D7DAD7] bg-white"}`}>קשה</button>
      </div>}
      <Link href={`/workouts/exercises/${result.exerciseId}?programId=${programId}&dayId=${dayId}`} className="mt-3 flex items-center justify-center text-sm text-[#5B5F5B]">כל היסטוריית התרגיל</Link>
    </article>

    {(warning||persistenceError)&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning||persistenceError}</p>}
    {/* Not an error: the sets are recorded, they are just still on the phone. */}
    {pendingSync&&!warning&&<p role="status" className="mt-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm text-[#5B5F5B]">הסטים נשמרו במכשיר. הסנכרון יושלם כשהחיבור יחזור.</p>}

    {/* One footer, in the order the workout is actually used: move between
        exercises first, and finish last. "סיום אימון" used to sit above the
        arrows, which put the end of the workout under the thumb throughout it. */}
    <div className="session-footer">
      <nav className="session-actions" aria-label="מעבר בין תרגילים">
        <button disabled={session.currentExerciseIndex===0} onClick={()=>persist({currentExerciseIndex:session.currentExerciseIndex-1})} className="premium-secondary-button"><ChevronRight aria-hidden="true" size={17}/>הקודם</button>
        <button disabled={session.currentExerciseIndex===ordered.length-1} onClick={()=>persist({currentExerciseIndex:session.currentExerciseIndex+1})} className="premium-secondary-button">הבא<ChevronLeft aria-hidden="true" size={17}/></button>
      </nav>
      <button onClick={finish} className="premium-primary-button mt-3 w-full">סיום אימון</button>
      <button onClick={()=>setAbandon(true)} className="mt-2 flex w-full items-center justify-center gap-2 text-sm text-[#5B5F5B]"><X aria-hidden="true" size={16}/>יציאה ללא שמירה</button>
    </div>

    {/* The choice used to be "finish" or "delete everything". A client who did
        half a workout before the gym closed had to pick between a false record
        and losing the half they did. Keeping it is now the first option, and the
        destructive one is last and still says exactly what it destroys. */}
    <BottomSheet open={swapping} placement="top" title="במה החלפת?" onClose={()=>setSwapping(false)}>
      <p className="text-sm text-[#5B5F5B]">
        {prescribed?.primaryMuscleGroup
          ?`תרגילים שמאמנים ${prescribed.primaryMuscleGroup}, כמו ${prescribed.name}.`
          :"התרגיל המקורי לא מסווג לקבוצת שריר, ולכן אין הצעות אוטומטיות."}
      </p>
      <div className="mt-3 grid gap-1">
        {result.performedExerciseId&&
          <button type="button" disabled={swapLocked} onClick={()=>changePerformed(result.exerciseId)} className="chip w-fit">
            חזרה ל{prescribed?.name??"תרגיל המקורי"}
          </button>}
        {swapOptions.map((option)=>
          <button key={option.id} type="button" disabled={swapLocked} onClick={()=>changePerformed(option.id)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7E5] px-3 text-start">
            <span className="font-bold">{option.name}</span>
            {option.equipment&&<span className="text-xs text-[#5B5F5B]">{option.equipment}</span>}
          </button>)}
        {!swapOptions.length&&<p className="rounded-2xl border border-dashed border-[#E5E7E5] p-4 text-center text-sm text-[#5B5F5B]">לא נמצאו תרגילים חלופיים לקבוצת השריר הזו.</p>}
        {swapLocked&&<p role="status" className="mt-3 text-sm">כבר נרשמו סטים; לא מחליפים תרגיל באמצע הביצוע כדי לשמור משקלים והיסטוריה נכונים.</p>}
      </div>
    </BottomSheet>

    <BottomSheet open={abandon} title="לצאת מהאימון?" onClose={()=>setAbandon(false)}>
      <p className="text-sm text-[#5B5F5B]">{completedSets} מתוך {totalSets} סטים נרשמו עד עכשיו.</p>
      <div className="sheet__actions">
        <button onClick={()=>{setAbandon(false);setSummary(true)}} disabled={isAbandoning} className="premium-primary-button">שמירת מה שבוצע וסיום</button>
        <button onClick={()=>setAbandon(false)} disabled={isAbandoning} className="premium-secondary-button">חזרה לאימון</button>
        <button onClick={exitWithoutSaving} disabled={isAbandoning} className="mt-1 flex w-full items-center justify-center gap-2 text-sm text-[#DC2626]">{isAbandoning?"יוצאים…":"יציאה ללא שמירה ומחיקת כל הסטים"}</button>
      </div>
    </BottomSheet>
  </main>;
}

// Sleep is synced from the health store here; energy remains the one subjective
// pre-workout answer. Missing health data never blocks starting a workout.
function Start({program,day,count,warning,onStart,starting,programId}:{program:string;day:string;count:number;warning:string;onStart:(sleepHours?:number,energy?:1|2|3|4|5)=>void|Promise<void>;starting:boolean;programId:string}){
  const repository=useMemo(()=>createHealthRepository(),[]);
  const[sleepHours,setSleepHours]=useState<number|undefined>();
  const[sleepLoading,setSleepLoading]=useState(true);
  const[energy,setEnergy]=useState<1|2|3|4|5>(3);
  const syncInFlight=useRef(false);
  const syncSleep=useCallback(async()=>{
    if(syncInFlight.current)return;
    syncInFlight.current=true;setSleepLoading(true);
    try{
      const today=calendarDay();const range=syncWindow(today);let snapshot=await repository.load(range.fromDay);
      // Paint the last persisted reading immediately. The native bridge can be
      // registered after React mounts, so its later ready event refreshes this
      // value instead of leaving the workout with the first empty result.
      setSleepHours(latestSleepHours(snapshot.sleep,today));
      const provider=resolveHealthProvider();
      if(await provider.isAvailable()&&await provider.getPermission()==="granted"){
        const incoming=await provider.readDailySleep(range.fromDay,range.toDay);
        const changed=sleepToPersist(incoming,snapshot.sleep,today);
        if(changed.length){await repository.recordSleep(changed);snapshot=await repository.load(range.fromDay);}
        setSleepHours(latestSleepHours(snapshot.sleep,today));
      }
    }catch{}finally{syncInFlight.current=false;setSleepLoading(false)}
  },[repository]);
  useEffect(()=>{
    const ready=()=>void syncSleep();
    window.addEventListener("start:health-ready",ready);
    const initialSync=window.setTimeout(ready,0);
    return()=>{window.clearTimeout(initialSync);window.removeEventListener("start:health-ready",ready)};
  },[syncSleep]);
  return <main className="client-app-content grid min-h-[70vh] place-items-center">
    <section className="premium-card w-full max-w-lg">
      <span className="state-block__icon mx-auto"><Play aria-hidden="true" size={22}/></span>
      <p className="mt-4 text-center text-xs font-bold text-[#16A34A]">{program}</p>
      <h1 className="mt-2 text-center text-3xl font-black">{day}</h1>
      <p className="mt-3 text-center text-sm text-[#5B5F5B]">{count} תרגילים לפי סדר המקור. ההתקדמות נשמרת אוטומטית.</p>

      <div className="mt-6 rounded-2xl bg-[#F7F8F7] p-4 text-sm"><strong className="block">שעות השינה האחרונות</strong><span className="mt-1 block text-[#5B5F5B]">{sleepLoading?"טוענים מנתוני השינה…":sleepHours!==undefined?`${sleepHours} שעות · נקלט אוטומטית מנתוני הבריאות`:"לא נמצאו נתוני שינה מסונכרנים"}</span></div>
      <Rating label="איך רמת האנרגיה שלך עכשיו?" value={energy} onChange={setEnergy}/>

      {warning&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning}</p>}
      <button onClick={()=>onStart(sleepHours,energy)} disabled={!count||starting} className="premium-primary-button mt-6 w-full">{starting?"מתחילים…":"התחלת אימון"}</button>
      <Link href={`/workouts/program/${programId}`} className="premium-secondary-button mt-3 w-full">חזרה לתוכנית</Link>
    </section>
  </main>;
}

function PreviousPerformance({previous,best,targetReps,recent}:{previous?:{date:string;sets:readonly ExerciseSetResult[];volume:number};best:{weightKg:number;repetitions:number}|null;targetReps?:number;recent:readonly {workoutId:string;date:string;sets:readonly ExerciseSetResult[];volume:number}[]}){
  return <details className="disclosure mt-4">
    {/* The record says what it is a record of. "שיא 60 ק״ג" on its own was being
        read off a 12-rep set while the client worked at 10, which is a different
        effort and a discouraging comparison. */}
    <summary>ביצוע קודם{best?<span className="pill pill--green">שיא {best.weightKg} ק״ג × {best.repetitions}</span>:null}</summary>
    <div className="disclosure__body">
      {best?<p className="text-xs text-[#5B5F5B]">השיא מוצג לטווח של {targetReps??best.repetitions} חזרות, כדי שההשוואה תהיה לאותו סוג סט.</p>:null}
      {previous?<>
        <p className="mt-2 text-xs text-[#5B5F5B]">{new Date(previous.date).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</p>
        <p className="mt-2 text-sm">{previous.sets.map((set)=>`${set.weightKg??0} ק״ג × ${set.repetitions??0}`).join(" · ")}</p>
        {recent.length>1&&recent.map((item)=><p key={item.workoutId} className="mt-2 text-xs text-[#5B5F5B]">{new Date(item.date).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})} · נפח {item.volume}</p>)}
      </>:<p className="text-sm text-[#5B5F5B]">זהו הביצוע הראשון שנרשם לתרגיל.</p>}
    </div>
  </details>;
}

// What to load before the working sets. Percentages of the weight the client
// actually lifted last time, so the first set is not a guess and not the working
// weight itself.
function WarmupSetEditor({set,completed,onToggle}:{set:{percent:number;weightKg:number;repetitions:number};completed:boolean;onToggle:()=>void}){
  const [weight,setWeight]=useState(String(set.weightKg));
  const [repetitions,setRepetitions]=useState(String(set.repetitions));
  return <div className="set-row" data-done={completed||undefined}>
    <span className="set-row__index text-[10px]" aria-label={`חימום ${set.percent}%`}>{set.percent}%</span>
    <input aria-label={`משקל בחימום ${set.percent}% (ק״ג)`} className="nutrition-input" type="number" min="0" step="0.1" value={weight} onChange={(event)=>setWeight(event.target.value)}/>
    <input aria-label={`חזרות בחימום ${set.percent}%`} className="nutrition-input" type="number" min="1" step="1" value={repetitions} onChange={(event)=>setRepetitions(event.target.value)}/>
    <button type="button" aria-label={completed?`ביטול השלמת חימום ${set.percent}%`:`השלמת חימום ${set.percent}%`} aria-pressed={completed} onClick={onToggle} className={`grid size-11 place-items-center rounded-full ${completed?"border border-[#16A34A] text-[#16A34A]":"bg-[#16A34A] text-white"}`}>{completed?<RotateCcw aria-hidden="true" size={17}/>:<CheckCircle2 aria-hidden="true" size={18}/>}</button>
  </div>;
}

// One row per set: number, weight, reps, done. Everything a client touches
// mid-set is on the same line and at least a fingertip wide.
function SetEditor({set,index,target,onUpdate}:{set:ExerciseSetResult;index:number;target?:string;onUpdate:(patch:Partial<ExerciseSetResult>)=>void}){
  const timed=/שניות/.test(target??"");
  return <div className="set-row" data-done={set.completed||undefined}>
    <span className="set-row__index" aria-hidden="true">{index+1}</span>
    {timed?<span/>:<input aria-label={`משקל בסט ${index+1} (ק״ג)`} className="nutrition-input" type="number" min="0" step="0.1" value={set.weightKg??""} onChange={(event)=>onUpdate({weightKg:event.target.value===""?undefined:Number(event.target.value)})}/>}
    <input aria-label={`${timed?"שניות":"חזרות"} בסט ${index+1}, יעד ${target??"—"}`} className="nutrition-input" type="number" min="0" step="1" placeholder={timed?String(Number.parseInt(target??"",10)):target??""} value={set.repetitions??""} onChange={(event)=>onUpdate({repetitions:event.target.value===""?undefined:Number(event.target.value),...(timed?{weightKg:undefined,notes:"זמן בשניות"}:{})})}/>
    <button
      aria-label={set.completed?`ביטול השלמת סט ${index+1}`:`השלמת סט ${index+1}`}
      aria-pressed={set.completed}
      onClick={()=>onUpdate({completed:!set.completed,completedAt:!set.completed?new Date().toISOString():undefined})}
      className={`grid size-11 place-items-center rounded-full ${set.completed?"border border-[#16A34A] text-[#16A34A]":"bg-[#16A34A] text-[#FFFFFF]"}`}
    >{set.completed?<RotateCcw aria-hidden="true" size={17}/>:<CheckCircle2 aria-hidden="true" size={18}/>}</button>
  </div>;
}

function RestTimer({seconds,onAdd,onSkip}:{seconds:number;onAdd:()=>void;onSkip:()=>void}){
  return <section role="timer" aria-label="מנוחה" className="rest-timer">
    <div>
      <span>מנוחה</span>
      <strong>{clock(seconds)}</strong>
    </div>
    <div className="rest-timer__actions">
      <button onClick={onAdd}>+30 שנ׳</button>
      <button onClick={onSkip} data-primary="true">דלג</button>
    </div>
  </section>;
}

function CompletionForm({elapsed,exercises,sets,skipped,volume,note,setNote,difficulty,setDifficulty,energy,setEnergy,sleepHours,warning,onSave,saving,onBack,onExit}:{elapsed:number;exercises:string;sets:string;skipped:number;volume:number;note:string;setNote:(value:string)=>void;difficulty:1|2|3|4|5;setDifficulty:(value:1|2|3|4|5)=>void;energy:1|2|3|4|5;setEnergy:(value:1|2|3|4|5)=>void;sleepHours?:number;warning:string;onSave:()=>void|Promise<void>;saving:boolean;onBack:()=>void;onExit:()=>void}){
  // The note is typed locally and saved when the field is left.
  //
  // It used to be controlled straight off the session: every keystroke wrote to
  // Supabase, the snapshot came back, the whole form re-rendered - and the form
  // also re-renders once a second for the clock above. Typing a sentence in it
  // meant the caret jumping and the page scrolling out from under the thumb
  // after almost every letter. Nothing here needs to be saved per character; it
  // needs to be saved before the workout is.
  // Seeded once, on purpose. This form is mounted only when the client opens the
  // summary, by which point the session - and any note already on it - has
  // loaded, and leaving the summary unmounts it. There is no moment where the
  // note can change underneath a client who is typing into it.
  const [draft, setDraft] = useState(note);
  const flush = () => { if (draft !== note) setNote(draft); };

  return <main className="client-app-content">
    <header className="premium-page-header"><div><p>סיום אימון</p><h1>סיכום לפני שמירה</h1></div></header>
    <dl className="dashboard-metrics">
      <Value label="משך" value={clock(elapsed)}/>
      <Value label="תרגילים" value={exercises}/>
      <Value label="סטים" value={sets}/>
      <Value label="נפח" value={`${volume} ק״ג`}/>
      <Value label="דולגו" value={String(skipped)}/>
    </dl>
    <section className="premium-card mt-4">
      <label className="block text-sm font-bold">הערת אימון<textarea className="nutrition-input mt-2 min-h-24" value={draft} onChange={(event)=>setDraft(event.target.value)} onBlur={flush}/></label>
      {/* Sleep stays a health-store measurement rather than a second manual
          answer. Energy remains the subjective pre-workout value. */}
      <p className="mt-4 text-sm"><strong>שעות שינה: </strong>{sleepHours!==undefined?`${sleepHours} שעות (מנתוני הבריאות)`:"לא נמצאו נתונים מסונכרנים"}</p>
      <Rating label="קושי מורגש באימון" value={difficulty} onChange={setDifficulty}/>
      <Rating label="רמת אנרגיה (נרשם לפני האימון)" value={energy} onChange={setEnergy}/>
    </section>
    {warning&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning}</p>}
    <div className="session-actions session-actions--stack mt-5">
      {/* Flushed here as well as on blur: a tap on this button blurs the field
          first on every browser that matters, but "almost always" is not a good
          enough reason to lose somebody's last sentence. */}
      <button onClick={()=>{flush();void onSave()}} disabled={saving} className="premium-primary-button">{saving?"שומרים…":"שמירת האימון"}</button>
      <button onClick={onBack} disabled={saving} className="premium-secondary-button">חזרה לאימון</button>
      <button onClick={onExit} disabled={saving} className="flex min-h-11 items-center justify-center gap-2 text-sm font-bold text-[#DC2626]"><X aria-hidden="true" size={16}/>יציאה ללא שמירה</button>
    </div>
  </main>;
}

function Finished({workout,insights}:{workout:CompletedWorkout;insights:readonly {tone:"praise"|"action"|"note";title:string;detail:string}[]}){
  const exercises=workout.exerciseResults.filter((item)=>item.completed).length;
  const sets=workout.exerciseResults.filter((item)=>item.completed).flatMap((item)=>item.sets).filter((item)=>item.completed).length;
  const skipped=workout.exerciseResults.filter((item)=>item.skipped).length;
  return <main className="client-app-content">
    <StateBlock tone="success" icon={<CheckCircle2 aria-hidden="true" size={22}/>} title="האימון נשמר" description="הנתונים נשמרו ויופיעו בהיסטוריה ובהתקדמות."/>
    <WorkoutPreserveImprove insights={insights}/>
    <dl className="dashboard-metrics mt-4">
      <Value label="משך" value={clock(workout.durationSeconds)}/>
      <Value label="תרגילים" value={String(exercises)}/>
      <Value label="סטים" value={String(sets)}/>
      <Value label="נפח" value={`${workout.totalVolume} ק״ג`}/>
      <Value label="דולגו" value={String(skipped)}/>
    </dl>
    <div className="mt-5 grid gap-3">
      <Link href="/workouts" className="premium-primary-button">בית האימונים</Link>
      <Link href={`/workouts/history/${workout.id}`} className="premium-secondary-button">פרטי האימון</Link>
    </div>
  </main>;
}

function Value({label,value}:{label:string;value:string}){return <div className="metric-tile"><dt className="metric-tile__head"><span>{label}</span></dt><dd><strong>{value}</strong></dd></div>}
// The in-session row is four figures on one line of a phone, so it carries no
// tile chrome at all - the chrome was most of what made it too tall.
function Stat({label,value}:{label:string;value:string}){return <div><dt>{label}</dt><dd>{value}</dd></div>}
function Rating({label,value,onChange}:{label:string;value:1|2|3|4|5;onChange:(value:1|2|3|4|5)=>void}){return <fieldset className="mt-5"><legend className="text-sm font-bold">{label}</legend><div className="mt-2 grid grid-cols-5 gap-2">{([1,2,3,4,5] as const).map((item)=><button type="button" key={item} onClick={()=>onChange(item)} aria-pressed={value===item} className={`min-h-11 rounded-xl ${value===item?"bg-[#16A34A] font-black text-[#FFFFFF]":"border border-[#E5E7E5]"}`}>{item}</button>)}</div></fieldset>}
