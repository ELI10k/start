/* eslint-disable @next/next/no-img-element -- profile URLs are coach-provided and may use arbitrary approved storage hosts. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getAuthContext, listCoachDashboardClients } from "@/lib/data/product-repository";

type Search = { q?: string; sort?: "name" | "checkin" | "weight"; page?: string };
const labels = { active: "פעיל", waiting: "ממתין", inactive: "לא פעיל" } as const;
const styles = { active: "border-[#16A34A]/30 bg-[#ECFDF3] text-[#16A34A]", waiting: "border-[#E5E7E5] bg-[#F7F8F7] text-[#0B0B0B]", inactive: "border-[#E5E7E5] bg-[#F7F8F7] text-[#3F433F]" } as const;
const date = (value: string | null) => value ? new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeZone: "Asia/Jerusalem" }).format(new Date(value)) : "אין נתון";

export default async function CoachClientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const params = await searchParams;
  const sort = params.sort === "checkin" || params.sort === "weight" ? params.sort : "name";
  const page = Math.max(1, Number(params.page) || 1);
  const result = await listCoachDashboardClients(auth.id, { query: params.q, sort, page });
  const pageHref = (target: number) => `/coach/clients?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), sort, page: String(target) })}`;
  return <main className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-6xl">
    <header><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/coach/clients/new" className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF] shadow-[0_10px_30px_rgba(212,175,55,0.16)] transition hover:bg-[#16A34A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A]"><Plus size={18} aria-hidden="true"/>לקוח חדש</Link><span className="rounded-full border border-[#16A34A]/25 bg-[#16A34A]/10 px-3 py-2 text-sm text-[#16A34A]">{result.total} לקוחות</span></div><div className="mt-5"><p className="text-xs font-black tracking-[.18em] text-[#16A34A]">START COACH</p><h1 className="mt-2 text-3xl font-black">לקוחות</h1><p className="mt-2 text-[#5B5F5B]">נתונים חיים מ־Supabase, לפי ההרשאות שלך בלבד.</p></div></header>
    <form className="mt-6 grid gap-3 rounded-[22px] border border-[#E5E7E5] bg-[#FFFFFF] p-4 sm:grid-cols-[1fr_190px_auto]"><label className="sr-only" htmlFor="q">חיפוש</label><input id="q" name="q" defaultValue={params.q} className="nutrition-input" placeholder="שם, אימייל או טלפון"/><label className="sr-only" htmlFor="sort">מיון</label><select id="sort" name="sort" defaultValue={sort} className="nutrition-input"><option value="name">מיון: שם</option><option value="checkin">מיון: צ׳ק־אין אחרון</option><option value="weight">מיון: משקל אחרון</option></select><button className="rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF]">חיפוש</button></form>
    {result.items.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.items.map((client) => <Link href={`/coach/clients/${client.id}`} key={client.id} className="group rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 transition hover:border-[#16A34A]/50"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{client.avatar_url ? <img src={client.avatar_url} alt="" className="size-12 rounded-2xl object-cover"/> : <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#16A34A]/10 font-black text-[#16A34A]">{client.full_name.slice(0, 1)}</span>}<div className="min-w-0"><h2 className="truncate text-lg font-black">{client.full_name}</h2><p className="truncate text-xs text-[#5B5F5B]">{client.email}</p></div></div><span className={`shrink-0 rounded-full border px-2 py-1 text-xs ${styles[client.dashboardStatus]}`}>{labels[client.dashboardStatus]}</span></div><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><Metric label="משקל אחרון" value={client.latestWeight ? `${client.latestWeight} ק״ג` : "אין מדידה"}/><Metric label="צ׳ק־אין" value={date(client.lastCheckInAt)}/><Metric label="כניסה אחרונה" value={date(client.lastLoginAt)}/><Metric label="יעד" value={client.clientProfile?.goal ?? "לא הוגדר"}/></dl><p className="mt-5 text-sm font-bold text-[#16A34A] group-hover:underline">פתיחת כרטיס לקוח ←</p></Link>)}</div> : <div className="mt-6 rounded-[26px] border border-dashed border-[#E5E7E5] p-12 text-center"><h2 className="font-black">לא נמצאו לקוחות</h2><p className="mt-2 text-sm text-[#5B5F5B]">אין לקוחות תואמים לחיפוש, או שעדיין לא שויכו אליך לקוחות.</p></div>}
    {result.total > result.pageSize && <nav className="mt-8 flex items-center justify-center gap-3" aria-label="עמודי לקוחות">{result.page > 1 && <Link className="rounded-xl border border-[#E5E7E5] px-4 py-2" href={pageHref(result.page - 1)}>הקודם</Link>}<span className="text-sm text-[#5B5F5B]">עמוד {result.page} מתוך {Math.ceil(result.total / result.pageSize)}</span>{result.page * result.pageSize < result.total && <Link className="rounded-xl border border-[#E5E7E5] px-4 py-2" href={pageHref(result.page + 1)}>הבא</Link>}</nav>}
  </div></main>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#F7F8F7] p-3"><dt className="text-xs text-[#5B5F5B]">{label}</dt><dd className="mt-1 truncate font-bold">{value}</dd></div>; }
