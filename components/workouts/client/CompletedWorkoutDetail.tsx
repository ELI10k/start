"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { workoutVolume } from "@/lib/workouts/progress";
import { buildWorkoutReport, type ReportExercise } from "@/lib/workouts/session-report";
import WorkoutPreserveImprove from "@/components/workouts/client/WorkoutPreserveImprove";
import type { ActiveExerciseResult, CompletedWorkout } from "@/lib/workouts/types";

const numberOrUndefined=(value:string)=>{const parsed=Number(value);return value.trim()===""||Number.isNaN(parsed)?undefined:parsed};

export default function CompletedWorkoutDetail({workoutId}:{workoutId:string}){
  const{snapshot,currentClientId,getExercise,updateCompletedSession}=useWorkouts();
  const workout=snapshot.completedWorkouts.find((item)=>item.id===workoutId&&item.clientId===currentClientId);
  // A workout can be filled in after the fact: a client who trained without the
  // phone in hand closes the session with the sets ticked and the numbers empty,
  // and the numbers are the whole point of the record.
  const[draft,setDraft]=useState<CompletedWorkout|null>(null);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  if(!workout)notFound();
  const program=snapshot.programs.find((item)=>item.id===workout.programId);
  const day=program?.days.find((item)=>item.id===workout.dayId);
  const previous=[...snapshot.completedWorkouts].filter((item)=>item.clientId===currentClientId&&item.dayId===workout.dayId&&item.completedAt<workout.completedAt).sort((a,b)=>b.completedAt.localeCompare(a.completedAt))[0];
  const editing=draft!==null;
  const shown=draft??workout;
  const reportExercises:ReportExercise[]=shown.exerciseResults.map((result)=>{
    const exercise=getExercise(result.performedExerciseId??result.exerciseId);
    const prior=previous?.exerciseResults.find((item)=>(item.performedExerciseId??item.exerciseId)===(result.performedExerciseId??result.exerciseId));
    const prescribed=day?.exercises.find((item)=>item.id===result.workoutExerciseId);
    const restMatch=prescribed?.rest?.match(/\d+/)?.[0];
    return{name:exercise?.name??"תרגיל",restSeconds:restMatch?Number(restMatch):null,sets:result.sets,previousSets:prior?.sets??[],skipped:result.skipped,completed:result.completed,difficulty:result.difficulty};
  });
  const insights=buildWorkoutReport({durationSeconds:shown.durationSeconds,exercises:reportExercises,sleepHours:shown.sleepHours,perceivedDifficulty:shown.perceivedDifficulty});

  const patchSet=(workoutExerciseId:string,setId:string,value:{weightKg?:number;repetitions?:number})=>{
    if(!draft)return;
    setDraft({...draft,exerciseResults:draft.exerciseResults.map((result)=>result.workoutExerciseId!==workoutExerciseId?result:{
      ...result,
      sets:result.sets.map((set)=>set.id!==setId?set:{...set,...value,completed:true}),
    })});
  };

  const save=async()=>{
    if(!draft)return;
    setSaving(true);setMessage("");
    // The volume is recomputed here rather than trusted from the form: it is the
    // number every chart and comparison reads.
    const next:CompletedWorkout={...draft,totalVolume:workoutVolume(draft.exerciseResults as ActiveExerciseResult[])};
    const ok=await updateCompletedSession(next);
    setSaving(false);
    if(ok){setDraft(null);setMessage("האימון עודכן.")}
    else setMessage("העדכון נכשל. יש לנסות שוב.");
  };

  return <main className="px-4 py-8 text-[#0B0B0B]"><div className="mx-auto max-w-4xl">
    <p className="text-xs font-bold text-[#16A34A]">{new Date(workout.completedAt).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</p>
    <h1 className="mt-2 text-3xl font-black">{day?.name??"אימון שהושלם"}</h1>
    <p className="mt-2 text-[#5B5F5B]">{program?.name??"תוכנית לא זמינה"}</p>
    <WorkoutPreserveImprove insights={insights}/>

    <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Info label="משך" value={`${Math.round(workout.durationSeconds/60)} דק׳`}/>
      <Info label="נפח" value={`${shown.totalVolume} ק״ג`}/>
      <Info label="קושי" value={shown.perceivedDifficulty?.toString()}/>
      <Info label="אנרגיה" value={shown.energy?.toString()}/>
      <Info label="שעות שינה" value={shown.sleepHours!==undefined?`${shown.sleepHours}`:undefined}/>
    </dl>

    {previous&&<p className="mt-4 rounded-xl border border-[#E5E7E5] p-3 text-sm text-[#5B5F5B]">לעומת האימון הקודם: {workout.totalVolume-previous.totalVolume>=0?"+":""}{workout.totalVolume-previous.totalVolume} ק״ג נפח</p>}

    <div className="mt-4 flex flex-wrap items-center gap-3">
      {!editing&&<button type="button" onClick={()=>{setDraft(workout);setMessage("")}} className="min-h-12 rounded-2xl border border-[#16A34A] px-5 font-bold text-[#16A34A]">מילוי או תיקון של האימון</button>}
      {message&&<p role="status" className="text-sm font-bold text-[#16A34A]">{message}</p>}
    </div>

    {editing&&<div className="mt-4 grid gap-3 rounded-2xl border border-[#E5E7E5] p-4 sm:grid-cols-3">
      <label className="text-sm font-bold">שעות שינה בלילה
        <input type="number" min="0" max="24" step="0.5" inputMode="decimal" className="nutrition-input mt-2" value={draft.sleepHours??""} onChange={(event)=>setDraft({...draft,sleepHours:numberOrUndefined(event.target.value)})}/>
      </label>
      <label className="text-sm font-bold">רמת קושי (1-5)
        <input type="number" min="1" max="5" step="1" inputMode="numeric" className="nutrition-input mt-2" value={draft.perceivedDifficulty??""} onChange={(event)=>setDraft({...draft,perceivedDifficulty:numberOrUndefined(event.target.value) as CompletedWorkout["perceivedDifficulty"]})}/>
      </label>
      <label className="text-sm font-bold">אנרגיה (1-5)
        <input type="number" min="1" max="5" step="1" inputMode="numeric" className="nutrition-input mt-2" value={draft.energy??""} onChange={(event)=>setDraft({...draft,energy:numberOrUndefined(event.target.value) as CompletedWorkout["energy"]})}/>
      </label>
      <label className="text-sm font-bold sm:col-span-3">הערה לאימון
        <textarea className="nutrition-input mt-2 min-h-20" value={draft.workoutNote??""} onChange={(event)=>setDraft({...draft,workoutNote:event.target.value||undefined})}/>
      </label>
    </div>}

    {shown.workoutNote&&!editing&&<p className="mt-4 rounded-xl bg-[#FFFFFF] p-4">{shown.workoutNote}</p>}

    <div className="mt-6 space-y-4">{shown.exerciseResults.map((result)=>{
      const exercise=getExercise(result.exerciseId);
      return <article key={result.workoutExerciseId} className="rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
        <div className="flex justify-between gap-3">
          <h2 className="text-xl font-black">{exercise?.name??"תרגיל חסר"}</h2>
          <span className={`text-xs ${result.skipped?"text-[#0B0B0B]":result.completed?"text-[#16A34A]":"text-[#5B5F5B]"}`}>{result.skipped?"דולג":result.completed?"הושלם":"חלקי"}</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[#5B5F5B]"><tr><th className="p-2 text-right">סט</th><th className="p-2 text-right">משקל</th><th className="p-2 text-right">חזרות</th><th className="p-2 text-right">נפח</th></tr></thead>
            <tbody>{result.sets.map((set)=>
              <tr key={set.id} className="border-t border-[#E5E7E5]">
                <td className="p-2">{set.order+1}</td>
                <td className="p-2">{editing
                  ? <input type="number" min="0" step="0.5" inputMode="decimal" aria-label={`משקל בסט ${set.order+1}`} className="nutrition-input max-w-24" value={set.weightKg??""} onChange={(event)=>patchSet(result.workoutExerciseId,set.id,{weightKg:numberOrUndefined(event.target.value)})}/>
                  : set.weightKg??"—"}</td>
                <td className="p-2">{editing
                  ? <input type="number" min="0" step="1" inputMode="numeric" aria-label={`חזרות בסט ${set.order+1}`} className="nutrition-input max-w-24" value={set.repetitions??""} onChange={(event)=>patchSet(result.workoutExerciseId,set.id,{repetitions:numberOrUndefined(event.target.value)})}/>
                  : set.repetitions??"—"}</td>
                <td className="p-2">{workoutVolume([{...result,sets:[set]}])}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <Link href={`/workouts/exercises/${result.exerciseId}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-[#16A34A]">היסטוריית התרגיל</Link>
      </article>;
    })}</div>

    {editing&&<div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
      <button type="button" onClick={save} disabled={saving} className="min-h-12 rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF] disabled:opacity-40">{saving?"שומרים…":"שמירת השינויים"}</button>
      <button type="button" onClick={()=>{setDraft(null);setMessage("")}} disabled={saving} className="min-h-12 rounded-2xl border border-[#E5E7E5] px-5 font-bold">ביטול</button>
    </div>}

    <Link href="/workouts/history" className="mt-6 inline-flex min-h-11 items-center">חזרה להיסטוריה</Link>
  </div></main>;
}

function Info({label,value}:{label:string;value?:string}){return <div className="rounded-xl bg-[#FFFFFF] p-3"><dt className="text-xs text-[#5B5F5B]">{label}</dt><dd className="mt-1 font-black">{value??"—"}</dd></div>}
