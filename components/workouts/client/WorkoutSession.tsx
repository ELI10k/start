"use client";
/* eslint-disable react-hooks/purity */
import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Play, RotateCcw, X } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { StateBlock } from "@/components/client/AppPatterns";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import WorkoutLoadingState from "@/components/workouts/WorkoutLoadingState";
import { exercisePerformance, workoutCompletionPercent, workoutVolume } from "@/lib/workouts/progress";
import type { ActiveExerciseResult, ActiveWorkoutSession, CompletedWorkout, ExerciseSetResult } from "@/lib/workouts/types";

const setCount=(value?:string)=>{const count=Number.parseInt(value??"",10);return Number.isFinite(count)&&count>0?Math.min(count,20):0};
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;

export default function WorkoutSession({programId,dayId}:{programId:string;dayId:string}){
  const{getProgram,getExercise,currentClientId,snapshot,loading,persistenceError,startSession,saveSession,cancelSession,completeSession}=useWorkouts();
  const program=getProgram(programId);const day=program?.days.find((item)=>item.id===dayId);
  const assignment=snapshot.assignments.find((item)=>item.clientId===currentClientId&&item.programId===programId&&item.status==="active");
  const anySession=snapshot.activeSessions.find((item)=>item.clientId===currentClientId);
  const session=anySession?.programId===programId&&anySession.dayId===dayId?anySession:undefined;
  const[now,setNow]=useState(()=>Date.now());const[summary,setSummary]=useState(false);const[warning,setWarning]=useState("");const[saved,setSaved]=useState<CompletedWorkout>();const[isStarting,setIsStarting]=useState(false);const[isCompleting,setIsCompleting]=useState(false);const[abandon,setAbandon]=useState(false);
  const ordered=useMemo(()=>[...(day?.exercises??[])].sort((a,b)=>a.order-b.order),[day]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(session){event.preventDefault();event.returnValue=""}};window.addEventListener("beforeunload",guard);return()=>window.removeEventListener("beforeunload",guard)},[session]);
  if(loading)return <WorkoutLoadingState/>;
  if(!program||!day)notFound();
  const makeSession=():ActiveWorkoutSession=>({id:`session-${currentClientId}-${Date.now()}`,clientId:currentClientId,assignmentId:assignment?.id??"",programId,dayId,startedAt:new Date().toISOString(),currentExerciseIndex:0,exerciseResults:ordered.map((entry):ActiveExerciseResult=>({workoutExerciseId:entry.id,exerciseId:entry.exerciseId,skipped:false,completed:false,sets:Array.from({length:setCount(entry.sets)},(_,index):ExerciseSetResult=>({id:`${entry.id}-set-${index+1}`,prescriptionId:entry.setPrescriptions?.[index]?.id,order:index,completed:false}))}))});
  const begin=async()=>{if(isStarting)return;if(!assignment){setWarning("לא נמצאה הקצאת תוכנית פעילה.");return}if(anySession&&!session){setWarning("כבר קיים אימון פעיל אחר.");return}setIsStarting(true);try{if(!await startSession(makeSession()))setWarning("לא ניתן להתחיל שני אימונים במקביל.")}finally{setIsStarting(false)}};
  if(saved)return <Finished workout={saved}/>;
  if(!session)return <Start program={program.name} day={day.name} count={ordered.length} warning={warning} onStart={begin} starting={isStarting} programId={programId}/>;

  const current=ordered[Math.min(session.currentExerciseIndex,ordered.length-1)];const result=session.exerciseResults.find((item)=>item.workoutExerciseId===current?.id);if(!current||!result)return <main className="client-app-content"><StateBlock title="אין תרגילים זמינים באימון זה" description="מקור התוכנית אינו כולל תרגילים ליום הזה."/></main>;const difficulty=session.perceivedDifficulty??3;const energy=session.energy??3;
  const exercise=getExercise(result.exerciseId);const performance=exercisePerformance(snapshot.completedWorkouts,currentClientId,result.exerciseId);const previous=performance.sessions[0];const recentSets=performance.sessions.flatMap((item)=>item.sets.filter((set)=>set.completed));const bestWeight=Math.max(0,...recentSets.map((set)=>set.weightKg??0));
  const completedExercises=session.exerciseResults.filter((item)=>item.completed).length;const skipped=session.exerciseResults.filter((item)=>item.skipped).length;const completedSets=session.exerciseResults.flatMap((item)=>item.sets).filter((item)=>item.completed).length;const totalSets=session.exerciseResults.flatMap((item)=>item.sets).length;const elapsed=Math.max(0,Math.floor((now-new Date(session.startedAt).getTime())/1000));const rest=Math.max(0,Math.ceil(((session.restEndsAt?new Date(session.restEndsAt).getTime():0)-now)/1000));
  const persist=(patch:Partial<ActiveWorkoutSession>)=>saveSession({...session,...patch});
  const replaceResult=(next:ActiveExerciseResult,extra:Partial<ActiveWorkoutSession>={})=>persist({...extra,exerciseResults:session.exerciseResults.map((item)=>item.workoutExerciseId===next.workoutExerciseId?next:item)});
  const updateSet=(set:ExerciseSetResult,patch:Partial<ExerciseSetResult>)=>{const nextSet={...set,...patch};const nextResult={...result,sets:result.sets.map((item)=>item.id===set.id?nextSet:item),completed:result.sets.every((item)=>item.id===set.id?nextSet.completed:item.completed)};const restSeconds=patch.completed?Number.parseInt(current.rest??"",10):0;replaceResult(nextResult,Number.isFinite(restSeconds)&&restSeconds>0?{restEndsAt:new Date(Date.now()+restSeconds*1000).toISOString()}:{});};
  const finish=()=>{if(session.exerciseResults.some((item)=>!item.completed&&!item.skipped)&&!warning){setWarning("נותרו תרגילים שלא הושלמו. לחיצה נוספת תשמור אותם כחלקיים.");return}setWarning("");setSummary(true)};
  const complete=async()=>{if(isCompleting)return;setIsCompleting(true);try{const completedAt=new Date().toISOString();const workout:CompletedWorkout={id:`workout-${session.id}`,clientId:session.clientId,assignmentId:session.assignmentId,programId,dayId,startedAt:session.startedAt,completedAt,durationSeconds:Math.max(1,Math.floor((Date.now()-new Date(session.startedAt).getTime())/1000)),exerciseResults:session.exerciseResults,workoutNote:session.workoutNote?.trim()||undefined,perceivedDifficulty:difficulty,energy,totalVolume:workoutVolume(session.exerciseResults)};if(await completeSession(workout))setSaved(workout);else setWarning("האימון לא נשמר ב-Supabase. יש לנסות שוב.")}finally{setIsCompleting(false)}};
  if(summary)return <CompletionForm elapsed={elapsed} exercises={`${completedExercises}/${ordered.length}`} sets={`${completedSets}/${totalSets}`} skipped={skipped} volume={workoutVolume(session.exerciseResults)} note={session.workoutNote??""} setNote={(workoutNote)=>persist({workoutNote})} difficulty={difficulty} setDifficulty={(perceivedDifficulty)=>persist({perceivedDifficulty})} energy={energy} setEnergy={(nextEnergy)=>persist({energy:nextEnergy})} warning={warning||persistenceError} onSave={complete} saving={isCompleting} onBack={()=>setSummary(false)}/>;

  return <main className="client-app-content">
    {/* Where you are in the workout follows you down the page - on a phone the
        header scrolls away exactly when the set count starts to matter. */}
    <div className="session-sticky">
      <div className="session-sticky__meta">
        <div className="min-w-0">
          <span>{program.name}</span>
          <strong className="block truncate">{day.name}</strong>
        </div>
        <div className="text-end">
          <strong className="font-mono">{clock(elapsed)}</strong>
          <span className="block">{completedSets}/{totalSets} סטים</span>
        </div>
      </div>
      <div className="premium-progress">
        <div className="premium-progress__track" role="progressbar" aria-label="התקדמות באימון" aria-valuemin={0} aria-valuemax={100} aria-valuenow={workoutCompletionPercent(totalSets,completedSets)}>
          <span style={{width:`${workoutCompletionPercent(totalSets,completedSets)}%`}}/>
        </div>
      </div>
    </div>

    {rest>0&&<RestTimer seconds={rest} onAdd={()=>persist({restEndsAt:new Date(Date.now()+(rest+30)*1000).toISOString()})} onSkip={()=>persist({restEndsAt:undefined})}/>}

    {/* One exercise at a time. Everything else is a step away, not a scroll away. */}
    <article className="premium-card mt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold text-[#16A34A]">תרגיל {session.currentExerciseIndex+1} מתוך {ordered.length}</span>
          <h1 className="mt-1 text-2xl font-black">{exercise?.name??"פרטי תרגיל חסרים"}</h1>
          <p className="mt-1 text-sm text-[#5B5F5B]">{[exercise?.primaryMuscleGroup,exercise?.equipment].filter(Boolean).join(" · ")||"פרטי ציוד לא סופקו במקור"}</p>
        </div>
        {/* A missing link never blocks the set - it is stated and the workout
            carries on. */}
        {exercise?.video
          ?<a href={exercise.video.url} target="_blank" rel="noreferrer" className="chip shrink-0">וידאו<ExternalLink aria-hidden="true" size={15}/></a>
          :<span className="pill shrink-0">אין סרטון</span>}
      </div>

      <dl className="dashboard-metrics mt-3">
        <Value label="סטים" value={current.sets??"לא הוגדר"}/>
        <Value label="חזרות" value={current.reps??"לא הוגדר"}/>
        <Value label="מנוחה" value={current.rest??"לא הוגדר"}/>
      </dl>

      {(current.notes||exercise?.executionNotes)&&<p className="mt-3 rounded-2xl bg-[#F7F8F7] p-3 text-sm text-[#5B5F5B]">{current.notes||exercise?.executionNotes}</p>}

      <PreviousPerformance previous={previous} bestWeight={bestWeight} recent={performance.sessions.slice(0,3)}/>

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

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={()=>replaceResult({...result,skipped:!result.skipped,completed:false})} className="premium-secondary-button">{result.skipped?"החזרת התרגיל":"דילוג על התרגיל"}</button>
        <button onClick={()=>replaceResult({...result,completed:true,skipped:false,sets:result.sets.map((set)=>({...set,completed:true,completedAt:set.completedAt??new Date().toISOString()}))})} className="premium-primary-button">השלמת התרגיל</button>
      </div>
      <Link href={`/workouts/exercises/${result.exerciseId}?programId=${programId}&dayId=${dayId}`} className="mt-3 flex items-center justify-center text-sm text-[#5B5F5B]">כל היסטוריית התרגיל</Link>
    </article>

    {(warning||persistenceError)&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning||persistenceError}</p>}

    <button onClick={finish} className="premium-primary-button mt-4 w-full">סיום אימון</button>
    <button onClick={()=>setAbandon(true)} className="mt-2 flex w-full items-center justify-center gap-2 text-sm text-[#DC2626]"><X aria-hidden="true" size={16}/>ביטול האימון</button>

    {/* Previous and next stay under the thumb, above the home indicator. */}
    <nav className="session-actions" aria-label="מעבר בין תרגילים">
      <button disabled={session.currentExerciseIndex===0} onClick={()=>persist({currentExerciseIndex:session.currentExerciseIndex-1})} className="premium-secondary-button"><ChevronRight aria-hidden="true" size={17}/>הקודם</button>
      <button disabled={session.currentExerciseIndex===ordered.length-1} onClick={()=>persist({currentExerciseIndex:session.currentExerciseIndex+1})} className="premium-secondary-button">הבא<ChevronLeft aria-hidden="true" size={17}/></button>
    </nav>

    <BottomSheet open={abandon} title="לבטל את האימון הפעיל?" onClose={()=>setAbandon(false)}>
      <p className="text-sm text-[#5B5F5B]">הסטים שנרשמו באימון הזה יימחקו ולא ניתן יהיה לשחזר אותם.</p>
      <div className="sheet__actions">
        <button onClick={async()=>{setAbandon(false);await cancelSession(currentClientId)}} className="premium-primary-button bg-[#DC2626] border-[#DC2626] hover:bg-[#DC2626]">ביטול האימון ומחיקת הנתונים</button>
        <button onClick={()=>setAbandon(false)} className="premium-secondary-button">חזרה לאימון</button>
      </div>
    </BottomSheet>
  </main>;
}

