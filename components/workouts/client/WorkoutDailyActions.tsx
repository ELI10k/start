"use client";
import { israelDateKey } from "@/lib/date-time";
import { useState } from "react";
import { AlarmClock, SlidersHorizontal } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { getTodayWorkoutDay } from "@/lib/workouts/progress";

// Snoozing sits behind one row instead of competing with "start workout" for
// the same screen.
//
// Skipping used to live here too, three taps deep. It is the answer to the same
// question the start button asks, and asking it here meant a client who did not
// train simply never answered - so it moved up beside the start button as
// "פיספסתי אימון" and left this sheet, rather than being offered from both.
export default function WorkoutDailyActions(){const{snapshot,currentClientId,snoozeScheduledWorkout}=useWorkouts();const today=israelDateKey();const assignment=snapshot.assignments.find((item)=>item.clientId===currentClientId&&item.status==="active");const program=snapshot.programs.find((item)=>item.id===assignment?.programId);const day=program&&assignment?getTodayWorkoutDay(program,snapshot.completedWorkouts,currentClientId):undefined;const[message,setMessage]=useState("");const[pending,setPending]=useState(false);const[open,setOpen]=useState(false);if(!assignment||!day)return null;const completed=snapshot.completedWorkouts.some((item)=>item.assignmentId===assignment.id&&item.dayId===day.id&&item.completedAt.startsWith(today));const skipped=snapshot.scheduleChanges.some((item)=>item.assignmentId===assignment.id&&item.originalDate===today&&(item as unknown as {status?:string}).status==="skipped");if(completed||skipped)return null;const snooze=async()=>{setPending(true);try{setMessage(await snoozeScheduledWorkout(assignment.id,today)?"התזכורת נקבעה לעוד שעה.":"לא ניתן לקבוע תזכורת כרגע.")}finally{setPending(false)}};

  return <>
    <div className="app-list">
      <button type="button" onClick={()=>setOpen(true)}>
        <span className="app-list__icon"><SlidersHorizontal aria-hidden="true" size={17}/></span>
        <span className="app-list__main"><strong>תזכורת לאימון היום</strong><span>תזכורת מאוחרת יותר היום</span></span>
      </button>
    </div>
    {message&&<p role="status" className="mt-3 text-sm font-bold text-[#16A34A]">{message}</p>}

    <BottomSheet open={open} title="תזכורת לאימון היום" onClose={()=>setOpen(false)}>
      <div className="app-list">
        <button type="button" onClick={snooze} disabled={pending}>
          <span className="app-list__icon"><AlarmClock aria-hidden="true" size={17}/></span>
          <span className="app-list__main"><strong>הזכר לי בעוד שעה</strong><span>התזכורת תישלח שוב מאוחר יותר היום</span></span>
        </button>
      </div>
    </BottomSheet>
  </>;
}
