import AssignedProgram from "@/components/workouts/client/AssignedProgram";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import ClientShell from "@/components/client/ClientShell";
export default async function Page({params}:{params:Promise<{programId:string}>}){const{programId}=await params;return <ClientShell><WorkoutRouteReady><AssignedProgram programId={programId}/></WorkoutRouteReady></ClientShell>}
