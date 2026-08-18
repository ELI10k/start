"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import type { AssignmentStatus } from "@/lib/workouts/types";
const labels:Record<AssignmentStatus,string>={active:"פעיל",paused:"מושהה",completed:"הושלם",archived:"בארכיון"};
export default function CoachWorkoutProgram({id}:{id:string}){const{getProgram,assign,snapshot,setAssignmentStatus}=useWorkouts();const router=useRouter();const program=getProgram(id);const clients=snapshot.clients;const today=new Date().toISOString().slice(0,10);const[clientId,setClientId]=useState("");const[startDate,setStartDate]=useState(today);const[endDate,setEndDate]=useState("");const[frequency,setFrequency]=useState(String(program?.trainingFrequency??""));const[note,setNote]=useState("");const[replaceActive,setReplaceActive]=useState(true);const[message,setMessage]=useState("");const[submitting,setSubmitting]=useState(false);const assignments=useMemo(()=>snapshot.assignments.filter((item)=>item.programId===id).sort((a,b)=>b.assignedAt.localeCompare(a.assignedAt)),[id,snapshot.assignments]);if(!program)notFound();const submit=async()=>{if(submitting)return;if(!clientId){setMessage("יש לבחור לקוח.");return}if(!frequency||Number(frequency)<1||Number(frequency)>7){setMessage("יש לבחור תדירות שבועית בין 1 ל־7.");return}if(endDate&&endDate<startDate){setMessage("תאריך הסיום לא יכול להיות מוקדם מתאריך ההתחלה.");return}setSubmitting(true);try{const ok=await assign({clientId,programId:program.id,startDate,endDate:endDate||undefined,weeklyFrequency:Number(frequency),coachNote:note||undefined,replaceActive});setMessage(ok?"התוכנית שויכה ונשמרה ב-Supabase.":"כבר קיים שיוך פעיל זהה או שהנתונים אינם תקינים.")}finally{setSubmitting(false)}};return <main className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold text-[#16A34A]">{program.official?"תוכנית רשמית משותפת":"עותק מותאם"} · {program.sourceWorkbook}</p><h1 className="mt-2 text-3xl font-black">{program.name}</h1><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Summary label="אימונים שונים" value={String(program.days.length)}/><Summary label="תרגילים" value={String(program.days.reduce((sum,day)=>sum+day.exercises.length,0))}/><Summary label="רמה" value={program.difficulty??"לא צוינה"}/><Summary label="תדירות" value={program.trainingFrequency?`${program.trainingFrequency} בשבוע`:"לא צוינה"}/></div><section className="mt-6 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"><h2 className="font-black">שיוך ללקוח</h2><p className="mt-2 text-sm text-[#5B5F5B]">יש לעבור על ימי האימון לפני השיוך. אפשר להחליף את התוכנית הפעילה או להוסיף את זו לצידה - ללקוח יכולות להיות כמה תוכניות פעילות במקביל.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">לקוח<select className="nutrition-input mt-2" value={clientId} onChange={(event)=>{setClientId(event.target.value);setMessage("")}}><option value="">בחירת לקוח</option>{clients.map((client)=><option key={client.id} value={client.id}>{client.fullName}</option>)}</select></label><label className="text-sm font-bold">אימונים בשבוע<input className="nutrition-input mt-2" type="number" min="1" max="7" value={frequency} onChange={(event)=>setFrequency(event.target.value)}/><small className="mt-1 block font-normal text-[#5B5F5B]">{program.days.length===1?"התוכנית בנויה מאימון אחד שחוזר":`התוכנית בנויה מ־${program.days.length} אימונים שונים בסבב`} · ברירת המחדל מהמקור: {program.trainingFrequency??"—"}</small></label><label className="text-sm font-bold">תאריך התחלה<input className="nutrition-input mt-2" type="date" value={startDate} onChange={(event)=>setStartDate(event.target.value)}/></label><label className="text-sm font-bold">תאריך סיום (רשות)<input className="nutrition-input mt-2" type="date" min={startDate} value={endDate} onChange={(event)=>setEndDate(event.target.value)}/></label><label className="text-sm font-bold sm:col-span-2">הערת מאמן<textarea className="nutrition-input mt-2 min-h-24" value={note} onChange={(event)=>setNote(event.target.value)}/></label></div><fieldset className="mt-4 rounded-2xl border border-[#E5E7E5] p-4"><legend className="px-1 text-sm font-bold">מה לעשות עם תוכנית פעילה קיימת</legend><label className="mt-2 flex items-start gap-2 text-sm"><input type="radio" name="replace-active" className="mt-1" checked={replaceActive} onChange={()=>{setReplaceActive(true);setMessage("")}}/><span><strong className="block">להחליף את התוכנית הפעילה</strong><small className="text-[#5B5F5B]">התוכנית הקודמת עוברת להיסטוריה ונשמרת.</small></span></label><label className="mt-3 flex items-start gap-2 text-sm"><input type="radio" name="replace-active" className="mt-1" checked={!replaceActive} onChange={()=>{setReplaceActive(false);setMessage("")}}/><span><strong className="block">להוסיף כתוכנית נוספת</strong><small className="text-[#5B5F5B]">הלקוח מתאמן בשתי התוכניות ובוחר ביניהן במסך האימונים.</small></span></label></fieldset><button disabled={program.status!=="active"||submitting} onClick={submit} className="mt-4 min-h-12 rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF] disabled:opacity-40">{submitting?"משייכים…":"שיוך התוכנית"}</button>{message&&<p role="status" className={`mt-3 text-sm ${message.includes("נשמרה")?"text-[#16A34A]":"text-[#DC2626]"}`}>{message}</p>}</section><section className="mt-6"><h2 className="text-xl font-black">ימי התוכנית</h2><div className="mt-3 space-y-3">{[...program.days].sort((a,b)=>a.order-b.order).map((day)=><Link key={day.id} href={`/coach/workouts/${program.id}/days/${day.id}`} className="block rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 hover:border-[#16A34A]/50"><span className="text-xs text-[#5B5F5B]">יום {day.order+1}</span><h3 className="mt-1 text-xl font-black">{day.name}</h3><p className="mt-2 text-sm text-[#5B5F5B]">{day.exercises.length} תרגילים</p></Link>)}</div></section><section className="mt-6 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"><h2 className="text-xl font-black">היסטוריית שיוכים</h2>{assignments.length?<div className="mt-3 space-y-3">{assignments.map((assignment)=>{const client=clients.find((item)=>item.id===assignment.clientId);return <article key={assignment.id} className="rounded-2xl border border-[#E5E7E5] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{client?.fullName??assignment.clientId}</strong><p className="mt-1 text-xs text-[#5B5F5B]">{assignment.startDate} — {assignment.endDate??"ללא תאריך סיום"} · {assignment.weeklyFrequency} בשבוע</p></div><span className="rounded-full border border-[#E5E7E5] px-3 py-1 text-xs">{labels[assignment.status]}</span></div>{assignment.coachNote&&<p className="mt-3 text-sm text-[#5B5F5B]">{assignment.coachNote}</p>}{(assignment.status==="active"||assignment.status==="paused")&&<FrequencyControl assignmentId={assignment.id} current={assignment.weeklyFrequency} days={program.days.length}/>}{assignment.status==="active"&&<PersonalCopy programId={program.id} clientId={assignment.clientId} clientName={client?.fullName??""} startDate={assignment.startDate} weeklyFrequency={assignment.weeklyFrequency} coachNote={assignment.coachNote} onDone={(id)=>router.push(`/coach/workouts/${id}#program-editor`)}/>}<div className="mt-3 flex flex-wrap gap-2">{assignment.status==="active"&&<Action label="השהיה" onClick={()=>setAssignmentStatus(assignment.id,"paused")}/>} {assignment.status==="paused"&&<Action label="חידוש" onClick={()=>setAssignmentStatus(assignment.id,"active")}/>} {(assignment.status==="active"||assignment.status==="paused")&&<Action label="סיום" onClick={()=>setAssignmentStatus(assignment.id,"completed")}/>} {assignment.status!=="archived"&&<Action label="ארכיון" onClick={()=>setAssignmentStatus(assignment.id,"archived")}/>}</div></article>})}</div>:<p className="mt-3 text-sm text-[#5B5F5B]">אין שיוכים קודמים לתוכנית.</p>}</section></div></main>}
// Frequency belongs to the client, not to the programme: the same A-B-C runs at
// three sessions a week for one client and four for another. Editing it here
// keeps the assignment - and with it the adherence history and every scheduled
// move - instead of forcing a re-assign that archives them.
function FrequencyControl({assignmentId,current,days}:{assignmentId:string;current:number;days:number}){
  const{setAssignmentFrequency}=useWorkouts();
  const[value,setValue]=useState(String(current));
  const[message,setMessage]=useState("");
  const[saving,setSaving]=useState(false);
  const dirty=value!==String(current);
  const submit=async()=>{
    const next=Number(value);
    if(!Number.isInteger(next)||next<1||next>7){setMessage("תדירות בין 1 ל־7.");return}
    setSaving(true);setMessage("");
    const ok=await setAssignmentFrequency(assignmentId,next);
    setSaving(false);
    setMessage(ok?"התדירות עודכנה ללקוח הזה.":"עדכון התדירות נכשל.");
  };
  return <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-[#F7F8F7] p-3">
    <label className="text-xs font-bold text-[#3F433F]">אימונים בשבוע ללקוח הזה
      <input className="nutrition-input mt-1 max-w-24" type="number" min="1" max="7" value={value} onChange={(event)=>{setValue(event.target.value);setMessage("")}}/>
    </label>
    <button type="button" onClick={submit} disabled={saving||!dirty} className="min-h-11 rounded-xl border border-[#16A34A] px-3 text-xs font-bold text-[#16A34A] disabled:opacity-40">{saving?"שומרים…":"עדכון תדירות"}</button>
    <span className="text-xs text-[#5B5F5B]">{days===1?"אימון אחד שחוזר במהלך השבוע":`${days} אימונים שונים בסבב`}</span>
    {message&&<p role="status" className="w-full text-xs font-bold text-[#16A34A]">{message}</p>}
  </div>;
}
function Summary({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-[#E5E7E5] bg-[#FFFFFF] p-4"><span className="text-xs text-[#5B5F5B]">{label}</span><strong className="mt-1 block">{value}</strong></div>};function Action({label,onClick}:{label:string;onClick:()=>void}){return <button onClick={onClick} className="min-h-10 rounded-xl border border-[#E5E7E5] px-3 text-xs font-bold">{label}</button>}

// Editing a programme a client is already training on changes it for every other
// client on the same programme. This makes the client their own copy first -
// same days, same prescriptions - reassigns them to it, and opens the editor on
// the copy. The shared programme is left exactly as it was.
function PersonalCopy({programId,clientId,clientName,startDate,weeklyFrequency,coachNote,onDone}:{programId:string;clientId:string;clientName:string;startDate:string;weeklyFrequency:number;coachNote?:string;onDone:(programId:string)=>void}){
  const{duplicate,assign,saveProgram,getProgram}=useWorkouts();
  const[working,setWorking]=useState(false);
  const[message,setMessage]=useState("");
  const run=async()=>{
    setWorking(true);setMessage("");
    try{
      const copyId=await duplicate(programId);
      if(!copyId){setMessage("לא ניתן היה ליצור עותק אישי.");return}
      const copy=getProgram(copyId);
      // The generic "— עותק" name is useless once a coach has three of them.
      if(copy&&clientName)await saveProgram({...copy,name:`${getProgram(programId)?.name??copy.name} — ${clientName}`});
      const ok=await assign({clientId,programId:copyId,startDate,weeklyFrequency,coachNote,replaceActive:true});
      if(!ok){setMessage("העותק נוצר אך השיוך נכשל. אפשר לשייך אותו ידנית.");return}
      onDone(copyId);
    }finally{setWorking(false)}
  };
  return <div className="mt-3 rounded-xl bg-[#F7F8F7] p-3">
    <button type="button" onClick={run} disabled={working} className="min-h-11 rounded-xl border border-[#16A34A] px-3 text-xs font-bold text-[#16A34A] disabled:opacity-40">{working?"יוצרים עותק…":"עותק אישי ללקוח ועריכה"}</button>
    <p className="mt-2 text-xs text-[#5B5F5B]">יוצר ללקוח תוכנית משלו, משייך אותה במקום הנוכחית ופותח אותה לעריכה. התוכנית המשותפת נשארת ללא שינוי.</p>
    {message&&<p role="status" className="mt-2 text-xs font-bold text-[#DC2626]">{message}</p>}
  </div>;
}
