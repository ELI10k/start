import { Suspense } from "react";
import ExerciseDetail from "@/components/workouts/client/ExerciseDetail";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
export default async function Page({params}:{params:Promise<{exerciseId:string}>}){const{exerciseId}=await params;return <Suspense fallback={<main className="p-8 text-white">טוען פרטי תרגיל…</main>}><WorkoutRouteReady><ExerciseDetail exerciseId={exerciseId}/></WorkoutRouteReady></Suspense>}
