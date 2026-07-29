import AssignedProgram from "@/components/workouts/client/AssignedProgram";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
export default async function Page({params}:{params:Promise<{programId:string}>}){const{programId}=await params;return <WorkoutRouteReady><AssignedProgram programId={programId}/></WorkoutRouteReady>}
