import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth/guards";
export default async function ClientProgressPage({params}:{params:Promise<{id:string}>}){await requireCoach();redirect(`/coach/clients/${(await params).id}`)}
