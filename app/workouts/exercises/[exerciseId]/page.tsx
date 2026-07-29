import { Suspense } from "react";
import ExerciseDetail from "@/components/workouts/client/ExerciseDetail";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import ClientShell from "@/components/client/ClientShell";
export default async function Page({params}:{params:Promise<{exerciseId:string}>}){const{exerciseId}=await params;return <ClientShell><Suspense fallback={<main className="p-8">טוען פרטי תרגיל…</main>}><WorkoutRouteReady><ExerciseDetail exerciseId={exerciseId}/></WorkoutRouteReady></Suspense></ClientShell>}
