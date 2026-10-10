import CoachWorkoutProgram from "@/components/workouts/coach/CoachWorkoutProgram";
import CustomProgramEditor from "@/components/workouts/coach/CustomProgramEditor";
import WorkoutRouteReady from "@/components/workouts/WorkoutRouteReady";
import { requireCoach } from "@/lib/auth/guards";
export default async function CoachWorkoutProgramPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{clientId?:string;assignmentId?:string}>}){await requireCoach();const[{id},context]=await Promise.all([params,searchParams]);const clientContext=Boolean(context.clientId&&context.assignmentId);return <WorkoutRouteReady>{clientContext&&<CustomProgramEditor id={id} clientId={context.clientId} assignmentId={context.assignmentId}/>}<CoachWorkoutProgram id={id}/>{!clientContext&&<CustomProgramEditor id={id}/>}</WorkoutRouteReady>}
