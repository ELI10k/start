import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import { NewProgramEditor } from "@/components/workouts/coach/CustomProgramEditor";
export default async function NewWorkoutProgramPage(){const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="coach")redirect("/unauthorized");return <NewProgramEditor/>}
