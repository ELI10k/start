"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markWorkoutHandled } from "@/app/actions/workout-reviews";
import { useWorkouts } from "@/components/workouts/WorkoutProvider";

export default function DashboardWorkoutActivity({ handledIds }: { handledIds: readonly string[] }) {
  const { snapshot } = useWorkouts();
  const [handled, setHandled] = useState(() => new Set(handledIds));
  const recent = [...snapshot.completedWorkouts]
    .filter((item) => !handled.has(item.id))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5);

  return <section className="mt-6 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
    <h2 className="text-xl font-black">פעילות אימונים שממתינה לטיפול</h2>
    <p className="mt-1 text-xs text-[#5B5F5B]">לאחר שעברת על האימון, סמן “טופל” והוא יוסר מהעמוד הראשי בלבד.</p>
    {recent.length ? <div className="mt-3 divide-y divide-[#E5E7E5]">{recent.map((item) => {
      const client = snapshot.clients.find((candidate) => candidate.id === item.clientId);
      return <article key={item.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2 text-sm">
        <span>{client?.fullName ?? "לקוח משויך"} · {new Date(item.completedAt).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</span>
        <span className="flex items-center gap-2">
          <Link href={`/coach/clients/${item.clientId}/workouts/${item.id}`} className="chip">צפייה</Link>
          <HandledButton workoutId={item.id} onHandled={() => setHandled((current) => new Set([...current, item.id]))}/>
        </span>
      </article>;
    })}</div> : <p className="mt-3 text-sm text-[#5B5F5B]">אין אימונים שממתינים לטיפול.</p>}
  </section>;
}

function HandledButton({ workoutId, onHandled }: { workoutId: string; onHandled: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <span>
    <button type="button" disabled={pending} className="chip text-[#16A34A] disabled:opacity-50" onClick={() => startTransition(async () => {
      setError("");
      const result = await markWorkoutHandled(workoutId);
      if (result.ok) onHandled();
      else setError(result.message);
    })}>
      {pending ? "שומר…" : "טופל"}
    </button>
    {error&&<span role="alert" className="mt-1 block text-xs text-[#DC2626]">{error}</span>}
  </span>;
}
