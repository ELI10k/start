import WorkoutSession from "@/components/workouts/client/WorkoutSession";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
export default async function WorkoutSessionPage({params}:{params:Promise<{programId:string;dayId:string}>}){const{programId,dayId}=await params;return <WorkoutRouteReady><WorkoutSession programId={programId} dayId={dayId}/></WorkoutRouteReady>}
