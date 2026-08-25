"use client";

import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { exercisePerformance } from "@/lib/workouts/progress";
import type { ExerciseSetResult } from "@/lib/workouts/types";

type Metric = "weight" | "volume" | "reps";
type Session = ReturnType<typeof exercisePerformance>["sessions"][number];

const number = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 2 });
const date = (value:string,short=false)=>new Date(value).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem",
  ...(short?{day:"2-digit",month:"2-digit"}:{day:"numeric",month:"numeric",year:"numeric"}),
});
const completedSets=(sets:readonly ExerciseSetResult[])=>sets.filter((set)=>set.completed);
const topWeight=(session?:Session)=>Math.max(0,...completedSets(session?.sets??[]).map((set)=>set.weightKg??0));
const topReps=(session?:Session)=>Math.max(0,...completedSets(session?.sets??[]).map((set)=>set.repetitions??0));
const repSignature=(session?:Session)=>completedSets(session?.sets??[]).map((set)=>set.repetitions??0).join("-");
const metricValue=(session:Session,metric:Metric)=>metric==="volume"?session.volume:metric==="reps"?topReps(session):topWeight(session);
const signedPercent=(current:number,previous:number)=>previous>0?Math.round((current-previous)/previous*100):0;
const roundToPlate=(value:number)=>Math.round(value/2.5)*2.5;

