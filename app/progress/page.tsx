import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import ProgressMetricsDashboard from "@/components/client/ProgressMetricsDashboard";
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
    <PageHeader eyebrow="התקדמות" title="מדדי התקדמות" description="כל המדדים שלך במקום אחד." action={{href:"/check-in",label:"צ׳ק־אין"}}/>
    <div className="grid gap-4">
      <ProgressMetricsDashboard
        entries={data.progress}
        targetWeight={data.clientProfile.target_weight}
        nutritionGoal={data.clientProfile.nutrition_goal}
        photoSessions={photoSessions}
        photoError={checkInHistory.photoError}
        today={today}
      />
    </div>
  </ClientShell>;
}
