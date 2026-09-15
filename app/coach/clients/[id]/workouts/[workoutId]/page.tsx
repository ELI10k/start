import CompletedWorkoutDetail from "@/components/workouts/client/CompletedWorkoutDetail";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import { requireCoach } from "@/lib/auth/guards";

export default async function CoachWorkoutDetailPage({params}:{params:Promise<{id:string;workoutId:string}>}){
  await requireCoach();
  const{id,workoutId}=await params;
  return <WorkoutRouteReady><CompletedWorkoutDetail workoutId={workoutId} clientId={id} readOnly backHref={`/coach/clients/${id}/workouts`}/></WorkoutRouteReady>;
}
