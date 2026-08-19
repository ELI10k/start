import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getAuthContext, getCoachCheckInDashboard, listCoachClients, listCoachMenus } from "@/lib/data/product-repository";
import DashboardWorkoutActivity from "@/components/workouts/coach/DashboardWorkoutActivity";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
import { getCoachAttention } from "@/lib/coach-intelligence/proactive-repository";
import { listCoachThreads } from "@/lib/messages/repository";
import CoachAttentionPanel from "@/components/coach/CoachAttentionPanel";

/**
 * The coach's morning screen.
 *
 * It used to open with five counters and eight shortcuts, and put the panel that
 * says which clients are at risk below the check-in list - so the least
 * actionable thing on the page was first and the most actionable was last.
 * "לקוחות: 9" changes no decision; "דנה לא נכנסה שבועיים" does. The order is now
 * what needs doing, then what is waiting, then the counters.
 */
export default async function CoachDashboard() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");

  const [clients, menus, unreadNotifications, checkIns, attention, threads] = await Promise.all([
    listCoachClients(auth.id),
    listCoachMenus(auth.id),
    getUnreadNotificationCount(),
    getCoachCheckInDashboard(auth.id),
    getCoachAttention(auth.id),
    listCoachThreads(),
  ]);

  const nameById = new Map(clients.map((client) => [client.id, client.full_name]));
  const waitingThreads = threads.filter((thread) => thread.unread > 0);
  const pendingCheckIns = checkIns.newCount + checkIns.respondedCount;

  return <main className="px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-[#E5E7E5] pb-7">
        <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">START COACH</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">שלום, {auth.fullName.split(" ")[0]}</h1>
        <p className="mt-2 text-[#5B5F5B]">
          {pendingCheckIns || waitingThreads.length
            ? `${pendingCheckIns} צ׳ק־אינים ו־${waitingThreads.length} שיחות ממתינים לך.`
            : "אין משימות פתוחות. יום טוב."}
        </p>
      </header>

      {/* Unanswered messages, before anything else: a client who wrote is waiting
          on a person, not on a report. */}
      {waitingThreads.length > 0 && <section className="mt-6 rounded-[26px] border border-[#16A34A]/30 bg-[#F0FDF4] p-5">
        <h2 className="flex items-center gap-2 text-xl font-black"><MessageSquare aria-hidden="true" size={19}/>הודעות שממתינות לתשובה</h2>
        <div className="mt-4 grid gap-2">
          {waitingThreads.map((thread) =>
            <Link key={thread.clientId} href={`/coach/clients/${thread.clientId}?tab=messages`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] p-3 text-sm">
              <span className="min-w-0">
                <strong>{nameById.get(thread.clientId) ?? "לקוח"}</strong>
                <span className="mr-2 block truncate text-[#5B5F5B] sm:inline">{thread.lastBody}</span>
              </span>
              <span className="pill pill--green">{thread.unread} חדשות</span>
            </Link>)}
        </div>
      </section>}

      <CoachAttentionPanel items={attention}/>

      <section className="mt-6 rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">צ׳ק־אינים אחרונים</h2>
            <p className="mt-1 text-xs text-[#5B5F5B]">עדכונים חדשים דורשים מעבר ותגובה.</p>
          </div>
          <Link href="/coach/check-ins" className="text-sm font-bold text-[#16A34A]">לכל הצ׳ק־אינים</Link>
        </div>
        {checkIns.recent.length
          ? <div className="mt-4 grid gap-2">
              {checkIns.recent.map((item) =>
                <Link key={item.id} href={`/coach/check-ins#check-in-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F8F7] p-3 text-sm">
                  <span>
                    <strong>{item.client?.full_name ?? "לקוח"}</strong>
                    <span className="mr-2 text-[#5B5F5B]">{new Date(item.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</span>
                  </span>
                  <span className={item.handled_at ? "text-[#16A34A]" : "text-[#0B0B0B]"}>
                    {item.handled_at ? "טופל" : item.status === "reviewed" ? "נענתה" : "חדש"}
                  </span>
                </Link>)}
            </div>
          : <p className="mt-4 rounded-xl border border-dashed border-[#E5E7E5] p-8 text-center text-[#5B5F5B]">אין צ׳ק־אינים להצגה.</p>}
      </section>

      <DashboardWorkoutActivity/>

      {/* Three shortcuts, not eight. The other five were all reachable from the
          navigation directly above them. */}
      <section className="mt-8">
        <h2 className="sr-only">פעולות מהירות</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Quick href="/coach/clients/new" label="לקוח חדש" primary/>
          <Quick href="/coach/menus/new" label="תפריט חדש"/>
          <Quick href="/coach/check-ins/review" label="מעבר על צ׳ק־אינים"/>
        </div>
      </section>

      {/* The counters last: they describe the practice, they do not ask for
          anything. */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="לקוחות פעילים" value={clients.length}/>
        <Metric label="תפריטים" value={menus.length}/>
        <Metric label="צ׳ק־אינים חדשים" value={checkIns.newCount}/>
        <Metric label="ממתינים לטיפול" value={pendingCheckIns}/>
        <Metric label="התראות פתוחות" value={unreadNotifications}/>
      </section>
    </div>
  </main>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="start-surface rounded-[22px] p-4">
    <strong className="text-2xl">{value}</strong>
    <span className="mt-1 block text-xs text-[#5B5F5B]">{label}</span>
  </div>;
}

function Quick({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return <Link
    href={href}
    className={primary
      ? "start-action flex min-h-14 items-center justify-center rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF]"
      : "start-action flex min-h-14 items-center justify-center rounded-2xl border border-[#E5E7E5] bg-[#FFFFFF] px-5 font-black text-[#16A34A]"}
  >{label}</Link>;
}
