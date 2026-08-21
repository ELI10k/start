import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Search as SearchIcon } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import { getAuthContext, listCoachClients } from "@/lib/data/product-repository";
import { listCoachThreads } from "@/lib/messages/repository";
import { formatIsraelDateTime } from "@/lib/date-time";

type Search = { q?: string; filter?: string };

const filters = [
  // Whose turn it is, which is the only question that produces work. Unread is
  // a different question and gets its own view rather than being the default.
  { value: "waiting", label: "ממתינות לתשובה" },
  { value: "unread", label: "לא נקראו" },
  { value: "all", label: "הכול" },
] as const;

/**
 * Every conversation the coach holds, in one place.
 *
 * The product had no such screen. A thread was reachable from the dashboard
 * panel - which lists only what is waiting - or from a tab inside one client's
 * file, which means a coach who wanted to write to somebody first had to
 * remember who, find them under לקוחות, open the file and pick a tab. Writing to
 * a client should not require navigating to them.
 *
 * Clients with no thread at all are listed too, under their own heading: the
 * point of an inbox for a coach is as much "who have I not spoken to" as
 * "who is waiting".
 */
export default async function CoachMessagesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");

  const [threads, clients] = await Promise.all([listCoachThreads(), listCoachClients(auth.id)]);
  const nameById = new Map(clients.map((client) => [client.id, client.full_name]));

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const filter = filters.some((item) => item.value === params.filter) ? params.filter! : "waiting";
  // Folded, like every other search in the product.
  const needle = query.toLocaleLowerCase("he");

  const named = threads.map((thread) => ({ ...thread, name: nameById.get(thread.clientId) ?? "לקוח שאינו פעיל" }));
  const visible = named.filter((thread) => {
    if (needle && !`${thread.name} ${thread.lastBody}`.toLocaleLowerCase("he").includes(needle)) return false;
    if (filter === "waiting") return thread.awaitingReply;
    if (filter === "unread") return thread.unread > 0;
    return true;
  });

  const withThread = new Set(threads.map((thread) => thread.clientId));
  const neverWritten = clients
    .filter((client) => !withThread.has(client.id))
    .filter((client) => !needle || client.full_name.toLocaleLowerCase("he").includes(needle))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "he"));

  const href = (value: string) =>
    `/coach/messages?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(value === "waiting" ? {} : { filter: value }) })}`;

  return <main className="client-app-content">
    <header className="premium-page-header">
      <div>
        <p>START COACH</p>
        <h1>הודעות</h1>
        <span>כל השיחות עם הלקוחות שלך, ומי מחכה לתשובה.</span>
      </div>
      <span className="pill pill--green">{named.filter((thread) => thread.awaitingReply).length}</span>
    </header>

    {/* A plain GET form, like the clients and menus screens: it works without JS
        and the result is a link the coach can keep. */}
    <form className="flex gap-2" role="search">
      <div className="food-picker__search flex-1">
        <label className="sr-only" htmlFor="q">חיפוש בשיחות</label>
        <SearchIcon aria-hidden="true" size={17}/>
        <input id="q" name="q" defaultValue={query} className="nutrition-input" placeholder="שם לקוח או תוכן הודעה"/>
      </div>
      {filter !== "waiting" && <input type="hidden" name="filter" value={filter}/>}
      <button className="premium-secondary-button">חיפוש</button>
    </form>

    <div className="chip-row mt-3">
      {filters.map((item) =>
        <Link key={item.value} href={href(item.value)} className="chip" aria-current={filter === item.value ? "page" : undefined}>
          {item.label}
        </Link>)}
    </div>

    {visible.length ? (
      <ul className="mt-4 grid gap-2">
        {visible.map((thread) =>
          <li key={thread.clientId}>
            <Link
              href={`/coach/clients/${thread.clientId}?tab=messages`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E7E5] bg-[#FFFFFF] p-4 text-sm"
            >
              <span className="min-w-0 flex-1">
                <strong className="block">{thread.name}</strong>
                <span className="mt-0.5 block truncate text-[#5B5F5B]">{thread.lastBody}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-[#5B5F5B]">{formatIsraelDateTime(thread.lastAt)}</span>
                {thread.unread > 0 && <span className="pill pill--green">{thread.unread} חדשות</span>}
                {thread.awaitingReply && thread.unread === 0 && <span className="pill">ממתין לתשובה</span>}
              </span>
            </Link>
          </li>)}
      </ul>
    ) : (
      <div className="mt-4">
        <StateBlock
          icon={<MessageSquare aria-hidden="true" size={22}/>}
          title={filter === "waiting" ? "אין שיחות שממתינות לך" : "אין שיחות להצגה"}
          description={filter === "waiting" ? "ענית לכולם. שיחה תופיע כאן ברגע שלקוח יכתוב." : "אפשר לשנות את הסינון או לחפש לקוח."}
        />
      </div>
    )}

    {neverWritten.length > 0 && <section className="mt-8">
      <h2 className="section-heading section-heading--compact">לקוחות שעוד לא התחלת איתם שיחה</h2>
      <ul className="mt-3 grid gap-2">
        {neverWritten.map((client) =>
          <li key={client.id}>
            <Link
              href={`/coach/clients/${client.id}?tab=messages`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#E5E7E5] p-4 text-sm"
            >
              <strong>{client.full_name}</strong>
              <span className="text-xs text-[#16A34A]">כתיבת הודעה</span>
            </Link>
          </li>)}
      </ul>
    </section>}
  </main>;
}
