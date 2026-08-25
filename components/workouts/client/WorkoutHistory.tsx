"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Dumbbell, SlidersHorizontal, XCircle } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { StateBlock } from "@/components/client/AppPatterns";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { trainingWeekStart } from "@/lib/workouts/progress";

const israelDate=(value:string)=>new Date(value).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"});
const addDays=(dateKey:string,days:number)=>{const value=new Date(`${dateKey}T12:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)};
const weekLabel=(start:string)=>{
  const current=trainingWeekStart(new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Jerusalem"}));
  if(start===current)return"השבוע";
  const previous=addDays(current,-7);
  if(start===previous)return"שבוע שעבר";
  return `${israelDate(`${start}T12:00:00`)}–${israelDate(`${addDays(start,6)}T12:00:00`)}`;
};

export default function WorkoutHistory(){const{snapshot,currentClientId}=useWorkouts();const[sort,setSort]=useState<"newest"|"oldest">("newest");const[date,setDate]=useState("");const[programId,setProgramId]=useState("");const[dayId,setDayId]=useState("");const[filters,setFilters]=useState(false);const programs=snapshot.programs.filter((program)=>snapshot.assignments.some((item)=>item.clientId===currentClientId&&item.programId===program.id));const entries=useMemo(()=>{
    const completed=snapshot.completedWorkouts
      .filter((item)=>item.clientId===currentClientId)
      .map((item)=>({kind:"completed" as const,date:item.completedAt,programId:item.programId,dayId:item.dayId,item}));
    const missed=snapshot.scheduleChanges
      .filter((item)=>item.clientId===currentClientId&&item.status==="skipped")
      .map((item)=>({kind:"missed" as const,date:`${item.originalDate}T23:59:59`,programId:item.programId,dayId:item.dayId,item}));
    return [...completed,...missed]
      .filter((entry)=>(!date||entry.date.startsWith(date))&&(!programId||entry.programId===programId)&&(!dayId||entry.dayId===dayId))
      .sort((a,b)=>sort==="newest"?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
  },[currentClientId,date,dayId,programId,snapshot.completedWorkouts,snapshot.scheduleChanges,sort]);
  // Four dropdowns stacked would be the whole first screen on a phone, so the
  // filters live in a sheet and the list gets the space.
  const active=[date&&"תאריך",programId&&"תוכנית",dayId&&"יום"].filter(Boolean).length;
  const clear=()=>{setDate("");setProgramId("");setDayId("")};
  const weeks=useMemo(()=>{const grouped=new Map<string,typeof entries>();for(const entry of entries){const start=trainingWeekStart(entry.date.slice(0,10));grouped.set(start,[...(grouped.get(start)??[]),entry])}return [...grouped].map(([start,items])=>({start,items}))},[entries]);

  return <>
    <div className="chip-row">
      <button type="button" className="chip" aria-pressed={active>0} onClick={()=>setFilters(true)}>
        <SlidersHorizontal aria-hidden="true" size={15}/>סינון{active?` (${active})`:""}
      </button>
      <button type="button" className="chip" aria-pressed={sort==="newest"} onClick={()=>setSort("newest")}>החדש ביותר</button>
      <button type="button" className="chip" aria-pressed={sort==="oldest"} onClick={()=>setSort("oldest")}>הישן ביותר</button>
    </div>

    {entries.length?
      <div className="workout-history-weeks">
        {weeks.map((week)=><section key={week.start} aria-labelledby={`week-${week.start}`}>
          <div className="section-heading section-heading--compact"><h2 id={`week-${week.start}`}>{weekLabel(week.start)}</h2><span>{week.items.length} אימונים</span></div>
          <div className="app-list workout-history-list">
        {week.items.map((entry)=>{const program=snapshot.programs.find((item)=>item.id===entry.programId);const day=program?.days.find((item)=>item.id===entry.dayId);
          if(entry.kind==="missed")return <div className="workout-history-missed" key={`missed-${entry.item.id}`}>
            <span className="app-list__icon"><XCircle aria-hidden="true" size={17}/></span>
            <span className="app-list__main"><strong>{day?.name??"אימון"}</strong><span>{program?.name??"תוכנית לא זמינה"}{entry.item.skippedReason?` · ${entry.item.skippedReason}`:""}</span><span className="workout-history-facts"><b>פוספס</b> · {israelDate(`${entry.item.originalDate}T12:00:00`)}</span></span>
          </div>;
          const exercises=entry.item.exerciseResults.filter((item)=>item.completed).length;const skipped=entry.item.exerciseResults.filter((item)=>item.skipped).length;
          return <Link href={`/workouts/history/${entry.item.id}`} key={entry.item.id}>
            <span className="app-list__icon"><Dumbbell aria-hidden="true" size={17}/></span>
            <span className="app-list__main">
              <strong>{day?.name??"אימון"}</strong>
              <span>{program?.name??"תוכנית לא זמינה"} · {Math.round(entry.item.durationSeconds/60)} דק׳ · {exercises} תרגילים{skipped?` · ${skipped} דולגו`:""}</span>
              <span className="workout-history-facts">{israelDate(entry.item.completedAt)} · נפח <b>{entry.item.totalVolume}</b> ק״ג</span>
            </span>
            <ChevronLeft aria-hidden="true" size={18}/>
          </Link>})}
          </div>
        </section>)}
      </div>
      :<StateBlock
        icon={<Dumbbell aria-hidden="true" size={22}/>}
        title={active?"אין אימונים התואמים לסינון":"עדיין אין אימונים שהושלמו"}
        description={active?"אפשר לנקות את הסינון ולראות את כל ההיסטוריה.":"אימונים שהושלמו ונשמרו יופיעו כאן."}
        action={active?<button type="button" onClick={clear} className="premium-secondary-button">ניקוי סינון</button>:undefined}
      />}

    <BottomSheet open={filters} title="סינון היסטוריה" onClose={()=>setFilters(false)}>
      <div className="grid gap-3">
        <label className="text-sm font-bold">תאריך<input type="date" className="nutrition-input mt-2" value={date} onChange={(event)=>setDate(event.target.value)}/></label>
        <Select label="תוכנית" value={programId} onChange={(value)=>{setProgramId(value);setDayId("")}} options={[["","הכול"],...programs.map((item)=>[item.id,item.name])]}/>
        <Select label="יום אימון" value={dayId} onChange={setDayId} options={[["","הכול"],...programs.filter((item)=>!programId||item.id===programId).flatMap((item)=>item.days.map((day)=>[day.id,day.name]))]}/>
      </div>
      <div className="sheet__actions">
        <button type="button" onClick={()=>setFilters(false)} className="premium-primary-button">הצגת {entries.length} תוצאות</button>
        <button type="button" onClick={clear} className="premium-secondary-button">ניקוי סינון</button>
      </div>
    </BottomSheet>
  </>;
}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:string[][]}){return <label className="text-sm font-bold">{label}<select className="nutrition-input mt-2" value={value} onChange={(event)=>onChange(event.target.value)}>{options.map(([id,name])=><option key={`${id}-${name}`} value={id}>{name}</option>)}</select></label>}
