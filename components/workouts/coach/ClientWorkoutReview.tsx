"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";
import { adherenceSummary, workoutStreak } from "@/lib/workouts/progress";

export default function ClientWorkoutReview({
  clientId,
}: {
  clientId: string;
}) {
  const { snapshot, saveCoachNote, getExercise } = useWorkouts();
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const assignments = snapshot.assignments.filter(
    (item) => item.clientId === clientId,
  );
  const active = assignments.find((item) => item.status === "active");
  const moves = useMemo(
    () =>
      snapshot.scheduleChanges
        .filter((item) => item.clientId === clientId)
        .sort((a, b) => b.movedAt.localeCompare(a.movedAt)),
    [clientId, snapshot.scheduleChanges],
  );
  const history = useMemo(
    () =>
      [...snapshot.completedWorkouts]
        .filter((item) => item.clientId === clientId)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [clientId, snapshot.completedWorkouts],
  );
  const weekly = adherenceSummary(
    snapshot.completedWorkouts,
    active,
    new Date(),
  );
  const exerciseTrends=useMemo(()=>{const map=new Map<string,{name:string;points:{date:string;volume:number;skipped:boolean}[]}>();for(const workout of [...history].reverse())for(const result of workout.exerciseResults){const id=result.performedExerciseId??result.exerciseId;const row=map.get(id)??{name:getExercise(id)?.name??"תרגיל",points:[]};row.points.push({date:workout.completedAt,volume:result.sets.filter((set)=>set.completed).reduce((sum,set)=>sum+(set.weightKg??0)*(set.repetitions??0),0),skipped:result.skipped});map.set(id,row)}return [...map.entries()].map(([id,value])=>({id,...value})).sort((a,b)=>b.points.length-a.points.length).slice(0,8)},[getExercise,history]);
  const submit = async () => {
    if (!note.trim()) return;
    const ok = await saveCoachNote({
      id: `coach-note-${Date.now()}`,
      coachId: "",
      clientId,
      body: note.trim(),
      createdAt: new Date().toISOString(),
    });
    if (ok) {
      setNote("");
      setSaved(true);
    }
  };
  return (
    <main className="px-4 py-8 text-[#0B0B0B]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold text-[#16A34A]">סקירת פעילות לקוח</p>
        <h1 className="mt-2 text-3xl font-black">אימונים וביצועים</h1>
        {active ? (
          <section className="mt-5 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
            <h2 className="text-xl font-black">הקצאה פעילה</h2>
            <p className="mt-2 text-sm text-[#5B5F5B]">
              {snapshot.programs.find((item) => item.id === active.programId)
                ?.name ?? "תוכנית לא זמינה"}{" "}
              · {active.weeklyFrequency} אימונים בשבוע
            </p>
          </section>
        ) : (
          <p className="mt-5 text-[#5B5F5B]">אין הקצאה פעילה.</p>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Info
            label="היענות שבועית"
            value={`${weekly.completed}/${weekly.expected} · ${weekly.percent}%`}
          />
          <Info label="חסרים השבוע" value={String(weekly.missed)} />
          <Info
            label="רצף"
            value={`${workoutStreak(snapshot.completedWorkouts, clientId)} אימונים`}
          />
        </dl>
        {exerciseTrends.length>0&&<section className="mt-6 rounded-[22px] border border-[#E5E7E5] bg-white p-5"><h2 className="text-xl font-black">התקדמות לפי תרגיל</h2><p className="mt-1 text-xs text-[#5B5F5B]">נפח האימון לאורך המפגשים האחרונים; פס ריק מציין דילוג.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{exerciseTrends.map((exercise)=>{const max=Math.max(1,...exercise.points.map((point)=>point.volume));return <article key={exercise.id} className="rounded-xl bg-[#F7F8F7] p-3"><strong className="text-sm">{exercise.name}</strong><div className="mt-3 flex h-20 items-end gap-1" aria-label={`מגמת נפח ${exercise.name}`}>{exercise.points.slice(-8).map((point,index)=><span key={`${point.date}-${index}`} title={`${new Date(point.date).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})} · ${point.skipped?"דולג":`${point.volume} ק״ג נפח`}`} className={point.skipped?"w-full rounded-t bg-[#FECACA]":"w-full rounded-t bg-[#16A34A]"} style={{height:point.skipped?"8%":`${Math.max(8,Math.round(point.volume/max*100))}%`}}/>)}</div><p className="mt-2 text-xs text-[#5B5F5B]">{exercise.points.length} אימונים · אחרון {exercise.points.at(-1)?.volume??0} ק״ג נפח</p></article>})}</div></section>}
        <section className="mt-6 rounded-[22px] border border-[#16A34A]/20 bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-black">שינויים ופספוסי אימון</h2>
          {moves.length ? (
            <div className="mt-3 space-y-3">
              {moves.map((move) => {
                const program = snapshot.programs.find(
                  (item) => item.id === move.programId,
                );
                const day = program?.days.find(
                  (item) => item.id === move.dayId,
                );
                return (
                  <article
                    key={move.id}
                    className="rounded-xl border border-[#E5E7E5] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2"><strong>{day?.name ?? "אימון"}</strong><span className={move.status==="skipped"?"pill pill--red":"pill"}>{move.status==="skipped"?"דולג":"הוזז"}</span></div>
                    <p className="mt-2 text-sm text-[#5B5F5B]">
                      {move.status==="skipped"?"תאריך האימון:":"תאריך מקורי:"}{" "}
                      {new Date(
                        `${move.originalDate}T00:00:00`,
                      ).toLocaleDateString("he-IL", {
                        timeZone: "Asia/Jerusalem",
                      })}{" "}
                      {move.status!=="skipped"&&<> · חדש:{" "}
                      {new Date(
                        `${move.scheduledDate}T00:00:00`,
                      ).toLocaleDateString("he-IL", {
                        timeZone: "Asia/Jerusalem",
                      })}</>}
                    </p>
                    {move.skippedReason&&<p className="mt-1 text-sm font-bold text-[#B91C1C]">סיבה: {move.skippedReason}</p>}
                    <p className="mt-1 text-xs text-[#3F433F]">
                      {move.status==="skipped"?"דווח":"עודכן"}:{" "}
                      {new Date(move.movedAt).toLocaleString("he-IL", {
                        timeZone: "Asia/Jerusalem",
                      })}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#5B5F5B]">לא דווחו הזזות או פספוסים.</p>
          )}
        </section>
        <section className="mt-6">
          <h2 className="text-2xl font-black">אימונים אחרונים</h2>
          {history.length ? (
            <div className="mt-3 space-y-3">
              {history.map((workout) => (
                <article
                  key={workout.id}
                  className="rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"
                >
                  <div className="flex justify-between gap-3">
                    <strong>
                      {snapshot.programs
                        .find((item) => item.id === workout.programId)
                        ?.days.find((day) => day.id === workout.dayId)?.name ??
                        "אימון"}
                    </strong>
                    <span className="text-sm text-[#5B5F5B]">
                      {new Date(workout.completedAt).toLocaleDateString(
                        "he-IL",
                        { timeZone: "Asia/Jerusalem" },
                      )}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#5B5F5B]">
                    {workout.exerciseResults
                      .map(
                        (result) =>
                          getExercise(result.exerciseId)?.name ?? "תרגיל",
                      )
                      .join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-[#5B5F5B]">
                    {[
                      workout.sleepHours !== undefined
                        ? `שינה ${workout.sleepHours} שעות`
                        : null,
                      workout.perceivedDifficulty
                        ? `קושי ${workout.perceivedDifficulty}/5`
                        : null,
                      workout.energy ? `אנרגיה ${workout.energy}/5` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "לא דווחו שינה, קושי או אנרגיה"}
                  </p>
                  <Link
                    href={`/coach/clients/${clientId}/workouts/${workout.id}`}
                    className="mt-3 inline-flex text-sm text-[#16A34A]"
                  >
                    פרטי אימון, משקלים וחזרות
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[#5B5F5B]">אין אימונים שהושלמו.</p>
          )}
        </section>
        <section className="mt-6 rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
          <h2 className="text-xl font-black">הערת מאמן</h2>
          <textarea
            className="nutrition-input mt-3 min-h-24"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setSaved(false);
            }}
          />
          <button
            disabled={!note.trim()}
            onClick={submit}
            className="mt-3 min-h-12 rounded-xl bg-[#16A34A] px-5 font-black text-[#FFFFFF] disabled:opacity-40"
          >
            שמירת הערה
          </button>
          {saved && (
            <p className="mt-2 text-sm text-[#16A34A]">
              ההערה נשמרה ב-Supabase.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7E5] bg-[#FFFFFF] p-4">
      <span className="text-xs text-[#5B5F5B]">{label}</span>
      <strong className="mt-1 block">{value}</strong>
    </div>
  );
}
