"use client";
import { israelDateKey } from "@/lib/date-time";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, Circle, Dumbbell, ExternalLink, Flame, Play, Repeat, SkipForward, Target } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { SkeletonCard, SkeletonList, StateBlock } from "@/components/client/AppPatterns";
import { MetricTile } from "@/components/client/PremiumUI";
import ExerciseGuidanceButton from "@/components/workouts/ExerciseGuidanceButton";
import ExerciseThumbnail from "@/components/workouts/ExerciseThumbnail";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { activeAssignmentsFor, adherenceSummary, assignmentState, getTodayWorkoutDay, workoutStreak } from "@/lib/workouts/progress";
import { currentTrainingWeek, weeklySchedule } from "@/lib/workouts/schedule";

const hebrewDate = (value: string) =>
  new Date(value).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });

export default function TodayWorkout(){
  const{snapshot,currentClientId,loading,persistenceError,moveScheduledWorkout,skipScheduledWorkout,getExercise}=useWorkouts();const today=israelDateKey();const[programChoice,setProgramChoice]=useState("");const assignments=activeAssignmentsFor(snapshot.assignments,currentClientId,today);const assignment=assignments.find((item)=>item.id===programChoice)??assignments[0];const program=assignment?snapshot.programs.find((item)=>item.id===assignment.programId):undefined;const[date,setDate]=useState(today);const[confirm,setConfirm]=useState(false);const[conflict,setConflict]=useState(false);const[message,setMessage]=useState("");const[pending,setPending]=useState(false);const[missed,setMissed]=useState(false);const[missedReason,setMissedReason]=useState("");

  // While the snapshot loads the page keeps its shape, so nothing jumps when the
  // real programme arrives.
  if(loading)return <div className="grid gap-4"><SkeletonCard/><SkeletonList rows={2}/></div>;
  if(persistenceError)return <StateBlock tone="error" title="לא הצלחנו לטעון את תוכנית האימון" description={persistenceError} action={<Link href="/workouts" className="premium-primary-button">ניסיון נוסף</Link>}/>;
  if(!assignment||!program)return <StateBlock icon={<Dumbbell aria-hidden="true" size={22}/>} title="אין תוכנית אימון משויכת" description="לא נמצאה תוכנית מאושרת ששויכה אליך. המאמן ישייך תוכנית והיא תופיע כאן."/>;
  const state=assignmentState(assignment,today);
  if(state!=="active")return <StateBlock icon={<CalendarDays aria-hidden="true" size={22}/>} title="התוכנית אינה פעילה כרגע" description="לא ניתן להזיז אימון מתוכנית שאינה פעילה."/>;
  const day=getTodayWorkoutDay(program,snapshot.completedWorkouts,currentClientId,today,snapshot.scheduleChanges.filter((c)=>c.clientId===currentClientId&&c.status==="skipped").map((c)=>c.originalDate));
  if(!day)return <StateBlock icon={<Dumbbell aria-hidden="true" size={22}/>} title="לתוכנית אין ימי אימון" description="מקור התוכנית אינו כולל יום אימון תקין."/>;
  const moved=snapshot.scheduleChanges.find((item)=>item.assignmentId===assignment.id&&item.originalDate===today&&item.dayId===day.id&&item.scheduledDate!==item.originalDate);const completed=snapshot.completedWorkouts.some((item)=>item.assignmentId===assignment.id&&item.dayId===day.id&&item.completedAt.startsWith(today));const activeSession=snapshot.activeSessions.find((item)=>item.clientId===currentClientId);const adherence=adherenceSummary(assignment,snapshot.completedWorkouts,today);const schedule=weeklySchedule(program,assignment,snapshot.completedWorkouts,currentClientId);const recent=[...snapshot.completedWorkouts].filter((item)=>item.clientId===currentClientId).sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,3);
  const submit=async(confirmConflict:boolean)=>{if(completed||activeSession||pending)return;setPending(true);try{const result=await moveScheduledWorkout(assignment.id,day.id,today,date,confirmConflict);if(result.conflict&&!confirmConflict){setConflict(true);return}if(result.ok){setMessage(`האימון הועבר בהצלחה ל-${new Date(`${date}T00:00:00`).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}`);setConfirm(false);setConflict(false)}else setMessage("לא ניתן היה להעביר את האימון. נסה שוב.")}finally{setPending(false)}};

  const sessionHref=`/workouts/${program.id}/${activeSession?.dayId??day.id}`;
  const startLabel=activeSession?"המשך אימון":"התחלת אימון";
  // Already declared missed today, so the offer to declare it is withdrawn -
  // the same test the daily-actions sheet applies, against the same rows.
  const skippedToday=snapshot.scheduleChanges.some((item)=>item.assignmentId===assignment.id&&item.originalDate===today&&item.status==="skipped");
  const submitMissed=async()=>{if(pending)return;setPending(true);try{
    setMessage(await skipScheduledWorkout(assignment.id,day.id,today,missedReason)
      ?"האימון סומן כמפוספס. הוא נשאר בהיסטוריה ולא נספר כהושלם."
      :"לא הצלחנו לסמן את האימון. נסה שוב.");
    setMissed(false);setMissedReason("");
  }finally{setPending(false)}};

  return <div className="grid gap-4">
    {/* More than one programme can be running at a time, so the client picks
        which one today's workout comes from. With a single programme the row
        would say nothing, so it is not rendered at all. */}
    {assignments.length>1&&
      <div className="chip-row" role="group" aria-label="בחירת תוכנית פעילה">
        {assignments.map((item)=>{
          const itemProgram=snapshot.programs.find((entry)=>entry.id===item.programId);
          return <button key={item.id} type="button" onClick={()=>setProgramChoice(item.id)} aria-pressed={item.id===assignment.id} className="chip">{itemProgram?.name??"תוכנית"}</button>;
        })}
      </div>}

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
      {/* "2/1" in an RTL column reads as one-of-two, which is the opposite of
          what it says. Spelled out, it cannot be read backwards. */}
      <MetricTile label="הושלמו" value={`${adherence.completed} מתוך ${adherence.expected}`} icon={<CheckCircle2 aria-hidden="true" size={18}/>}/>
      <MetricTile label="התמדה" value={`${adherence.percent}%`} icon={<Target aria-hidden="true" size={18}/>}/>
      <MetricTile label="פיספסת" value={String(adherence.missed)} accent={adherence.missed?"down":"neutral"} icon={<Circle aria-hidden="true" size={18}/>}/>
      <MetricTile label="רצף" value={`${workoutStreak(snapshot.completedWorkouts,currentClientId)} אימונים`} icon={<Flame aria-hidden="true" size={18}/>}/>
    </section>

    {/* What today actually contains. The screen used to name the day and jump
        straight to the FAB, so a client could not see which exercises were
        coming - or read the coach's דגשים - without starting the workout first.
        Same card, same catalogue fields and the same guidance sheet the
        programme and the live session already use. */}
    <section aria-labelledby="today-exercises">
      <div className="section-heading section-heading--compact">
        <h2 id="today-exercises">תרגילי האימון</h2>
        <span>{day.exercises.length} תרגילים</span>
      </div>
      <div className="grid gap-3">
        {[...day.exercises].sort((a,b)=>a.order-b.order).map((entry)=>{
          const exercise=getExercise(entry.exerciseId);
          return <article key={entry.id} className="premium-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <ExerciseThumbnail exercise={exercise}/><div className="min-w-0">
                <span className="text-xs text-[#5B5F5B]">תרגיל {entry.order+1}</span>
                <h3 className="mt-1 text-lg font-black">{exercise?.name??"פרטי תרגיל חסרים"}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="pill pill--green">{exercise?.primaryMuscleGroup??"קבוצת שריר לא סווגה"}</span>
                  {exercise?.equipment&&<span className="pill">{exercise.equipment}</span>}
                </div></div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {exercise?.video&&<a href={exercise.video.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-[#16A34A]">סרטון הסבר טכניקה<ExternalLink aria-hidden="true" size={14}/></a>}
                <ExerciseGuidanceButton exercise={exercise} variant="link"/>
              </div>
            </div>
            <dl className="compact-data-list mt-3">
              <div><span>סטים</span><strong>{entry.sets||"—"}</strong></div>
              <div><span>חזרות</span><strong>{entry.reps||"—"}</strong></div>
              <div><span>מנוחה</span><strong>{entry.rest||"—"}</strong></div>
            </dl>
            {entry.notes&&<p className="mt-3 text-sm text-[#5B5F5B]">{entry.notes}</p>}
          </article>;
        })}
      </div>
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

    {/* The two answers to "what happened to today's workout", in thumb reach and
        in the order they are true in: it is starting, or it did not happen.
        
        Declaring a miss existed already - three taps into "פעולות לאימון היום",
        behind a sheet a client opens by accident more often than on purpose - so
        a workout that was skipped stayed unanswered, and the day it belongs to
        stayed "today's workout". It is the same call to the same function; it is
        simply where the question is being asked. */}
    <div className="fab-stack">
      <Link href={sessionHref} className="fab" aria-label={startLabel}>
        <Play aria-hidden="true" size={18}/>{startLabel}
      </Link>
      {completed||skippedToday?null:
        <button type="button" onClick={()=>setMissed(true)} className="fab fab--missed">
          <SkipForward aria-hidden="true" size={17}/>פיספסתי אימון
        </button>}
    </div>

    <BottomSheet open={missed} title="פיספסתי את האימון" onClose={()=>setMissed(false)}>
      <p className="text-sm text-[#5B5F5B]">
        האימון של היום — {day.name} — יסומן כמפוספס. הוא לא יימחק, לא ייספר כהושלם,
        והאימון הבא בתוכנית יתפוס את מקומו.
      </p>
      <label className="mt-3 block text-sm font-bold">סיבה (רשות)
        <textarea value={missedReason} onChange={(event)=>setMissedReason(event.target.value)} className="nutrition-input mt-2 min-h-20"/>
      </label>
      <div className="sheet__actions">
        <button type="button" onClick={submitMissed} disabled={pending} className="premium-primary-button premium-primary-button--danger">
          {pending?"שומרים…":"סימון כמפוספס"}
        </button>
        <button type="button" onClick={()=>setMissed(false)} disabled={pending} className="premium-secondary-button">ביטול</button>
      </div>
    </BottomSheet>

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
