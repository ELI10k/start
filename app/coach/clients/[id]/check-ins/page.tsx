import { redirect } from "next/navigation";
export default async function ClientCheckInsPage({params}:{params:Promise<{id:string}>}){redirect(`/coach/clients/${(await params).id}`)}
