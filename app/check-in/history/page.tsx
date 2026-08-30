import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import CheckInPhotoGallery from "@/components/client/CheckInPhotoGallery";
import { StateBlock } from "@/components/client/AppPatterns";
import { getAuthContext, getClientCheckInHistory } from "@/lib/data/product-repository";

export default async function CheckInHistoryPage(){
  const auth=await getAuthContext();
  if(!auth)redirect("/login");
  if(auth.role!=="client")redirect("/unauthorized");
  const data=await getClientCheckInHistory(auth.id);
  const photoCheckInIds=new Set([...data.checkIns].reverse().flatMap((entry,index)=>index===0||index===3?[entry.id]:[]));

  return <ClientShell>
    <PageHeader eyebrow="צ׳ק-אין" title="עדכונים קודמים" description="היסטוריה, תמונות ותגובות המאמן." action={{href:"/check-in",label:"עדכון חדש"}}/>
    {data.checkIns.length?
      <div className="grid gap-3">
        {data.checkIns.map((entry,index)=>
          // Each check-in collapses: the list is a timeline, and a client opens the
          // one they want rather than scrolling past every photo set on the way.
          // The newest is open, because a client arriving from "המאמן הגיב
          // לצ׳ק־אין" came to read one specific response and should not have to
          // hunt for it behind a closed row.
          <details key={entry.id} className="disclosure" open={index===0}>
            <summary>
              {new Date(entry.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
              {entry.coach_response?<span className="pill pill--green">תגובת מאמן</span>:null}
            </summary>
            <div className="disclosure__body">
              <dl className="compact-data-list">
                <div><span>היצמדות</span><strong>{entry.adherence}/10</strong></div>
                <div><span>אנרגיה</span><strong>{entry.energy}/10</strong></div>
                <div><span>שינה</span><strong>{entry.sleep}/10</strong></div>
              </dl>
              {photoCheckInIds.has(entry.id)?<CheckInPhotoGallery photos={data.photosByCheckIn[entry.id] ?? []} error={data.photoError}/>:null}
              {/* A response used to be the end of the exchange - it could be read
                  and nothing else. Now it can be answered. */}
              {entry.coach_response&&<div className="mt-4 rounded-2xl border border-[#16A34A]/30 bg-[#ECFDF3] p-4">
                <strong className="text-sm text-[#15803D]">תגובת המאמן</strong>
                <p className="mt-2 text-sm">{entry.coach_response}</p>
                <Link href="/messages" className="premium-secondary-button mt-3">תשובה למאמן</Link>
              </div>}
            </div>
          </details>
        )}
      </div>
      :<StateBlock icon={<ClipboardCheck aria-hidden="true" size={22}/>} title="עדיין אין צ׳ק-אינים" description="הצ׳ק־אין הראשון שתשלח יופיע כאן יחד עם תגובת המאמן."/>}
  </ClientShell>;
}