function Start({program,day,count,warning,onStart,starting,programId}:{program:string;day:string;count:number;warning:string;onStart:()=>void|Promise<void>;starting:boolean;programId:string}){
  return <main className="client-app-content grid min-h-[70vh] place-items-center">
    <section className="premium-card w-full max-w-lg text-center">
      <span className="state-block__icon mx-auto"><Play aria-hidden="true" size={22}/></span>
      <p className="mt-4 text-xs font-bold text-[#16A34A]">{program}</p>
      <h1 className="mt-2 text-3xl font-black">{day}</h1>
      <p className="mt-3 text-sm text-[#5B5F5B]">{count} תרגילים לפי סדר המקור. ההתקדמות נשמרת אוטומטית.</p>
      {warning&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning}</p>}
      <button onClick={onStart} disabled={!count||starting} className="premium-primary-button mt-6 w-full">{starting?"מתחילים…":"התחלת אימון"}</button>
      <Link href={`/workouts/program/${programId}`} className="premium-secondary-button mt-3 w-full">חזרה לתוכנית</Link>
    </section>
  </main>;
}

function PreviousPerformance({previous,bestWeight,recent}:{previous?:{date:string;sets:readonly ExerciseSetResult[];volume:number};bestWeight:number;recent:readonly {workoutId:string;date:string;sets:readonly ExerciseSetResult[];volume:number}[]}){
  return <details className="collapse mt-4">
    <summary>ביצוע קודם{bestWeight>0?<span className="pill pill--green">שיא {bestWeight} ק״ג</span>:null}</summary>
    <div className="collapse__body">
      {previous?<>
        <p className="text-xs text-[#5B5F5B]">{new Date(previous.date).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</p>
        <p className="mt-2 text-sm">{previous.sets.map((set)=>`${set.weightKg??0} ק״ג × ${set.repetitions??0}`).join(" · ")}</p>
        {recent.length>1&&recent.map((item)=><p key={item.workoutId} className="mt-2 text-xs text-[#5B5F5B]">{new Date(item.date).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})} · נפח {item.volume}</p>)}
      </>:<p className="text-sm text-[#5B5F5B]">זהו הביצוע הראשון שנרשם לתרגיל.</p>}
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

