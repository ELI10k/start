import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import PersistedProgressForm from "@/components/client/PersistedProgressForm";
import PersistedProgressHistory from "@/components/client/PersistedProgressHistory";
import ProgressPhotoGallery from "@/components/client/ProgressPhotoGallery";
import { getAuthContext, getClientCheckInHistory, getClientOverview } from "@/lib/data/product-repository";
import { israelDateKey } from "@/lib/progress/measurements";

export default async function ProgressPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const today = israelDateKey();
  const [data,checkInHistory] = await Promise.all([getClientOverview(auth.id, today),getClientCheckInHistory(auth.id)]);
  const photoCheckInIds = new Set([...checkInHistory.checkIns].reverse().flatMap((checkIn,index)=>index===0||index===3?[checkIn.id]:[]));
  const photoSessions=checkInHistory.checkIns.flatMap((checkIn)=>{
    if(!photoCheckInIds.has(checkIn.id))return [];
    const photos=checkInHistory.photosByCheckIn[checkIn.id]??[];
    return photos.length?[{checkInId:checkIn.id,submittedAt:checkIn.submitted_at,photos}]:[];
  });
  return <ClientShell>
    <PageHeader eyebrow="התקדמות" title="משקל ומדידות" description="המדידות נשמרות בחשבון שלך ומוצגות לאורך זמן." action={{href:"/check-in",label:"צ׳ק־אין"}}/>
    <div className="grid gap-4">
      <PersistedProgressHistory entries={data.progress}/>
      <ProgressPhotoGallery sessions={photoSessions} error={checkInHistory.photoError}/>
    </div>
    <PersistedProgressForm today={today}/>
  </ClientShell>;
}
