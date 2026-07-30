import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import PersistedCheckInForm from "@/components/client/PersistedCheckInForm";
import { getAuthContext } from "@/lib/data/product-repository";
import { checkInPhotoCycle } from "@/lib/check-ins/photo-cycle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function CheckInPage(){const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="client")redirect("/unauthorized");const supabase=await createSupabaseServerClient();const{count,error}=await supabase.from("check_ins").select("id",{count:"exact",head:true}).eq("client_id",auth.id);if(error)throw error;const cycle=checkInPhotoCycle(count??0);return <ClientShell><PageHeader eyebrow="עדכון שבועי" title="איך עבר עליך השבוע?" description="הצ׳ק-אין יישמר ויופיע למאמן." action={{href:"/check-in/history",label:"היסטוריה"}}/><PersistedCheckInForm photosRequired={cycle.photosRequired}/></ClientShell>}
