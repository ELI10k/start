import CompletedWorkoutDetail from "@/components/workouts/client/CompletedWorkoutDetail";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
export default async function Page({params}:{params:Promise<{workoutId:string}>}){const{workoutId}=await params;return <WorkoutRouteReady><CompletedWorkoutDetail workoutId={workoutId}/></WorkoutRouteReady>}
