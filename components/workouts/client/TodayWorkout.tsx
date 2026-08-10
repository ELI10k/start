"use client";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, Circle, Dumbbell, Flame, Play, Repeat, Target } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { SkeletonCard, SkeletonList, StateBlock } from "@/components/client/AppPatterns";
import { MetricTile } from "@/components/client/PremiumUI";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { activeAssignmentFor, adherenceSummary, assignmentState, getTodayWorkoutDay, workoutStreak } from "@/lib/workouts/progress";
import { currentTrainingWeek, weeklySchedule } from "@/lib/workouts/schedule";

const hebrewDate = (value: string) =>
  new Date(value).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });

export default function TodayWorkout(){
  const{snapshot,currentClientId,loading,persistenceError,moveScheduledWorkout}=useWorkouts();const today=new Date().toISOString().slice(0,10);const assignment=activeAssignmentFor(snapshot.assignments,currentClientId,today);const program=assignment?snapshot.programs.find((item)=>item.id===assignment.programId):undefined;const[date,setDate]=useState(today);const[confirm,setConfirm]=useState(false);const[conflict,setConflict]=useState(false);const[message,setMessage]=useState("");const[pending,setPending]=useState(false);

  // While the snapshot loads the page keeps its shape, so nothing jumps when the
  // real programme arrives.
  if(loading)return <div className="grid gap-4"><SkeletonCard/><SkeletonList rows={2}/></div>;
  if(persistenceError)return <StateBlock tone="error" title="לא הצלחנו לטעון את תוכנית האימון" description={persistenceError} action={<Link href="/workouts" className="premium-primary-button">ניסיון נוסף</Link>}/>;
  if(!assignment||!program)return <StateBlock icon={<Dumbbell aria-hidden="true" size={22}/>} title="אין תוכנית אימון משויכת" description="לא נמצאה תוכנית מאושרת ששויכה אליך. המאמן ישייך תוכנית והיא תופיע כאן."/>;
  const state=assignmentState(assignment,today);
  if(state!=="active")return <StateBlock icon={<CalendarDays aria-hidden="true" size={22}/>} title="התוכנית אינה פעילה כרגע" description="לא ניתן להזיז אימון מתוכנית שאינה פעילה."/>;
  const day=getTodayWorkoutDay(program,snapshot.completedWorkouts,currentClientId);
  if(!day)return <StateBlock icon={<Dumbbell aria-hidden="true" size={22}/>} title="לתוכנית אין ימי אימון" description="מקור התוכנית אינו כולל יום אימון תקין."/>;
  const moved=snapshot.scheduleChanges.find((item)=>item.assignmentId===assignment.id&&item.originalDate===today&&item.dayId===day.id&&item.scheduledDate!==item.originalDate);const completed=snapshot.completedWorkouts.some((item)=>item.assignmentId===assignment.id&&item.dayId===day.id&&item.completedAt.startsWith(today));const activeSession=snapshot.activeSessions.find((item)=>item.clientId===currentClientId);const adherence=adherenceSummary(assignment,snapshot.completedWorkouts,today);const schedule=weeklySchedule(program,assignment,snapshot.completedWorkouts,currentClientId);const recent=[...snapshot.completedWorkouts].filter((item)=>item.clientId===currentClientId).sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,3);
  const submit=async(confirmConflict:boolean)=>{if(completed||activeSession||pending)return;setPending(true);try{const result=await moveScheduledWorkout(assignment.id,day.id,today,date,confirmConflict);if(result.conflict&&!confirmConflict){setConflict(true);return}if(result.ok){setMessage(`האימון הועבר בהצלחה ל-${new Date(`${date}T00:00:00`).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}`);setConfirm(false);setConflict(false)}else setMessage("לא ניתן היה להעביר את האימון. נסה שוב.")}finally{setPending(false)}};

  const sessionHref=`/workouts/${program.id}/${activeSession?.dayId??day.id}`;
  const startLabel=activeSession?"המשך אימון":"התחלת אימון";

  return <div className="grid gap-4">
    {/* The one inverted surface on the screen: what to do today, and nothing else. */}
    <section className="daily-progress-card" aria-labelledby="today-workout">
      <div className="daily-progress-card__copy">
        <span>שבוע {currentTrainingWeek(assignment.startDate,today)} · {program.name}</span>
        <h2 id="today-workout">{activeSession?"אימון בתהליך":day.name}</h2>
        <p>{activeSession?"ההתקדמות נשמרת ואפשר להמשיך מאותה נקודה.":`${day.exercises.length} תרגילים לפי הסדר המאושר.`}</p>
        {moved&&<p>הועבר מ־{hebrewDate(`${moved.originalDate}T00:00:00`)} ל־{hebrewDate(`${moved.scheduledDate}T00:00:00`)}</p>}
        {completed&&<p>האימון הושלם ולכן אינו ניתן להעברה</p>}
      </div>
      <div className="premium-progress" role="img" aria-label={`${adherence.percent} אחוז התמדה`}>
        <div className="premium-progress__meta"><span>התמדה</span><strong>{adherence.percent}%</strong></div>
        <div className="premium-progress__track"><span style={{width:`${Math.min(100,Math.max(0,adherence.percent))}%`}}/></div>
      </div>
    </section>

    <section className="dashboard-metrics" aria-label="מדדי אימון">
      <MetricTile label="הושלמו" value={`${adherence.completed}/${adherence.expected}`} icon={<CheckCircle2 aria-hidden="true" size={18}/>}/>
      <MetricTile label="התמדה" value={`${adherence.percent}%`} icon={<Target aria-hidden="true" size={18}/>}/>
      <MetricTile label="הוחמצו" value={String(adherence.missed)} accent={adherence.missed?"down":"neutral"} icon={<Circle aria-hidden="true" size={18}/>}/>
      <MetricTile label="רצף" value={`${workoutStreak(snapshot.completedWorkouts,currentClientId)} אימונים`} icon={<Flame aria-hidden="true" size={18}/>}/>
    </section>

    <section aria-labelledby="week-plan">
      <div className="section-heading section-heading--compact">
        <h2 id="week-plan">השבוע</h2>
        <span>{assignment.weeklyFrequency} אימונים בשבוע</span>
      </div>
      <div className="app-list">
        {schedule.map(({day:item,occurrence,completed:itemCompleted})=>
          <div key={`${item.id}-${occurrence}`}>
            <span className="app-list__icon">{itemCompleted?<CheckCircle2 aria-hidden="true" size={17}/>:<Circle aria-hidden="true" size={17}/>}</span>
            <span className="app-list__main"><strong>{item.name}</strong><span>{item.exercises.length} תרגילים</span></span>
            <span className={`pill${itemCompleted?" pill--green":""}`}>{itemCompleted?"הושלם":"מתוכנן"}</span>
          </div>
        )}
      </div>
    </section>

    <section aria-labelledby="recent-workouts">
      <div className="section-heading section-heading--compact">
        <h2 id="recent-workouts">אימונים אחרונים</h2>
        <Link href="/workouts/history" className="chip">הכול</Link>
      </div>
      {recent.length?
        <div className="app-list">
          {recent.map((item)=>
            <Link key={item.id} href={`/workouts/history/${item.id}`}>
              <span className="app-list__icon"><Dumbbell aria-hidden="true" size={17}/></span>
              <span className="app-list__main"><strong>{program.days.find((entry)=>entry.id===item.dayId)?.name??"אימון"}</strong><span>{hebrewDate(item.completedAt)}</span></span>
              <ChevronLeft aria-hidden="true" size={18}/>
            </Link>
          )}
        </div>
        :<StateBlock icon={<Dumbbell aria-hidden="true" size={22}/>} title="עדיין אין אימונים שהושלמו" description="האימון הראשון שתסיים יופיע כאן."/>}
    </section>

    {!completed&&!activeSession&&
      <button type="button" onClick={()=>setConfirm(true)} className="premium-secondary-button w-full">
        <Repeat aria-hidden="true" size={17}/>העבר ליום אחר
      </button>}

    {message&&<p role="status" className="text-sm font-bold text-[#16A34A]">{message}</p>}

    {/* Start is the screen's single primary action and appears exactly once, in
        the FAB, within thumb reach. The hero states what today is; it does not
        repeat the button. */}
    <Link href={sessionHref} className="fab" aria-label={startLabel}>
      <Play aria-hidden="true" size={18}/>{startLabel}
    </Link>

    <BottomSheet open={confirm} title="העברת האימון ליום אחר" onClose={()=>{setConfirm(false);setConflict(false)}}>
      <label className="block text-sm font-bold">תאריך חדש
        <input type="date" min={today} value={date} onChange={(event)=>{setDate(event.target.value);setConflict(false)}} className="nutrition-input mt-2"/>
      </label>
      {conflict&&<p role="alert" className="mt-3 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm">כבר קיים אימון אחר ביום הזה. אפשר להשאיר את שני האימונים באותו יום או לבחור יום אחר.</p>}
      <div className="sheet__actions">
        <button onClick={()=>submit(conflict)} disabled={pending||!date||date===today} className="premium-primary-button">{pending?"שומרים…":conflict?"השאר את שני האימונים":"אישור העברה"}</button>
        <button onClick={()=>{setConfirm(false);setConflict(false)}} disabled={pending} className="premium-secondary-button">ביטול</button>
      </div>
    </BottomSheet>
  </div>;
}