export default function ExerciseProgress(){
  const{snapshot,currentClientId,getExercise}=useWorkouts();
  const ids=useMemo(()=>[...new Set(snapshot.completedWorkouts
    .filter((item)=>item.clientId===currentClientId)
    .flatMap((item)=>item.exerciseResults.map((result)=>result.exerciseId)))],
  [currentClientId,snapshot.completedWorkouts]);
  const[exerciseId,setExerciseId]=useState("");
  const[metric,setMetric]=useState<Metric>("weight");
  const selected=exerciseId||ids[0]||"";
  const history=exercisePerformance(snapshot.completedWorkouts,currentClientId,selected);
  const ordered=[...history.sessions].reverse();
  const latest=history.sessions[0];
  const latestSignature=repSignature(latest);
  // A 10-rep workout is not a fair baseline for a 12-rep workout. Prefer the
  // latest session with the same completed-set/repetition structure, so an
  // alternating programme is compared within its own rep day.
  const comparablePrevious=history.sessions.slice(1).find((item)=>repSignature(item)===latestSignature);
  const allSets=history.sessions.flatMap((item)=>completedSets(item.sets));
  const latestWeight=topWeight(latest);
  const latestReps=topReps(latest);
  const bestWeight=Math.max(0,...allSets.map((item)=>item.weightKg??0));
  const bestReps=Math.max(0,...allSets.map((item)=>item.repetitions??0));
  const bestVolume=Math.max(0,...history.sessions.map((item)=>item.volume));
  const volumeChange=comparablePrevious?signedPercent(latest?.volume??0,comparablePrevious.volume):0;
  const weightChange=comparablePrevious?signedPercent(latestWeight,topWeight(comparablePrevious)):0;
  const latestWorkout=latest?snapshot.completedWorkouts.find((item)=>item.id===latest.workoutId):undefined;
  const exerciseResult=latestWorkout?.exerciseResults.find((item)=>item.exerciseId===selected);
  const increase=exerciseResult?.difficulty==="easy"?5:latestWorkout?.perceivedDifficulty&&latestWorkout.perceivedDifficulty<=2?5:latestWorkout?.perceivedDifficulty===3?2.5:0;
  const challengeWeight=latestWeight?roundToPlate(latestWeight*(1+increase/100)):0;

  return <main className="px-4 py-8 text-[#0B0B0B]"><div className="mx-auto max-w-4xl">
    <header>
      <p className="text-sm font-bold text-[#16A34A]">הביצועים שלי</p>
      <h1 className="mt-1 text-3xl font-black sm:text-4xl">התקדמות בתרגילים</h1>
      <p className="mt-2 text-sm text-[#5B5F5B]">כל מה שצריך לדעת כדי להגיע חזק יותר לאימון הבא.</p>
    </header>

    {!ids.length?<p className="mt-6 rounded-2xl border border-dashed border-[#E5E7E5] p-10 text-center text-[#5B5F5B]">לא קיימים אימונים שמורים, ולכן עדיין אין נתוני התקדמות.</p>:<>
      <label className="mt-6 block text-sm font-bold">בחירת תרגיל
        <select className="nutrition-input mt-2" value={selected} onChange={(event)=>setExerciseId(event.target.value)}>
          {ids.map((id)=><option value={id} key={id}>{getExercise(id)?.name??id}</option>)}
        </select>
      </label>

      {/* Where the last workout landed, before what to do about it.
          
          This sat under the tiles, and a solid green card above it said the same
          thing in different words - "עלייה של 4% מול ביצוע 10/10 קודם" over
          "המשקל עלה ... לעומת האימון הקודם" - while repeating the weight and the
          repetitions that the three tiles carry on their own. One reading, in the
          place a reading belongs: before the target it justifies. */}
      <Insight comparablePrevious={comparablePrevious} weightChange={weightChange} volumeChange={volumeChange} signature={latestSignature}/>

      <section className="mt-3 rounded-[24px] border border-[#BBF7D0] bg-[#F0FDF4] p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xl" aria-hidden="true">💪</span><div>
          <p className="text-xs font-bold text-[#15803D]">האתגר באימון הבא</p>
          <h3 className="mt-1 text-xl font-black">{challengeWeight&&latestReps?`${number.format(challengeWeight)} ק״ג × ${latestReps}`:"להשלים ביצוע נוסף"}</h3>
          <p className="mt-1 text-sm text-[#3F433F]">{increase>0?`המלצה לעלייה של ${increase}% לפי רמת הקושי שסומנה.`:"לשמור על המשקל ולנסות ביצוע נקי ויציב יותר."}</p>
        </div></div>
      </section>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Info label="משקל אחרון" value={latestWeight?`${number.format(latestWeight)} ק״ג`:undefined}/>
        <Info label="חזרות אחרונות" value={latestReps?String(latestReps):undefined}/>
        <Info label="שיא אישי" value={bestWeight?`${number.format(bestWeight)} ק״ג`:undefined} accent/>
      </dl>

      <section className="mt-5 rounded-[24px] border border-[#E5E7E5] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-black">מגמת ביצועים</h3><p className="mt-1 text-xs text-[#5B5F5B]">האימונים מוצגים מהישן לחדש</p></div>
          <div className="flex rounded-xl bg-[#F1F3F1] p-1" role="group" aria-label="בחירת מדד לגרף">
            {([['weight','משקל'],['volume','נפח'],['reps','חזרות']] as const).map(([value,label])=><button key={value} type="button" onClick={()=>setMetric(value)} aria-pressed={metric===value} className={`min-h-11 min-w-11 rounded-lg px-3 text-xs font-bold ${metric===value?"bg-white text-[#0B0B0B] shadow-sm":"text-[#5B5F5B]"}`}>{label}</button>)}
          </div>
        </div>
        {ordered.length>1?<ProgressChart sessions={ordered} metric={metric}/>:<div className="mt-5 rounded-2xl bg-[#F7F8F7] p-8 text-center text-sm text-[#5B5F5B]">נשמר אימון אחד. הגרף יופיע לאחר האימון הבא.</div>}
      </section>

      <section className="mt-7" aria-labelledby="performance-history-title">
        <div className="flex items-end justify-between gap-3"><div><h2 id="performance-history-title" className="text-xl font-black">היסטוריית ביצועים</h2><p className="mt-1 text-xs text-[#5B5F5B]">לחיצה על אימון תציג את כל הסטים</p></div><span className="text-sm font-bold text-[#16A34A]">{history.sessions.length} אימונים</span></div>
        <div className="mt-3 grid gap-2">{history.sessions.map((item,index)=><HistoryCard key={item.workoutId} session={item} latest={index===0}/>)}</div>
      </section>

      <p className="mt-5 text-xs text-[#5B5F5B]">שיא נפח: {number.format(bestVolume)} ק״ג · שיא חזרות: {bestReps}</p>
    </>}
  </div></main>;
}

function Info({label,value,accent=false}:{label:string;value?:string;accent?:boolean}){return <div className={`rounded-2xl border p-3 ${accent?"border-[#BBF7D0] bg-[#F0FDF4]":"border-[#E5E7E5] bg-white"}`}><dt className="text-[11px] text-[#5B5F5B]">{label}</dt><dd className={`mt-1 text-sm font-black sm:text-base ${accent?"text-[#15803D]":""}`}>{value??"—"}</dd></div>}

