import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, Sparkles } from "lucide-react";
import { getAuthContext, getCoachCheckInDashboard, listCoachClients, listCoachMenus } from "@/lib/data/product-repository";
import DashboardWorkoutActivity from "@/components/workouts/coach/DashboardWorkoutActivity";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
import { getCoachAttention } from "@/lib/coach-intelligence/proactive-repository";
import { listCoachThreads } from "@/lib/messages/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CoachAttentionPanel from "@/components/coach/CoachAttentionPanel";
import DashboardCheckInActivity from "@/components/coach/DashboardCheckInActivity";

/**
 * The coach's morning screen.
 *
 * It opens with the coach's shortcuts and practice counters, followed by the
 * queues and reports that need review. Unanswered client messages remain first
 * because a client who wrote is already waiting for a person.
 */
export default async function CoachDashboard() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");

  const supabase = await createSupabaseServerClient();
  const [clients, menus, unreadNotifications, checkIns, attention, threads, nutritionProposals, handledWorkouts] = await Promise.all([
    listCoachClients(auth.id),
    listCoachMenus(auth.id),
    getUnreadNotificationCount(),
    getCoachCheckInDashboard(auth.id),
    getCoachAttention(auth.id),
    listCoachThreads(),
    // A count, not the rows: this screen only has to say whether there is
    // something to read, and the proposals screen is one tap away.
    supabase.from("nutrition_adaptation_proposals")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("coach_workout_reviews").select("workout_session_id").eq("coach_id",auth.id),
  ]);
  const pendingProposals = nutritionProposals.count ?? 0;

  const nameById = new Map(clients.map((client) => [client.id, client.full_name]));
  // Whose turn it is, not what is unread.
  //
  // This listed threads with unread messages, so opening one removed it from the
  // list - a coach who read a client's question on their phone and meant to
  // answer it at a desk arrived to an empty panel and no record that anyone was
  // waiting. Reading a message answers "have I seen this"; it does not answer
  // "have I replied". The panel now asks the second question, and marks which of
  // them have not even been read yet.
  const waitingThreads = threads.filter((thread) => thread.awaitingReply);
  const pendingCheckIns = checkIns.newCount + checkIns.respondedCount;

  return <main className="px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-[#E5E7E5] pb-7">
        <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">LIFE FIT COACH</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black"><MessageSquare aria-hidden="true" size={19}/>הודעות שממתינות לתשובה</h2>
          <Link href="/coach/messages" className="text-sm font-bold text-[#16A34A]">לכל השיחות</Link>
        </div>
        <div className="mt-4 grid gap-2">
          {waitingThreads.map((thread) =>
            <Link key={thread.clientId} href={`/coach/clients/${thread.clientId}?tab=messages`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFFFFF] p-3 text-sm">
              <span className="min-w-0">
                <strong>{nameById.get(thread.clientId) ?? "לקוח"}</strong>
                <span className="mr-2 block truncate text-[#5B5F5B] sm:inline">{thread.lastBody}</span>
              </span>
              {/* How long they have been waiting is the part that decides who to
                  answer first; "unread" only says whether the coach has looked. */}
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-[#5B5F5B]">{waitedFor(thread.lastAt)}</span>
                {thread.unread > 0 && <span className="pill pill--green">{thread.unread} חדשות</span>}
              </span>
            </Link>)}
        </div>
      </section>}

      <section data-dashboard-section="quick-actions" className="mt-8">
        <h2 className="sr-only">פעולות מהירות</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Quick href="/coach/clients/new" label="לקוח חדש" primary/>
          <Quick href="/coach/menus/new" label="תפריט חדש"/>
          <Quick href="/coach/check-ins/review" label="מעבר על צ׳ק־אינים"/>
        </div>
      </section>

      <section data-dashboard-section="practice-metrics" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric href="/coach/clients" label="לקוחות פעילים" value={clients.length}/>
        <Metric href="/coach/menus" label="תפריטים" value={menus.length}/>
        <Metric href="/coach/check-ins?status=new" label="צ׳ק־אינים חדשים" value={checkIns.newCount}/>
        <Metric href="/coach/check-ins" label="ממתינים לטיפול" value={pendingCheckIns}/>
        <Metric href="/coach/notifications" label="התראות פתוחות" value={unreadNotifications}/>
      </section>

      <CoachAttentionPanel items={attention.items} measured={attention.measured}/>

      {/* Only when the last fortnight actually asked for something. A quiet week
          writes no proposals, and a panel that is always there saying "0" is a
          panel a coach stops seeing. */}
      {pendingProposals > 0 && <section className="mt-6 rounded-[26px] border border-[#16A34A]/30 bg-[#F0FDF4] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-xl font-black"><Sparkles aria-hidden="true" size={19}/>התפריט מבקש עדכון</h2>
            <p className="mt-1 text-sm text-[#5B5F5B]">
              {pendingProposals} הצעות שנגזרו מ־14 הימים האחרונים — כמויות שתוקנו, ארוחות שלא נאכלות ומגמת משקל.
            </p>
          </div>
          <Link href="/coach/nutrition/proposals" className="text-sm font-bold text-[#16A34A]">לעיון ואישור</Link>
        </div>
      </section>}

      <DashboardCheckInActivity items={checkIns.recent}/>

      <DashboardWorkoutActivity handledIds={(handledWorkouts.data??[]).map((row)=>row.workout_session_id)}/>
    </div>
  </main>;
}

// How long a client has been waiting for an answer, in the coarsest unit that
// is still true. A timestamp needs subtracting; "לפני 3 שעות" does not.
function waitedFor(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return "עכשיו";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ${days === 1 ? "יום" : "ימים"}`;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="start-surface rounded-[22px] p-4 transition hover:border-[#16A34A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A]">
    <strong className="text-2xl">{value}</strong>
    <span className="mt-1 block text-xs text-[#5B5F5B]">{label}</span>
  </Link>;
}

function Quick({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return <Link
    href={href}
    className={primary
      ? "start-action flex min-h-14 items-center justify-center rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF]"
      : "start-action flex min-h-14 items-center justify-center rounded-2xl border border-[#E5E7E5] bg-[#FFFFFF] px-5 font-black text-[#16A34A]"}
  >{label}</Link>;
}
