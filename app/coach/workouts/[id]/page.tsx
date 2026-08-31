import CoachWorkoutProgram from "@/components/workouts/coach/CoachWorkoutProgram";
import CustomProgramEditor from "@/components/workouts/coach/CustomProgramEditor";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import { requireCoach } from "@/lib/auth/guards";
export default async function CoachWorkoutProgramPage({params}:{params:Promise<{id:string}>}){await requireCoach();const{id}=await params;return <WorkoutRouteReady><CoachWorkoutProgram id={id}/><CustomProgramEditor id={id}/></WorkoutRouteReady>}
