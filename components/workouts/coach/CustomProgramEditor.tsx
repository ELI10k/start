"use client";

import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Repeat, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import ExerciseGuidanceButton from "@/components/workouts/ExerciseGuidanceButton";
import type { WorkoutDay, WorkoutExercise, WorkoutProgram, WorkoutSetPrescription } from "@/lib/workouts/types";

const uid=(prefix:string)=>`${prefix}-${crypto.randomUUID()}`;
const emptyDay=(order:number):WorkoutDay=>({id:uid("workout-day"),name:`אימון ${order+1}`,order,exercises:[]});
const normalizeDays=(days:readonly WorkoutDay[])=>days.map((day,index)=>({...day,order:index,exercises:day.exercises.map((exercise,exerciseIndex)=>({...exercise,order:exerciseIndex,setPrescriptions:exercise.setPrescriptions?.map((set,setIndex)=>({...set,order:setIndex}))}))}));

export function NewProgramEditor(){
  const{saveProgram}=useWorkouts(); const router=useRouter();
  const[draft,setDraft]=useState<WorkoutProgram>({id:uid("coach-program"),name:"",description:"",programType:"",difficulty:"",trainingFrequency:3,equipment:[],sourceWorkbook:"נבנה על ידי המאמן",status:"active",official:false,days:[emptyDay(0)]});
  const[saving,setSaving]=useState(false); const[message,setMessage]=useState("");
  return <ProgramEditor draft={draft} setDraft={setDraft} onSave={async()=>{setSaving(true);setMessage("");const ok=await saveProgram({...draft,name:draft.name.trim(),days:normalizeDays(draft.days)});setSaving(false);if(ok){setMessage("התוכנית נוצרה ונשמרה ב-Supabase.");router.replace("/coach/workouts");router.refresh()}else setMessage("שמירת התוכנית נכשלה.")}} saving={saving} message={message}/>;
}

export default function CustomProgramEditor({id}:{id:string}){
  const{getProgram,saveProgram}=useWorkouts(); const existing=getProgram(id); const[draft,setDraft]=useState<WorkoutProgram|undefined>(existing); const[saving,setSaving]=useState(false);const[message,setMessage]=useState("");
  if(!draft||draft.official)return null;
  return <ProgramEditor draft={draft} setDraft={setDraft} onSave={async()=>{setSaving(true);setMessage("");const ok=await saveProgram({...draft,name:draft.name.trim(),days:normalizeDays(draft.days)});setSaving(false);setMessage(ok?"השינויים נשמרו ב-Supabase.":"שמירת התוכנית נכשלה.")}} saving={saving} message={message}/>;
}

// Where a dragged exercise came from. Held in state rather than in the drag
// payload because Safari does not expose dataTransfer during dragover, and the
// drop target needs to know the source to decide whether it is a no-op.
type DragOrigin = Readonly<{ dayId: string; exerciseId: string }>;

