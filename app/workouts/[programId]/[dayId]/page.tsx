import WorkoutSession from "@/components/workouts/client/WorkoutSession";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import ClientShell from "@/components/client/ClientShell";
export default async function WorkoutSessionPage({params}:{params:Promise<{programId:string;dayId:string}>}){const{programId,dayId}=await params;return <ClientShell><WorkoutRouteReady><WorkoutSession programId={programId} dayId={dayId}/></WorkoutRouteReady></ClientShell>}
