/* eslint-disable @next/next/no-img-element -- profile URLs are coach-provided and may use arbitrary approved storage hosts. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Plus, Search as SearchIcon, UsersRound } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import { getAuthContext, listCoachDashboardClients } from "@/lib/data/product-repository";

type Search = { q?: string; sort?: "name" | "checkin" | "weight"; page?: string };
const labels = { active: "פעיל", waiting: "ממתין", inactive: "לא פעיל" } as const;
const pills = { active: "pill pill--green", waiting: "pill", inactive: "pill" } as const;
const sorts = [
  { value: "name", label: "שם" },
  { value: "checkin", label: "צ׳ק־אין אחרון" },
  { value: "weight", label: "משקל אחרון" },
] as const;
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
  const sortHref = (target: string) => `/coach/clients?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), sort: target })}`;

  return <main className="client-app-content">
    <header className="premium-page-header">
      <div>
        <p>START COACH</p>
        <h1>לקוחות</h1>
        <span>נתונים חיים מ־Supabase, לפי ההרשאות שלך בלבד.</span>
      </div>
      <span className="pill pill--green">{result.total} לקוחות</span>
    </header>

    {/* Search stays a plain GET form so the screen keeps working without JS, and
        sorting is three links rather than a select the coach has to submit. */}
    <form className="flex gap-2" role="search">
      <div className="food-picker__search flex-1">
        <label className="sr-only" htmlFor="q">חיפוש</label>
        <SearchIcon aria-hidden="true" size={17}/>
        <input id="q" name="q" defaultValue={params.q} className="nutrition-input" placeholder="שם, אימייל או טלפון"/>
      </div>
      <input type="hidden" name="sort" value={sort}/>
      <button className="premium-secondary-button">חיפוש</button>
    </form>

    <div className="chip-row mt-3">
      {sorts.map((item) => <Link key={item.value} href={sortHref(item.value)} className="chip" aria-current={sort === item.value ? "page" : undefined}>{item.label}</Link>)}
    </div>

    {result.items.length ?
      <div className="app-list">
        {result.items.map((client) =>
          <Link href={`/coach/clients/${client.id}`} key={client.id}>
            {client.avatar_url
              ? <img src={client.avatar_url} alt="" className="size-11 shrink-0 rounded-xl object-cover"/>
              : <span className="app-list__icon">{client.full_name.slice(0, 1)}</span>}
            <span className="app-list__main">
              <strong>{client.full_name}</strong>
              <span>{client.latestWeight ? `${client.latestWeight} ק״ג` : "אין מדידה"} · צ׳ק־אין {date(client.lastCheckInAt)}</span>
            </span>
            <span className={pills[client.dashboardStatus]}>{labels[client.dashboardStatus]}</span>
            {/* The whole row is one link, so the name, this label and the chevron
                are the same target rather than three competing ones - and a
                nested button here would be invalid and unreachable by keyboard. */}
            <span className="hidden shrink-0 text-sm font-bold text-[#16A34A] sm:inline">פתיחת תיק</span>
            <ChevronLeft aria-hidden="true" size={18}/>
          </Link>)}
      </div>
      : <StateBlock
          icon={<UsersRound aria-hidden="true" size={22}/>}
          title="לא נמצאו לקוחות"
          description="אין לקוחות תואמים לחיפוש, או שעדיין לא שויכו אליך לקוחות."
          action={<Link href="/coach/clients/new" className="premium-primary-button">לקוח חדש</Link>}
        />}

    {result.total > result.pageSize && <nav className="mt-6 flex items-center justify-center gap-3" aria-label="עמודי לקוחות">
      {result.page > 1 && <Link className="chip" href={pageHref(result.page - 1)}>הקודם</Link>}
      <span className="text-sm text-[#5B5F5B]">עמוד {result.page} מתוך {Math.ceil(result.total / result.pageSize)}</span>
      {result.page * result.pageSize < result.total && <Link className="chip" href={pageHref(result.page + 1)}>הבא</Link>}
    </nav>}

    <Link href="/coach/clients/new" className="fab fab--bare" aria-label="לקוח חדש">
      <Plus aria-hidden="true" size={18}/>לקוח חדש
    </Link>
  </main>;
}
