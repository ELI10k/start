import { Suspense } from "react";
import Link from "next/link";
import ExerciseDetail from "@/components/workouts/client/ExerciseDetail";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import { requireCoach } from "@/lib/auth/guards";

export default async function Page({ params }: { params: Promise<{ exerciseId: string }> }) {
  await requireCoach();
  const { exerciseId } = await params;
  return <>
    <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6"><Link href="/coach/workouts/exercises" className="inline-flex min-h-11 items-center font-bold text-[#16A34A]">חזרה למאגר התרגילים</Link></div>
    <Suspense fallback={<main className="p-8 text-[#0B0B0B]">טוען פרטי תרגיל…</main>}><WorkoutRouteReady><ExerciseDetail exerciseId={exerciseId}/></WorkoutRouteReady></Suspense>
  </>;
}
