import { redirect } from "next/navigation";
import CreateClientForm from "@/components/coach/CreateClientForm";
import { getAuthContext } from "@/lib/data/product-repository";

export default async function NewClientPage(){const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="coach")redirect("/unauthorized");return <main className="px-4 py-8 sm:px-6"><CreateClientForm/></main>}