function Insight({comparablePrevious,weightChange,volumeChange,signature}:{comparablePrevious?:Session;weightChange:number;volumeChange:number;signature:string}){
  if(!comparablePrevious)return <div className="mt-3 rounded-2xl bg-[#F7F8F7] p-4 text-sm text-[#5B5F5B]">עדיין אין ביצוע קודם עם אותו מבנה חזרות ({signature.replaceAll("-","/")}). ההשוואה תופיע אחרי ביצוע מקביל נוסף.</div>;
  const weightUp=weightChange>0;const volumeUp=volumeChange>0;const neutral=weightChange===0&&volumeChange===0;
  const Icon=neutral?BarChart3:weightUp||volumeUp?TrendingUp:TrendingDown;
  const title=neutral?"ביצוע יציב":weightUp?"המשקל עלה":volumeUp?"הנפח הכולל עלה":"ירידה קלה בביצוע";
  const body=weightUp&&volumeChange<0?`העלית משקל ב־${weightChange}%, והנפח ירד ב־${Math.abs(volumeChange)}% בגלל שינוי בכמות החזרות.`:volumeChange!==0?`הנפח הכולל ${volumeChange>0?"עלה":"ירד"} ב־${Math.abs(volumeChange)}% לעומת האימון הקודם.`:"המשקל והנפח נשארו ללא שינוי מהאימון הקודם.";
  return <section className={`mt-3 rounded-2xl border p-4 ${weightUp||volumeUp?"border-[#BBF7D0] bg-[#F0FDF4]":"border-[#E5E7E5] bg-[#F7F8F7]"}`}><div className="flex items-start gap-3"><Icon aria-hidden="true" className={weightUp||volumeUp?"text-[#16A34A]":"text-[#5B5F5B]"} size={20}/><div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-[#3F433F]">{body}</p><p className="mt-2 text-xs text-[#5B5F5B]">השוואה מול {date(comparablePrevious.date)} באותו מבנה חזרות: {signature.replaceAll("-","/")}.</p></div></div></section>;
}

function ProgressChart({sessions,metric}:{sessions:readonly Session[];metric:Metric}){
  const values=sessions.map((item)=>metricValue(item,metric));
  const max=Math.max(...values);const min=Math.min(...values);const range=Math.max(1,max-min);
  const points=values.map((value,index)=>({x:28+index*(544/Math.max(1,values.length-1)),y:145-((value-min)/range)*105,value,session:sessions[index]}));
  const label=metric==="weight"?"ק״ג":metric==="volume"?"ק״ג נפח":"חזרות";
  return <div className="mt-4 overflow-x-auto"><div className="min-w-[520px]" role="img" aria-label={`גרף ${label} לפי אימון`}>
    <svg viewBox="0 0 600 180" className="h-44 w-full" aria-hidden="true">
      {[40,92,145].map((y)=><line key={y} x1="28" x2="572" y1={y} y2={y} stroke="#E5E7E5" strokeWidth="1"/>) }
      <polyline points={points.map((point)=>`${point.x},${point.y}`).join(" ")} fill="none" stroke="#16A34A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((point,index)=><g key={point.session.workoutId}><circle cx={point.x} cy={point.y} r="7" fill={index===points.length-1?"#16A34A":"#FFFFFF"} stroke="#16A34A" strokeWidth="4"/><text x={point.x} y={Math.max(16,point.y-14)} textAnchor="middle" fontSize="12" fontWeight="700" fill="#3F433F">{number.format(point.value)}</text></g>)}
    </svg>
    <div className="flex justify-between px-2 text-[11px] text-[#5B5F5B]">{sessions.map((item)=><span key={item.workoutId}>{date(item.date,true)}</span>)}</div>
  </div></div>;
}

function HistoryCard({session,latest}:{session:Session;latest:boolean}){
  const sets=completedSets(session.sets);const weight=topWeight(session);const reps=topReps(session);
  return <details className="group rounded-2xl border border-[#E5E7E5] bg-white p-4" open={false}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div><div className="flex items-center gap-2"><strong>{date(session.date)}</strong>{latest&&<span className="rounded-full bg-[#F0FDF4] px-2 py-1 text-[10px] font-bold text-[#15803D]">האחרון</span>}</div><p className="mt-1 text-sm text-[#5B5F5B]">{number.format(weight)} ק״ג × {reps} · {sets.length} סטים · נפח {number.format(session.volume)}</p></div><ChevronDown aria-hidden="true" size={18} className="shrink-0 transition group-open:rotate-180"/></summary>
    <div className="mt-3 grid gap-2 border-t border-[#E5E7E5] pt-3">{sets.map((set,index)=><div key={set.id} className="flex justify-between rounded-xl bg-[#F7F8F7] px-3 py-2 text-sm"><span>סט {index+1}</span><strong>{number.format(set.weightKg??0)} ק״ג × {set.repetitions??0}</strong></div>)}</div>
  </details>;
}
