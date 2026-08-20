import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import PersistedCheckInForm from "@/components/client/PersistedCheckInForm";
import { getAuthContext } from "@/lib/data/product-repository";
import { checkInPhotoCycle } from "@/lib/check-ins/photo-cycle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function CheckInPage(){const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="client")redirect("/unauthorized");const supabase=await createSupabaseServerClient();const{count}=await supabase.from("check_ins").select("id",{count:"exact",head:true}).eq("client_id",auth.id);const cycle=checkInPhotoCycle(count??0);// Which check-in this is, and when photos are next due. The cycle already
// returns both; the screen said neither, so "צרפו שלוש תמונות" arrived as a
// refusal at the moment of submitting rather than as something to come prepared
// for - and a client with no photos on them had to abandon the form.
const description=cycle.photosRequired
  ?`צ׳ק־אין מספר ${cycle.nextCheckInNumber}. בצ׳ק־אין הזה צריך גם שלוש תמונות: קדימה, צד וגב.`
  :`צ׳ק־אין מספר ${cycle.nextCheckInNumber}. תמונות יידרשו שוב בעוד ${cycle.remainingUntilPhotos} ${cycle.remainingUntilPhotos===1?"צ׳ק־אין":"צ׳ק־אינים"}.`;
return <ClientShell><PageHeader eyebrow="עדכון שבועי" title="איך עבר עליך השבוע?" description={description} action={{href:"/check-in/history",label:"היסטוריה"}}/><PersistedCheckInForm photosRequired={cycle.photosRequired} firstCheckIn={cycle.isFirst}/></ClientShell>}
