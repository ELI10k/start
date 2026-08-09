"use client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { exercisePerformance } from "@/lib/workouts/progress";

export default function AssignedProgram({programId}:{programId:string}){
  const{snapshot,currentClientId,getProgram,getExercise}=useWorkouts();const program=getProgram(programId);const assignment=snapshot.assignments.find((item)=>item.clientId===currentClientId&&item.programId===programId&&item.status!=="archived");const[dayId,setDayId]=useState(program?.days[0]?.id??"");
  if(!program)notFound();
  const day=program.days.find((item)=>item.id===dayId)??program.days[0];

  return <main className="client-app-content">
    <header className="premium-page-header">
      <div>
        <p>התוכנית שלי</p>
        <h1>{program.name}</h1>
        {program.description&&<span>{program.description}</span>}
      </div>
    </header>

    <dl className="dashboard-metrics" aria-label="פרטי התוכנית">
      <Info label="רמה" value={program.difficulty}/>
      <Info label="תדירות" value={assignment?`${assignment.weeklyFrequency} בשבוע`:program.trainingFrequency?`${program.trainingFrequency} בשבוע`:undefined}/>
      <Info label="התחלה" value={assignment?.startDate}/>
      <Info label="סיום" value={assignment?.endDate}/>
    </dl>

    {!assignment&&<p role="alert" className="mt-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm">התוכנית זמינה לצפייה אך אינה מוקצית לך כעת.</p>}

    {/* Days scroll horizontally: a programme with six days must not wrap into a
        block of buttons that pushes the exercises off the screen. */}
    <div className="chip-row mt-5">
      {program.days.map((item)=>
        <button key={item.id} type="button" onClick={()=>setDayId(item.id)} aria-pressed={item.id===day?.id} className="chip">{item.name}</button>
      )}
    </div>

    {day?<section aria-labelledby="program-day">
      <div className="section-heading">
        <div>
          <h2 id="program-day">{day.name}</h2>
          <span>{day.exercises.length} תרגילים לפי סדר המקור</span>
        </div>
      </div>

      <div className="grid gap-3">
        {[...day.exercises].sort((a,b)=>a.order-b.order).map((entry)=>{
          const exercise=getExercise(entry.exerciseId);
          const previous=exercisePerformance(snapshot.completedWorkouts,currentClientId,entry.exerciseId).sessions[0];
          const completed=snapshot.completedWorkouts.some((item)=>item.clientId===currentClientId&&item.dayId===day.id);
          return <article key={entry.id} className="premium-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs text-[#5B5F5B]">{entry.order+1}{completed?" · בוצע בעבר":""}</span>
                <h3 className="mt-1 text-lg font-black">{exercise?.name??"פרטי תרגיל חסרים"}</h3>
                <p className="mt-1 text-xs text-[#5B5F5B]">{[exercise?.primaryMuscleGroup,exercise?.equipment].filter(Boolean).join(" · ")||"מטא־דאטה לא סופק בקובץ המקור"}</p>
              </div>
              {exercise?.video&&<a href={exercise.video.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#16A34A]">וידאו<ExternalLink aria-hidden="true" size={14}/></a>}
            </div>
            <dl className="compact-data-list mt-3">
              <div><span>סטים</span><strong>{entry.sets||"—"}</strong></div>
              <div><span>חזרות</span><strong>{entry.reps||"—"}</strong></div>
              <div><span>מנוחה</span><strong>{entry.rest||"—"}</strong></div>
            </dl>
            {entry.notes&&<p className="mt-3 text-sm text-[#5B5F5B]">{entry.notes}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B5F5B]">
              <span>{previous?`ביצוע קודם: ${new Date(previous.date).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})} · נפח ${previous.volume}`:"אין ביצוע קודם"}</span>
              <Link href={`/workouts/exercises/${entry.exerciseId}?programId=${program.id}&dayId=${day.id}`} className="chip">פרטי תרגיל</Link>
            </div>
          </article>;
        })}
      </div>

      {assignment?.status==="active"&&
        <Link href={`/workouts/${program.id}/${day.id}`} className="fab" aria-label="התחלת האימון">
          <Play aria-hidden="true" size={18}/>התחלת האימון
        </Link>}
    </section>
    :<StateBlock title="לא נמצאו ימי אימון בתוכנית" description="מקור התוכנית אינו כולל ימי אימון."/>}
  </main>;
}

function Info({label,value}:{label:string;value?:string}){
  return <div className="metric-tile"><dt className="metric-tile__head"><span>{label}</span></dt><dd><strong>{value||"—"}</strong></dd></div>;
}
