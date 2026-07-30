import WorkoutDayPreview from "@/components/workouts/WorkoutDayPreview";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
export default async function CoachWorkoutDayPage({params}:{params:Promise<{id:string;dayId:string}>}){const{id,dayId}=await params;return <WorkoutRouteReady><WorkoutDayPreview programId={id} dayId={dayId}/></WorkoutRouteReady>}
