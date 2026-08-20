"use client";
/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Play, Repeat2, RotateCcw, X } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import ExerciseGuidanceButton from "@/components/workouts/ExerciseGuidanceButton";
import ExerciseThumbnail from "@/components/workouts/ExerciseThumbnail";
import { track } from "@/lib/analytics/client";
import { StateBlock } from "@/components/client/AppPatterns";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import WorkoutLoadingState from "@/components/workouts/WorkoutLoadingState";
import { bestComparableSet, exercisePerformance, targetRepetitions, workoutCompletionPercent, workoutVolume } from "@/lib/workouts/progress";
import { isCompoundLift, planWarmup, workingWeightFrom } from "@/lib/workouts/warmup";
import { buildWorkoutReport, type ReportExercise } from "@/lib/workouts/session-report";
import { signalRestOver } from "@/lib/workouts/feedback";
import type { ActiveExerciseResult, ActiveWorkoutSession, CompletedWorkout, ExerciseSetResult } from "@/lib/workouts/types";

const setCount=(value?:string)=>{const count=Number.parseInt(value??"",10);return Number.isFinite(count)&&count>0?Math.min(count,20):0};
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;

export default function WorkoutSession({programId,dayId}:{programId:string;dayId:string}){
  const{getProgram,getExercise,currentClientId,snapshot,loading,persistenceError,pendingSync,startSession,saveSession,cancelSession,completeSession}=useWorkouts();
  const program=getProgram(programId);const day=program?.days.find((item)=>item.id===dayId);
  const assignment=snapshot.assignments.find((item)=>item.clientId===currentClientId&&item.programId===programId&&item.status==="active");
  const anySession=snapshot.activeSessions.find((item)=>item.clientId===currentClientId);
  const session=anySession?.programId===programId&&anySession.dayId===dayId?anySession:undefined;
  const[now,setNow]=useState(()=>Date.now());const[summary,setSummary]=useState(false);const[warning,setWarning]=useState("");const[saved,setSaved]=useState<CompletedWorkout>();const[isStarting,setIsStarting]=useState(false);const[isCompleting,setIsCompleting]=useState(false);const[abandon,setAbandon]=useState(false);const[swapping,setSwapping]=useState(false);
  // Whether "there are unfinished exercises" has already been put to the client.
  // This used to be inferred from `warning` holding anything at all - and
  // completing the last exercise writes a warning of its own ("אפשר לסיים את
  // האימון"), so the client most likely to have unfinished exercises was exactly
  // the one who was never asked about them.
  const[confirmedPartial,setConfirmedPartial]=useState(false);
  const ordered=useMemo(()=>[...(day?.exercises??[])].sort((a,b)=>a.order-b.order),[day]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(session){event.preventDefault();event.returnValue=""}};window.addEventListener("beforeunload",guard);return()=>window.removeEventListener("beforeunload",guard)},[session]);
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
      const last=exercisePerformance(snapshot.completedWorkouts,currentClientId,entry.exerciseId).sessions[0];
      return{workoutExerciseId:entry.id,exerciseId:entry.exerciseId,skipped:false,completed:false,
        sets:Array.from({length:setCount(entry.sets)},(_,index):ExerciseSetResult=>{
          const previous=last?.sets[index];
          return{id:`${entry.id}-set-${index+1}`,prescriptionId:entry.setPrescriptions?.[index]?.id,order:index,completed:false,
            weightKg:previous?.weightKg,repetitions:previous?.repetitions};
        })};
    }),
  });
  const begin=async(startingSleepHours?:number,startingEnergy:1|2|3|4|5=3)=>{if(isStarting)return;if(!assignment){setWarning("לא נמצאה הקצאת תוכנית פעילה.");return}if(anySession&&!session){setWarning("כבר קיים אימון פעיל אחר.");return}setIsStarting(true);try{if(await startSession(makeSession(startingSleepHours,startingEnergy)))track("workout_started",{exercises:ordered.length,sleepHours:startingSleepHours??null,energy:startingEnergy});else setWarning("לא ניתן להתחיל שני אימונים במקביל.")}finally{setIsStarting(false)}};
  if(saved){
    // Assembled here because only this scope holds both the programme's
    // prescriptions and each exercise's history.
    const reportExercises:ReportExercise[]=saved.exerciseResults.map((entry)=>{
      const performed=entry.performedExerciseId??entry.exerciseId;
      const prescription=ordered.find((item)=>item.id===entry.workoutExerciseId);
      const restSeconds=Number.parseInt(prescription?.rest??"",10);
      // The session just saved is the newest one in the snapshot's history, so
      // "previous" is the one before it.
      const history=exercisePerformance(snapshot.completedWorkouts,currentClientId,performed).sessions
        .filter((session)=>session.workoutId!==saved.id);
      return{
        name:getExercise(performed)?.name??"תרגיל",
        restSeconds:Number.isFinite(restSeconds)&&restSeconds>0?restSeconds:null,
        sets:entry.sets,
        previousSets:history[0]?.sets??[],
        skipped:entry.skipped,
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
  const exercise=getExercise(performedId);const prescribed=getExercise(result.exerciseId);const performance=exercisePerformance(snapshot.completedWorkouts,currentClientId,performedId);const previous=performance.sessions[0];// The best set that is comparable to today's work, not the heaviest weight ever
  // moved on the exercise: a 12-rep back-off set is not a benchmark for a 10-rep
  // working set, and offering it as one is how a client ends up chasing a number
  // from a different job.
  const repTarget=targetRepetitions(current.reps);
  const best=bestComparableSet(performance.sessions,repTarget);
  // What to load before the working sets, worked out from what was actually
  // lifted last time. No previous session means no honest percentage of anything.
  const warmup=planWarmup(workingWeightFrom(performance.sessions),{effort:current.effort,compound:isCompoundLift(exercise?.name)});
  const completedExercises=session.exerciseResults.filter((item)=>item.completed).length;const skipped=session.exerciseResults.filter((item)=>item.skipped).length;const completedSets=session.exerciseResults.flatMap((item)=>item.sets).filter((item)=>item.completed).length;const totalSets=session.exerciseResults.flatMap((item)=>item.sets).length;const elapsed=Math.max(0,Math.floor((now-new Date(session.startedAt).getTime())/1000));const rest=Math.max(0,Math.ceil(((session.restEndsAt?new Date(session.restEndsAt).getTime():0)-now)/1000));
  const persist=(patch:Partial<ActiveWorkoutSession>)=>saveSession({...session,...patch});
  // A replacement has to train the same thing, so the list is the catalogue
  // filtered to the prescribed exercise's primary muscle group. Both fields are
  // already classified, so no new data is needed for this.
  const swapOptions=snapshot.exercises
    .filter((item)=>item.id!==performedId&&item.status!=="archived"&&prescribed?.primaryMuscleGroup&&item.primaryMuscleGroup===prescribed.primaryMuscleGroup)
    .slice(0,40);
  const replaceResult=(next:ActiveExerciseResult,extra:Partial<ActiveWorkoutSession>={})=>persist({...extra,exerciseResults:session.exerciseResults.map((item)=>item.workoutExerciseId===next.workoutExerciseId?next:item)});
  const updateSet=(set:ExerciseSetResult,patch:Partial<ExerciseSetResult>)=>{const nextSet={...set,...patch};if(nextSet.completed&&nextSet.repetitions===undefined)nextSet.repetitions=targetReps(set.order);const nextResult={...result,sets:result.sets.map((item)=>item.id===set.id?nextSet:item),completed:result.sets.every((item)=>item.id===set.id?nextSet.completed:item.completed)};const restSeconds=patch.completed?Number.parseInt(current.rest??"",10):0;replaceResult(nextResult,Number.isFinite(restSeconds)&&restSeconds>0?{restEndsAt:new Date(Date.now()+restSeconds*1000).toISOString()}:{});};
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
  if(summary)return <CompletionForm elapsed={elapsed} exercises={`${completedExercises}/${ordered.length}`} sets={`${completedSets}/${totalSets}`} skipped={skipped} volume={workoutVolume(session.exerciseResults)} note={session.workoutNote??""} setNote={(workoutNote)=>persist({workoutNote})} difficulty={difficulty} setDifficulty={(perceivedDifficulty)=>persist({perceivedDifficulty})} energy={energy} setEnergy={(nextEnergy)=>persist({energy:nextEnergy})} sleepHours={sleepHours} setSleepHours={(nextSleep)=>persist({sleepHours:nextSleep})} warning={warning||persistenceError} onSave={complete} saving={isCompleting} onBack={()=>setSummary(false)}/>;

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
        {/* Not the same as skipping. Skipping records that nothing was done;
            this records that the same muscle was trained on something else,
            which is what actually happened when the rack was busy. */}
        <button type="button" onClick={()=>setSwapping(true)} className="chip"><Repeat2 aria-hidden="true" size={14}/>החלפה</button>
        </div>
      </div>

      <dl className="session-stats">
        <Stat label="סטים" value={current.sets??"לא הוגדר"}/>
        <Stat label="חזרות" value={current.reps??"לא הוגדר"}/>
        <Stat label="מנוחה" value={current.rest??"לא הוגדר"}/>
        <Stat label="רמת מאמץ" value={current.effort?`RPE ${current.effort}`:"לא הוגדר"}/>
      </dl>

      {(current.notes||exercise?.executionNotes)&&<p className="mt-3 rounded-2xl bg-[#F7F8F7] p-3 text-sm text-[#5B5F5B]">{current.notes||exercise?.executionNotes}</p>}

      {warmup?<Warmup plan={warmup}/>:null}

      <PreviousPerformance previous={previous} best={best} targetReps={repTarget} recent={performance.sessions.slice(0,3)}/>

      {/* Some rows in the source workbooks carry no sets - a dynamic warm-up, for
          instance. Rendering an empty table header for those left the client with
          a column heading and nothing to fill in. */}
      {result.sets.length?
        <section className="mt-4" aria-label="רישום סטים">
          <div className="set-row text-xs font-bold text-[#5B5F5B]" aria-hidden="true">
            <span/><span>משקל (ק״ג)</span><span>חזרות</span><span/>
          </div>
          {result.sets.map((set,index)=>
            <SetEditor key={set.id} set={set} index={index} target={current.setPrescriptions?.[index]?.repetitions??current.reps} onUpdate={(patch)=>updateSet(set,patch)}/>
          )}
        </section>
        :<p className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] p-4 text-center text-sm text-[#5B5F5B]">לא הוגדרו סטים לתרגיל הזה במקור. אפשר לסמן אותו כהושלם ולהמשיך.</p>}

      {/* The rest countdown belongs where the thumb already is. At the top of the
          page it scrolled out of sight the moment a set was logged, which is the
          moment it starts. */}
      {rest>0&&<RestTimer seconds={rest} onAdd={()=>persist({restEndsAt:new Date(Date.now()+(rest+30)*1000).toISOString()})} onSkip={()=>persist({restEndsAt:undefined})}/>}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={()=>replaceResult({...result,skipped:!result.skipped,completed:false})} className="premium-secondary-button">{result.skipped?"החזרת התרגיל":"דילוג על התרגיל"}</button>
        <button onClick={completeExercise} className="premium-primary-button">השלמת התרגיל</button>
      </div>
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
      <button onClick={()=>setAbandon(true)} className="mt-2 flex w-full items-center justify-center gap-2 text-sm text-[#5B5F5B]"><X aria-hidden="true" size={16}/>יציאה מהאימון</button>
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
          <button type="button" onClick={()=>{replaceResult({...result,performedExerciseId:undefined});setSwapping(false)}} className="chip w-fit">
            חזרה ל{prescribed?.name??"תרגיל המקורי"}
          </button>}
        {swapOptions.map((option)=>
          <button key={option.id} type="button" onClick={()=>{replaceResult({...result,performedExerciseId:option.id});setSwapping(false)}} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7E5] px-3 text-start">
            <span className="font-bold">{option.name}</span>
            {option.equipment&&<span className="text-xs text-[#5B5F5B]">{option.equipment}</span>}
          </button>)}
        {!swapOptions.length&&<p className="rounded-2xl border border-dashed border-[#E5E7E5] p-4 text-center text-sm text-[#5B5F5B]">לא נמצאו תרגילים חלופיים לקבוצת השריר הזו.</p>}
      </div>
    </BottomSheet>

    <BottomSheet open={abandon} title="לצאת מהאימון?" onClose={()=>setAbandon(false)}>
      <p className="text-sm text-[#5B5F5B]">{completedSets} מתוך {totalSets} סטים נרשמו עד עכשיו.</p>
      <div className="sheet__actions">
        <button onClick={()=>{setAbandon(false);setSummary(true)}} className="premium-primary-button">שמירת מה שבוצע וסיום</button>
        <button onClick={()=>setAbandon(false)} className="premium-secondary-button">חזרה לאימון</button>
        <button onClick={async()=>{setAbandon(false);await cancelSession(currentClientId)}} className="mt-1 flex w-full items-center justify-center gap-2 text-sm text-[#DC2626]">מחיקת האימון וכל הסטים שנרשמו</button>
      </div>
    </BottomSheet>
  </main>;
}

// Sleep and energy are asked here rather than on the summary screen. Both
// describe the state the client came in with, and both change what a coach would
// say: "ישן 4 שעות" before a session is something to act on, and after it is only
// a record. They stay optional - a client who wants to start just starts.
function Start({program,day,count,warning,onStart,starting,programId}:{program:string;day:string;count:number;warning:string;onStart:(sleepHours?:number,energy?:1|2|3|4|5)=>void|Promise<void>;starting:boolean;programId:string}){
  const[sleepHours,setSleepHours]=useState<number|undefined>();
  const[energy,setEnergy]=useState<1|2|3|4|5>(3);
  return <main className="client-app-content grid min-h-[70vh] place-items-center">
    <section className="premium-card w-full max-w-lg">
      <span className="state-block__icon mx-auto"><Play aria-hidden="true" size={22}/></span>
      <p className="mt-4 text-center text-xs font-bold text-[#16A34A]">{program}</p>
      <h1 className="mt-2 text-center text-3xl font-black">{day}</h1>
      <p className="mt-3 text-center text-sm text-[#5B5F5B]">{count} תרגילים לפי סדר המקור. ההתקדמות נשמרת אוטומטית.</p>

      <label className="mt-6 block text-sm font-bold">כמה שעות ישנת הלילה? <span className="font-normal text-[#5B5F5B]">(רשות)</span>
        <input type="number" min="0" max="24" step="0.5" inputMode="decimal" className="nutrition-input mt-2 max-w-32" value={sleepHours??""} onChange={(event)=>{const parsed=Number(event.target.value);setSleepHours(event.target.value.trim()===""||Number.isNaN(parsed)?undefined:parsed)}}/>
      </label>
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
function Warmup({plan}:{plan:{workingWeightKg:number;sets:readonly {percent:number;weightKg:number;repetitions:number}[]}}){
  return <details className="disclosure mt-4">
    <summary>חימום<span className="pill">{plan.sets.length} {plan.sets.length===1?"סט":"סטים"}</span></summary>
    <div className="disclosure__body">
      <p className="text-xs text-[#5B5F5B]">מחושב מ־{plan.workingWeightKg} ק״ג, המשקל הכבד ביותר שהשלמת בתרגיל הזה באימון הקודם.</p>
      <ol className="mt-2 grid gap-1 text-sm">
        {plan.sets.map((set)=><li key={set.percent} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F8F7] px-3 py-2">
          <span className="text-[#5B5F5B]">{set.percent}%</span>
          <strong className="tabular-nums">{set.weightKg} ק״ג × {set.repetitions}</strong>
        </li>)}
      </ol>
      <p className="mt-2 text-xs text-[#5B5F5B]">סטי החימום אינם נרשמים ואינם נספרים בנפח.</p>
    </div>
  </details>;
}

// One row per set: number, weight, reps, done. Everything a client touches
// mid-set is on the same line and at least a fingertip wide.
function SetEditor({set,index,target,onUpdate}:{set:ExerciseSetResult;index:number;target?:string;onUpdate:(patch:Partial<ExerciseSetResult>)=>void}){
  return <div className="set-row" data-done={set.completed||undefined}>
    <span className="set-row__index" aria-hidden="true">{index+1}</span>
    <input aria-label={`משקל בסט ${index+1} (ק״ג)`} className="nutrition-input" type="number" min="0" step="0.1" value={set.weightKg??""} onChange={(event)=>onUpdate({weightKg:event.target.value===""?undefined:Number(event.target.value)})}/>
    <input aria-label={`חזרות בסט ${index+1}, יעד ${target??"—"}`} className="nutrition-input" type="number" min="0" step="1" placeholder={target??""} value={set.repetitions??""} onChange={(event)=>onUpdate({repetitions:event.target.value===""?undefined:Number(event.target.value)})}/>
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

function CompletionForm({elapsed,exercises,sets,skipped,volume,note,setNote,difficulty,setDifficulty,energy,setEnergy,sleepHours,setSleepHours,warning,onSave,saving,onBack}:{elapsed:number;exercises:string;sets:string;skipped:number;volume:number;note:string;setNote:(value:string)=>void;difficulty:1|2|3|4|5;setDifficulty:(value:1|2|3|4|5)=>void;energy:1|2|3|4|5;setEnergy:(value:1|2|3|4|5)=>void;sleepHours?:number;setSleepHours:(value:number|undefined)=>void;warning:string;onSave:()=>void|Promise<void>;saving:boolean;onBack:()=>void}){
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
      <label className="block text-sm font-bold">הערת אימון<textarea className="nutrition-input mt-2 min-h-24" value={note} onChange={(event)=>setNote(event.target.value)}/></label>
      {/* Sleep and energy were answered before the workout started. They are here
          to be corrected, not asked again - hours, not a 1-5 rating, because
          "ישנתי 5" and "ישנתי 8" are the two numbers a coach acts on. */}
      <label className="mt-4 block text-sm font-bold">שעות שינה <span className="font-normal text-[#5B5F5B]">(נרשם לפני האימון)</span>
        <input type="number" min="0" max="24" step="0.5" inputMode="decimal" className="nutrition-input mt-2 max-w-32" value={sleepHours??""} onChange={(event)=>{const parsed=Number(event.target.value);setSleepHours(event.target.value.trim()===""||Number.isNaN(parsed)?undefined:parsed)}}/>
      </label>
      <Rating label="קושי מורגש באימון" value={difficulty} onChange={setDifficulty}/>
      <Rating label="רמת אנרגיה (נרשם לפני האימון)" value={energy} onChange={setEnergy}/>
    </section>
    {warning&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning}</p>}
    <div className="session-actions session-actions--stack mt-5">
      <button onClick={onSave} disabled={saving} className="premium-primary-button">{saving?"שומרים…":"שמירת האימון"}</button>
      <button onClick={onBack} disabled={saving} className="premium-secondary-button">חזרה לאימון</button>
    </div>
  </main>;
}

function Finished({workout,insights}:{workout:CompletedWorkout;insights:readonly {tone:"praise"|"action"|"note";title:string;detail:string}[]}){
  const exercises=workout.exerciseResults.filter((item)=>item.completed).length;
  const sets=workout.exerciseResults.flatMap((item)=>item.sets).filter((item)=>item.completed).length;
  const skipped=workout.exerciseResults.filter((item)=>item.skipped).length;
  return <main className="client-app-content">
    <StateBlock tone="success" icon={<CheckCircle2 aria-hidden="true" size={22}/>} title="האימון נשמר" description="הנתונים נשמרו ויופיעו בהיסטוריה ובהתקדמות."/>
    <dl className="dashboard-metrics mt-4">
      <Value label="משך" value={clock(workout.durationSeconds)}/>
      <Value label="תרגילים" value={String(exercises)}/>
      <Value label="סטים" value={String(sets)}/>
      <Value label="נפח" value={`${workout.totalVolume} ק״ג`}/>
      <Value label="דולגו" value={String(skipped)}/>
    </dl>
    {/* What this session said, and what to do with it next time. Every line is
        read off what was recorded - a session with nothing notable in it gets
        one line saying so rather than an invented observation. */}
    <section className="mt-5" aria-labelledby="workout-report">
      <h2 id="workout-report" className="section-heading section-heading--compact">איך להשתפר לאימון הבא</h2>
      <div className="grid gap-2">
        {insights.map((insight)=><article key={insight.title} className="workout-insight" data-tone={insight.tone}>
          <strong>{insight.title}</strong>
          <p>{insight.detail}</p>
        </article>)}
      </div>
    </section>

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
