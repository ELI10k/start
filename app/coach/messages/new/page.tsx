import Link from "next/link";
import { redirect } from "next/navigation";
import { Search as SearchIcon, Send } from "lucide-react";
import { getAuthContext, listCoachClients } from "@/lib/data/product-repository";

export default async function NewCoachMessagePage({searchParams}:{searchParams:Promise<{q?:string}>}){
  const auth=await getAuthContext();
  if(!auth)redirect("/login");
  if(auth.role!=="coach")redirect("/unauthorized");
  const clients=await listCoachClients(auth.id);
  const query=((await searchParams).q??"").trim();
  const needle=query.toLocaleLowerCase("he");
  const visible=clients.filter((client)=>!needle||client.full_name.toLocaleLowerCase("he").includes(needle));

  return <main className="client-app-content">
    <Link href="/coach/messages" className="text-sm font-bold text-[#16A34A]">חזרה להודעות</Link>
    <header className="premium-page-header mt-3">
      <div><p>START LIFE FIT COACH</p><h1>שליחת הודעה ללקוח</h1><span>בחר לקוח כדי לפתוח את השיחה ולשלוח טקסט או תמונה.</span></div>
    </header>
    <form className="flex gap-2" role="search">
      <div className="food-picker__search flex-1">
        <label className="sr-only" htmlFor="client-message-search">חיפוש לקוח</label>
        <SearchIcon aria-hidden="true" size={17}/>
        <input id="client-message-search" name="q" defaultValue={query} className="nutrition-input" placeholder="שם הלקוח" autoFocus/>
      </div>
      <button className="premium-secondary-button">חיפוש</button>
    </form>
    {visible.length?<ul className="mt-4 grid gap-2">
      {visible.map((client)=><li key={client.id}>
        <Link href={`/coach/clients/${client.id}?tab=messages`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E7E5] bg-white p-4">
          <strong>{client.full_name}</strong>
          <span className="flex items-center gap-2 text-sm font-bold text-[#16A34A]"><Send aria-hidden="true" size={16}/>פתיחת שיחה</span>
        </Link>
      </li>)}
    </ul>:<p className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] p-8 text-center text-[#5B5F5B]">לא נמצאו לקוחות בשם הזה.</p>}
  </main>;
}
