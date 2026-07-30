import ClientWorkoutReview from "@/components/workouts/coach/ClientWorkoutReview";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <ClientWorkoutReview clientId={id}/>}
