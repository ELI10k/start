import Link from "next/link";
import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import PersistedCheckInForm from "@/components/client/PersistedCheckInForm";
import { getAuthContext } from "@/lib/data/product-repository";
import { checkInPhotoCycle } from "@/lib/check-ins/photo-cycle";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIsraelDate } from "@/lib/date-time";
import WithdrawCheckIn from "@/components/client/WithdrawCheckIn";
export default async function CheckInPage(){const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="client")redirect("/unauthorized");const supabase=await createSupabaseServerClient();
const[{count},{data:weekState}]=await Promise.all([
  supabase.from("check_ins").select("id",{count:"exact",head:true}).eq("client_id",auth.id),
  // Whether this week already has one, and when the next may be filed. The rule
  // is a database trigger; asking here means the client is told on arrival
  // rather than refused after six steps.
  // Until 202608210004 is applied the function does not exist, and the screen
  // behaves exactly as it did - the form is simply offered.
  supabase.rpc("check_in_week_state"),
]);
// This week's check-in, so it can be taken back while it is still unanswered.
// Only the id is needed, and only when there is one.
const{data:thisWeek}=await supabase.from("check_ins").select("id,coach_response,handled_at").eq("client_id",auth.id).order("submitted_at",{ascending:false}).limit(1).maybeSingle();
const week=Array.isArray(weekState)?weekState[0]:weekState;
const submittedThisWeek=week?.submitted===true;
const nextOpens=week?.next_opens?formatIsraelDate(`${week.next_opens}T12:00:00Z`,{weekday:"long",day:"numeric",month:"long"}):null;
const cycle=checkInPhotoCycle(count??0);// Which check-in this is, and when photos are next due. The cycle already
// returns both; the screen said neither, so "צרפו שלוש תמונות" arrived as a
// refusal at the moment of submitting rather than as something to come prepared
// for - and a client with no photos on them had to abandon the form.
const description=cycle.photosRequired
  ?`צ׳ק־אין מספר ${cycle.nextCheckInNumber}. בצ׳ק־אין הזה צריך גם שלוש תמונות: קדימה, צד וגב.`
  :`צ׳ק־אין מספר ${cycle.nextCheckInNumber}. תמונות יידרשו שוב בעוד ${cycle.remainingUntilPhotos} ${cycle.remainingUntilPhotos===1?"צ׳ק־אין":"צ׳ק־אינים"}.`;
return <ClientShell><PageHeader eyebrow="עדכון שבועי" title="איך עבר עליך השבוע?" description={submittedThisWeek?"הצ׳ק־אין של השבוע כבר נשלח.":description} action={{href:"/check-in/history",label:"היסטוריה"}}/>
{submittedThisWeek
  ? <div className="start-empty rounded-[24px] p-10 text-center sm:p-12">
      <h2 className="font-black">הצ׳ק־אין של השבוע נשלח</h2>
      <p className="mt-2 text-sm text-[#5B5F5B]">
        המאמן קיבל אותו.{nextOpens?` הצ׳ק־אין הבא נפתח ב${nextOpens}.`:""} רוצה לעדכן משהו לפני כן — אפשר לכתוב למאמן.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link href="/check-in/history" className="premium-primary-button">לצפייה בצ׳ק־אין</Link>
        <Link href="/messages" className="premium-secondary-button">הודעה למאמן</Link>
        {/* Only while it is still the client's to take back. Once the coach has
            replied or closed it, the database refuses and the button would be an
            offer the product cannot keep. */}
        {thisWeek&&!thisWeek.coach_response&&!thisWeek.handled_at
          ? <WithdrawCheckIn checkInId={String(thisWeek.id)}/>
          : null}
      </div>
    </div>
  : <PersistedCheckInForm photosRequired={cycle.photosRequired} firstCheckIn={cycle.isFirst}/>}
</ClientShell>}
