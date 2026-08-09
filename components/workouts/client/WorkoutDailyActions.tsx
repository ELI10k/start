"use client";
import { useState } from "react";
import { AlarmClock, SkipForward, SlidersHorizontal } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { getTodayWorkoutDay } from "@/lib/workouts/progress";

// Snoozing and skipping are things a client does rarely, so they sit behind one
// row instead of competing with "start workout" for the same screen.
export default function WorkoutDailyActions(){const{snapshot,currentClientId,skipScheduledWorkout,snoozeScheduledWorkout}=useWorkouts();const today=new Date().toISOString().slice(0,10);const assignment=snapshot.assignments.find((item)=>item.clientId===currentClientId&&item.status==="active");const program=snapshot.programs.find((item)=>item.id===assignment?.programId);const day=program&&assignment?getTodayWorkoutDay(program,snapshot.completedWorkouts,currentClientId):undefined;const[skip,setSkip]=useState(false);const[reason,setReason]=useState("");const[message,setMessage]=useState("");const[pending,setPending]=useState(false);const[open,setOpen]=useState(false);if(!assignment||!day)return null;const completed=snapshot.completedWorkouts.some((item)=>item.assignmentId===assignment.id&&item.dayId===day.id&&item.completedAt.startsWith(today));const skipped=snapshot.scheduleChanges.some((item)=>item.assignmentId===assignment.id&&item.originalDate===today&&(item as unknown as {status?:string}).status==="skipped");if(completed||skipped)return null;const snooze=async()=>{setPending(true);try{setMessage(await snoozeScheduledWorkout(assignment.id,today)?"התזכורת נקבעה לעוד שעה.":"לא ניתן לקבוע תזכורת כרגע.")}finally{setPending(false)}};const submitSkip=async()=>{setPending(true);try{setMessage(await skipScheduledWorkout(assignment.id,day.id,today,reason)?"האימון סומן כדולג ונשמר בהיסטוריה.":"לא ניתן לדלג על האימון.");setSkip(false);setOpen(false)}finally{setPending(false)}};

  return <>
    <div className="app-list">
      <button type="button" onClick={()=>setOpen(true)}>
        <span className="app-list__icon"><SlidersHorizontal aria-hidden="true" size={17}/></span>
        <span className="app-list__main"><strong>פעולות לאימון היום</strong><span>תזכורת מאוחרת יותר או דילוג</span></span>
      </button>
    </div>
    {message&&<p role="status" className="mt-3 text-sm font-bold text-[#16A34A]">{message}</p>}

    <BottomSheet open={open} title="פעולות לאימון היום" onClose={()=>{setOpen(false);setSkip(false)}}>
      {skip?
        <>
          <label className="block text-sm font-bold">סיבה (רשות)
            <textarea value={reason} onChange={(event)=>setReason(event.target.value)} className="nutrition-input mt-2 min-h-20"/>
          </label>
          <p className="mt-2 text-xs text-[#5B5F5B]">האימון לא יימחק ולא יסומן כהושלם.</p>
          <div className="sheet__actions">
            <button onClick={submitSkip} disabled={pending} className="premium-primary-button bg-[#DC2626] border-[#DC2626] hover:bg-[#DC2626]">אישור דילוג</button>
            <button onClick={()=>setSkip(false)} disabled={pending} className="premium-secondary-button">חזרה</button>
          </div>
        </>
        :
        <div className="app-list">
          <button type="button" onClick={snooze} disabled={pending}>
            <span className="app-list__icon"><AlarmClock aria-hidden="true" size={17}/></span>
            <span className="app-list__main"><strong>הזכר לי בעוד שעה</strong><span>התזכורת תישלח שוב מאוחר יותר היום</span></span>
          </button>
          <button type="button" onClick={()=>setSkip(true)} disabled={pending} className="text-[#DC2626]">
            <span className="app-list__icon bg-[#FEF2F2] text-[#DC2626]"><SkipForward aria-hidden="true" size={17}/></span>
            <span className="app-list__main"><strong>דלג על היום</strong><span className="text-[#DC2626]">האימון יסומן כדולג</span></span>
          </button>
        </div>}
    </BottomSheet>
  </>;
}