function ProgramEditor({draft,setDraft,onSave,saving,message}:{draft:WorkoutProgram;setDraft:(program:WorkoutProgram)=>void;onSave:()=>Promise<void>;saving:boolean;message:string}){
 const{snapshot}=useWorkouts();
 const[query,setQuery]=useState("");
 const[dragging,setDragging]=useState<DragOrigin|null>(null);
 const[replacing,setReplacing]=useState<DragOrigin|null>(null);

 const choices=useMemo(()=>snapshot.exercises.filter((exercise)=>exercise.status==="active"&&(`${exercise.name} ${exercise.category??""} ${exercise.primaryMuscleGroup??""}`).toLocaleLowerCase("he").includes(query.trim().toLocaleLowerCase("he"))).slice(0,30),[query,snapshot.exercises]);
 const patch=(value:Partial<WorkoutProgram>)=>setDraft({...draft,...value});
 const setDays=(days:WorkoutDay[])=>patch({days:normalizeDays(days)});
 const addDay=()=>setDays([...draft.days,emptyDay(draft.days.length)]);
 const moveDay=(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=draft.days.length)return;const next=[...draft.days];[next[index],next[target]]=[next[target],next[index]];setDays(next)};
 const patchDay=(dayId:string,value:Partial<WorkoutDay>)=>setDays(draft.days.map(day=>day.id===dayId?{...day,...value}:day));
 const addExercise=(dayId:string,exerciseId:string)=>setDays(draft.days.map(day=>day.id===dayId?{...day,exercises:[...day.exercises,{id:uid("workout-exercise"),exerciseId,order:day.exercises.length,sets:"3",reps:"8-12",rest:"90 שניות",notes:"",setPrescriptions:prescriptions("3","8-12")}]}:day));
 const patchExercise=(dayId:string,exerciseId:string,value:Partial<WorkoutExercise>)=>setDays(draft.days.map(day=>day.id===dayId?{...day,exercises:day.exercises.map(exercise=>exercise.id===exerciseId?{...exercise,...value}:exercise)}:day));
 const removeExercise=(dayId:string,exerciseId:string)=>setDays(draft.days.map(day=>day.id===dayId?{...day,exercises:day.exercises.filter(exercise=>exercise.id!==exerciseId)}:day));
 const moveExercise=(dayId:string,index:number,direction:-1|1)=>{setDays(draft.days.map(day=>{if(day.id!==dayId)return day;const target=index+direction;if(target<0||target>=day.exercises.length)return day;const next=[...day.exercises];[next[index],next[target]]=[next[target],next[index]];return{...day,exercises:next}}))};
 const changeSets=(dayId:string,exercise:WorkoutExercise,sets:string)=>{const count=Math.max(0,Math.min(12,Number.parseInt(sets,10)||0));patchExercise(dayId,exercise.id,{sets:sets||undefined,setPrescriptions:count?prescriptions(String(count),exercise.reps??""):[]})};

 // Duplicating keeps the prescription and the notes; only the identity changes,
 // so the copy is a genuine second slot rather than a shared reference.
 const duplicateExercise=(dayId:string,exerciseId:string)=>setDays(draft.days.map(day=>{
   if(day.id!==dayId)return day;
   const index=day.exercises.findIndex(exercise=>exercise.id===exerciseId);
   if(index<0)return day;
   const source=day.exercises[index];
   const copy:WorkoutExercise={...source,id:uid("workout-exercise"),setPrescriptions:source.setPrescriptions?.map(set=>({...set,id:uid("set")}))};
   const next=[...day.exercises];
   next.splice(index+1,0,copy);
   return{...day,exercises:next};
 }));

 // Swapping the exercise keeps everything the coach already typed - sets, reps,
 // rest, notes - because the prescription belongs to the slot, not to the
 // exercise that happens to occupy it.
 const replaceExercise=(dayId:string,slotId:string,exerciseId:string)=>{
   patchExercise(dayId,slotId,{exerciseId});
   setReplacing(null);
 };

 const moveExerciseToDay=(fromDayId:string,slotId:string,toDayId:string)=>{
   if(fromDayId===toDayId)return;
   const source=draft.days.find(day=>day.id===fromDayId)?.exercises.find(exercise=>exercise.id===slotId);
   if(!source)return;
   setDays(draft.days.map(day=>{
     if(day.id===fromDayId)return{...day,exercises:day.exercises.filter(exercise=>exercise.id!==slotId)};
     if(day.id===toDayId)return{...day,exercises:[...day.exercises,source]};
     return day;
   }));
 };

 // Dropping onto a row inserts before it; dropping onto a day's empty area
 // appends. Both work across days, which is what makes drag the fast path for
 // "this belongs in the other workout".
 const dropOn=(targetDayId:string,targetSlotId:string|null)=>{
   const origin=dragging;
   setDragging(null);
   if(!origin)return;
   if(origin.dayId===targetDayId&&origin.exerciseId===targetSlotId)return;
   const source=draft.days.find(day=>day.id===origin.dayId)?.exercises.find(exercise=>exercise.id===origin.exerciseId);
   if(!source)return;
   setDays(draft.days.map(day=>{
     const withoutSource=day.id===origin.dayId?day.exercises.filter(exercise=>exercise.id!==origin.exerciseId):day.exercises;
     if(day.id!==targetDayId)return{...day,exercises:withoutSource};
     if(!targetSlotId)return{...day,exercises:[...withoutSource,source]};
     const index=withoutSource.findIndex(exercise=>exercise.id===targetSlotId);
     const next=[...withoutSource];
     next.splice(index<0?next.length:index,0,source);
     return{...day,exercises:next};
   }));
 };

 return <main className="client-app-content">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <p className="text-xs font-black tracking-widest text-[#16A34A]">תוכנית אימונים</p>
      <h1 className="mt-2 text-3xl font-black">{draft.name||"תוכנית חדשה"}</h1>
    </div>
    <button type="button" disabled={saving||!draft.name.trim()||!draft.days.length} onClick={onSave} className="premium-primary-button"><Save aria-hidden="true" size={18}/>{saving?"שומרים…":"שמירת תוכנית"}</button>
  </div>
  {message&&<p role="status" className="mt-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm">{message}</p>}

  <section className="premium-card mt-6 grid gap-3 sm:grid-cols-2">
    <Input label="שם התוכנית" value={draft.name} onChange={name=>patch({name})}/>
    <Input label="תיאור" value={draft.description??""} onChange={description=>patch({description})}/>
    <Input label="סוג" value={draft.programType??""} onChange={programType=>patch({programType})}/>
    <Input label="רמה" value={draft.difficulty??""} onChange={difficulty=>patch({difficulty})}/>
    <Input label="תדירות שבועית" type="number" value={String(draft.trainingFrequency??"")} onChange={value=>patch({trainingFrequency:value?Math.min(7,Math.max(1,Number(value))):undefined})}/>
    <Input label="ציוד (מופרד בפסיקים)" value={draft.equipment.join(", ")} onChange={value=>patch({equipment:value.split(",").map(item=>item.trim()).filter(Boolean)})}/>
  </section>

  <section className="premium-card mt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-black">מאגר תרגילים</h2>
        <p className="mt-1 text-sm text-[#5B5F5B]">חיפוש, בחירה והוספה ליום אימון.</p>
      </div>
      <label className="food-picker__search min-w-60">
        <Search aria-hidden="true" size={17}/>
        <input className="nutrition-input" value={query} onChange={event=>setQuery(event.target.value)} placeholder="חיפוש תרגיל או קבוצת שריר" aria-label="חיפוש תרגיל"/>
      </label>
    </div>
    <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
      {choices.map(exercise=>
        <div key={exercise.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F8F7] p-3">
          <span className="min-w-0 text-sm">
            <strong className="block truncate">{exercise.name}</strong>
            <small className="mt-1 block text-[#5B5F5B]">{exercise.primaryMuscleGroup??exercise.category??"ללא סיווג"}</small>
          </span>
          <select aria-label={`הוספת ${exercise.name} ליום`} className="min-h-11 shrink-0 rounded-lg border border-[#E5E7E5] bg-[#FFFFFF] px-2 text-xs" defaultValue="" onChange={event=>{if(event.target.value){addExercise(event.target.value,exercise.id);event.currentTarget.value=""}}}>
            <option value="">הוספה ליום…</option>
            {draft.days.map(day=><option key={day.id} value={day.id}>{day.name}</option>)}
          </select>
        </div>
      )}
    </div>
  </section>

  <div className="mt-6 grid gap-4">
    {draft.days.map((day,dayIndex)=>
      <section key={day.id} className="premium-card" onDragOver={event=>{if(dragging)event.preventDefault()}} onDrop={()=>dropOn(day.id,null)}>
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="שם יום אימון" className="nutrition-input max-w-sm font-black" value={day.name} onChange={event=>patchDay(day.id,{name:event.target.value})}/>
          <button aria-label="הזזת יום למעלה" className="icon-button" disabled={dayIndex===0} onClick={()=>moveDay(dayIndex,-1)}><ChevronUp aria-hidden="true" size={18}/></button>
          <button aria-label="הזזת יום למטה" className="icon-button" disabled={dayIndex===draft.days.length-1} onClick={()=>moveDay(dayIndex,1)}><ChevronDown aria-hidden="true" size={18}/></button>
          <button aria-label="מחיקת יום אימון" className="icon-button text-[#DC2626]" disabled={draft.days.length===1} onClick={()=>setDays(draft.days.filter(item=>item.id!==day.id))}><Trash2 aria-hidden="true" size={18}/></button>
          <span className="mr-auto text-sm text-[#5B5F5B]">{day.exercises.length} תרגילים</span>
        </div>

        <div className="mt-4 grid gap-3">
          {day.exercises.map((entry,index)=>{
            const exercise=snapshot.exercises.find(item=>item.id===entry.exerciseId);
            const isReplacing=replacing?.dayId===day.id&&replacing.exerciseId===entry.id;
            return <article
              key={entry.id}
              draggable
              onDragStart={()=>setDragging({dayId:day.id,exerciseId:entry.id})}
              onDragEnd={()=>setDragging(null)}
              onDragOver={event=>{if(dragging)event.preventDefault()}}
              onDrop={event=>{event.stopPropagation();dropOn(day.id,entry.id)}}
              data-dragging={dragging?.exerciseId===entry.id||undefined}
              className="exercise-slot"
            >
              <div className="flex flex-wrap items-center gap-2">
                {/* The handle is decoration for a mouse; the buttons beside it are
                    what actually work on a phone, where HTML5 drag does not fire. */}
                <span className="exercise-slot__handle" aria-hidden="true"><GripVertical size={16}/></span>
                <strong className="min-w-0 truncate">{exercise?.name??"תרגיל"}</strong>
                <span className="pill pill--green">{exercise?.primaryMuscleGroup??exercise?.category??"לא סווג"}</span>
                <ExerciseGuidanceButton exercise={exercise} variant="link"/>
                <button aria-label="הזזת תרגיל למעלה" className="icon-button mr-auto" disabled={index===0} onClick={()=>moveExercise(day.id,index,-1)}><ChevronUp aria-hidden="true" size={16}/></button>
                <button aria-label="הזזת תרגיל למטה" className="icon-button" disabled={index===day.exercises.length-1} onClick={()=>moveExercise(day.id,index,1)}><ChevronDown aria-hidden="true" size={16}/></button>
                <button aria-label={`החלפת ${exercise?.name??"תרגיל"}`} className="icon-button" onClick={()=>setReplacing(isReplacing?null:{dayId:day.id,exerciseId:entry.id})}><Repeat aria-hidden="true" size={16}/></button>
                <button aria-label={`שכפול ${exercise?.name??"תרגיל"}`} className="icon-button" onClick={()=>duplicateExercise(day.id,entry.id)}><Copy aria-hidden="true" size={16}/></button>
                <button aria-label="מחיקת תרגיל" className="icon-button text-[#DC2626]" onClick={()=>removeExercise(day.id,entry.id)}><Trash2 aria-hidden="true" size={16}/></button>
              </div>

              {isReplacing&&
                <label className="mt-3 block text-xs font-bold">החלפה בתרגיל אחר
                  <select
                    aria-label={`בחירת תרגיל חלופי ל${exercise?.name??"תרגיל"}`}
                    className="nutrition-input mt-1"
                    defaultValue=""
                    onChange={event=>{if(event.target.value)replaceExercise(day.id,entry.id,event.target.value)}}
                  >
                    <option value="">בחרו תרגיל…</option>
                    {snapshot.exercises.filter(item=>item.status==="active").map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  <small className="mt-1 block font-normal text-[#5B5F5B]">הסטים, החזרות, המנוחה וההערה נשמרים.</small>
                </label>}

              {draft.days.length>1&&
                <label className="mt-3 block text-xs font-bold">העברה ליום אחר
                  <select
                    aria-label={`העברת ${exercise?.name??"תרגיל"} ליום אחר`}
                    className="nutrition-input mt-1"
                    value=""
                    onChange={event=>{if(event.target.value)moveExerciseToDay(day.id,entry.id,event.target.value)}}
                  >
                    <option value="">בחרו יום…</option>
                    {draft.days.filter(item=>item.id!==day.id).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>}

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <Input label="סטים" type="number" value={entry.sets??""} onChange={sets=>changeSets(day.id,entry,sets)}/>
                <Input label="טווח חזרות" value={entry.reps??""} onChange={reps=>patchExercise(day.id,entry.id,{reps,setPrescriptions:prescriptions(entry.sets??"",reps)})}/>
                <Input label="מנוחה" value={entry.rest??""} onChange={rest=>patchExercise(day.id,entry.id,{rest})}/>
                <Input label="טכניקה / הערה" value={entry.notes??""} onChange={notes=>patchExercise(day.id,entry.id,{notes})}/>
              </div>
            </article>;
          })}
          {!day.exercises.length&&<p className="rounded-xl border border-dashed border-[#E5E7E5] p-4 text-sm text-[#5B5F5B]">חפשו תרגיל במאגר ובחרו את היום הזה, או גררו תרגיל מיום אחר.</p>}
        </div>
      </section>
    )}
  </div>

  <button type="button" onClick={addDay} className="premium-secondary-button mt-5"><Plus aria-hidden="true" size={18}/>הוספת יום אימון</button>
 </main>;
}

function prescriptions(sets:string,repetitions:string):WorkoutSetPrescription[]{const count=Math.max(0,Math.min(12,Number.parseInt(sets,10)||0));return Array.from({length:count},(_,order)=>({id:uid("set"),order,repetitions:repetitions||undefined}));}
function Input({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:string}){return <label className="block text-xs font-bold text-[#3F433F]">{label}<input className="nutrition-input mt-1" type={type} min={type==="number"?"0":undefined} value={value} onChange={event=>onChange(event.target.value)}/></label>}
