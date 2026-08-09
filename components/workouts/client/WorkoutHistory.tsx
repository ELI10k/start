"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Dumbbell, SlidersHorizontal } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { StateBlock } from "@/components/client/AppPatterns";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";

export default function WorkoutHistory(){const{snapshot,currentClientId}=useWorkouts();const[sort,setSort]=useState<"newest"|"oldest">("newest");const[date,setDate]=useState("");const[programId,setProgramId]=useState("");const[dayId,setDayId]=useState("");const[filters,setFilters]=useState(false);const programs=snapshot.programs.filter((program)=>snapshot.completedWorkouts.some((item)=>item.clientId===currentClientId&&item.programId===program.id));const entries=useMemo(()=>snapshot.completedWorkouts.filter((item)=>item.clientId===currentClientId&&(!date||item.completedAt.startsWith(date))&&(!programId||item.programId===programId)&&(!dayId||item.dayId===dayId)).sort((a,b)=>sort==="newest"?b.completedAt.localeCompare(a.completedAt):a.completedAt.localeCompare(b.completedAt)),[currentClientId,date,dayId,programId,snapshot.completedWorkouts,sort]);
  // Four dropdowns stacked would be the whole first screen on a phone, so the
  // filters live in a sheet and the list gets the space.
  const active=[date&&"תאריך",programId&&"תוכנית",dayId&&"יום"].filter(Boolean).length;
  const clear=()=>{setDate("");setProgramId("");setDayId("")};

  return <>
    <div className="chip-row">
      <button type="button" className="chip" aria-pressed={active>0} onClick={()=>setFilters(true)}>
        <SlidersHorizontal aria-hidden="true" size={15}/>סינון{active?` (${active})`:""}
      </button>
      <button type="button" className="chip" aria-pressed={sort==="newest"} onClick={()=>setSort("newest")}>החדש ביותר</button>
      <button type="button" className="chip" aria-pressed={sort==="oldest"} onClick={()=>setSort("oldest")}>הישן ביותר</button>
    </div>

    {entries.length?
      <div className="app-list">
        {entries.map((entry)=>{const program=snapshot.programs.find((item)=>item.id===entry.programId);const day=program?.days.find((item)=>item.id===entry.dayId);const exercises=entry.exerciseResults.filter((item)=>item.completed).length;const skipped=entry.exerciseResults.filter((item)=>item.skipped).length;
          return <Link href={`/workouts/history/${entry.id}`} key={entry.id}>
            <span className="app-list__icon"><Dumbbell aria-hidden="true" size={17}/></span>
            <span className="app-list__main">
              <strong>{day?.name??"אימון"}</strong>
              <span>{program?.name??"תוכנית לא זמינה"} · {Math.round(entry.durationSeconds/60)} דק׳ · {exercises} תרגילים{skipped?` · ${skipped} דולגו`:""}</span>
            </span>
            <span className="app-list__meta">
              <strong>{entry.totalVolume}</strong>
              {new Date(entry.completedAt).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
            </span>
            <ChevronLeft aria-hidden="true" size={18}/>
          </Link>})}
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
