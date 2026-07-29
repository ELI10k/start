import CompletedWorkoutDetail from "@/components/workouts/client/CompletedWorkoutDetail";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import ClientShell from "@/components/client/ClientShell";
export default async function Page({params}:{params:Promise<{workoutId:string}>}){const{workoutId}=await params;return <ClientShell><WorkoutRouteReady><CompletedWorkoutDetail workoutId={workoutId}/></WorkoutRouteReady></ClientShell>}
