import ClientWorkoutReview from "@/components/workouts/coach/ClientWorkoutReview";
import { requireCoach } from "@/lib/auth/guards";
export default async function Page({params}:{params:Promise<{id:string}>}){await requireCoach();const{id}=await params;return <ClientWorkoutReview clientId={id}/>}