function CompletionForm({elapsed,exercises,sets,skipped,volume,note,setNote,difficulty,setDifficulty,energy,setEnergy,warning,onSave,saving,onBack}:{elapsed:number;exercises:string;sets:string;skipped:number;volume:number;note:string;setNote:(value:string)=>void;difficulty:1|2|3|4|5;setDifficulty:(value:1|2|3|4|5)=>void;energy:1|2|3|4|5;setEnergy:(value:1|2|3|4|5)=>void;warning:string;onSave:()=>void|Promise<void>;saving:boolean;onBack:()=>void}){
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
      <Rating label="קושי מורגש" value={difficulty} onChange={setDifficulty}/>
      <Rating label="רמת אנרגיה" value={energy} onChange={setEnergy}/>
    </section>
    {warning&&<p role="alert" className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">{warning}</p>}
    <div className="session-actions session-actions--stack mt-5">
      <button onClick={onSave} disabled={saving} className="premium-primary-button">{saving?"שומרים…":"שמירת האימון"}</button>
      <button onClick={onBack} disabled={saving} className="premium-secondary-button">חזרה לאימון</button>
    </div>
  </main>;
}

function Finished({workout}:{workout:CompletedWorkout}){
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
    <div className="mt-5 grid gap-3">
      <Link href="/workouts" className="premium-primary-button">בית האימונים</Link>
      <Link href={`/workouts/history/${workout.id}`} className="premium-secondary-button">פרטי האימון</Link>
    </div>
  </main>;
}

function Value({label,value}:{label:string;value:string}){return <div className="metric-tile"><dt className="metric-tile__head"><span>{label}</span></dt><dd><strong>{value}</strong></dd></div>}
function Rating({label,value,onChange}:{label:string;value:1|2|3|4|5;onChange:(value:1|2|3|4|5)=>void}){return <fieldset className="mt-5"><legend className="text-sm font-bold">{label}</legend><div className="mt-2 grid grid-cols-5 gap-2">{([1,2,3,4,5] as const).map((item)=><button type="button" key={item} onClick={()=>onChange(item)} aria-pressed={value===item} className={`min-h-11 rounded-xl ${value===item?"bg-[#16A34A] font-black text-[#FFFFFF]":"border border-[#E5E7E5]"}`}>{item}</button>)}</div></fieldset>}
