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
import { israelDateKey } from "@/lib/date-time";
import DashboardNutritionActivity, { type NutritionActivityItem } from "@/components/coach/DashboardNutritionActivity";

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

  const supabase = await createSupabaseServerClient();
  const [clients, menus, unreadNotifications, checkIns, attention, threads, nutritionProposals, handledWorkouts, handledNutrition] = await Promise.all([
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
    supabase.from("coach_nutrition_reviews").select("client_id,activity_date").eq("coach_id",auth.id),
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
  const openCheckIns = checkIns.recent.filter((item) => !item.handled_at);
  const nutritionActivity = await loadNutritionActivity(
    supabase,
    clients.map((client) => client.id),
  );

  return <main className="px-4 py-10 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <section>
        <h2 className="sr-only">פעולות מהירות</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Quick href="/coach/clients/new" label="לקוח חדש" primary/>
          <Quick href="/coach/menus/new" label="תפריט חדש"/>
          <Quick href="/coach/check-ins/review" label="מעבר על צ׳ק־אינים"/>
        </div>
      </section>

      <header className="mt-8 border-b border-[#E5E7E5] pb-7">
        <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">START LIFE FIT COACH</p>
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

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
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

      <section className="mt-6 rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">צ׳ק־אינים אחרונים</h2>
            <p className="mt-1 text-xs text-[#5B5F5B]">עדכונים חדשים דורשים מעבר ותגובה.</p>
          </div>
          <Link href="/coach/check-ins" className="text-sm font-bold text-[#16A34A]">לכל הצ׳ק־אינים</Link>
        </div>
        {openCheckIns.length
          ? <div className="mt-4 grid gap-2">
              {openCheckIns.map((item) =>
                <Link key={item.id} href={`/coach/check-ins#check-in-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F8F7] p-3 text-sm">
                  <span>
                    <strong>{item.client?.full_name ?? "לקוח"}</strong>
                    <span className="mr-2 text-[#5B5F5B]">{new Date(item.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</span>
                  </span>
                  <span className="text-[#0B0B0B]">
                    {item.status === "reviewed" ? "נענתה — ממתין לטיפול" : "חדש"}
                  </span>
                </Link>)}
            </div>
          : <p className="mt-4 rounded-xl border border-dashed border-[#E5E7E5] p-8 text-center text-[#5B5F5B]">אין צ׳ק־אינים להצגה.</p>}
      </section>

      <DashboardWorkoutActivity handledIds={(handledWorkouts.data??[]).map((row)=>row.workout_session_id)}/>

      <DashboardNutritionActivity
        items={nutritionActivity}
        clientNames={Object.fromEntries(nameById)}
        handledKeys={(handledNutrition.data ?? []).map((row) => `${row.client_id}:${row.activity_date}`)}
      />

    </div>
  </main>;
}

async function loadNutritionActivity(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  clientIds: readonly string[],
): Promise<readonly NutritionActivityItem[]> {
  if (!clientIds.length) return [];
  const today = israelDateKey();
  const from = new Date(`${today}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 6);
  const fromDate = from.toISOString().slice(0, 10);
  const [statuses, foodLogs] = await Promise.all([
    supabase
      .from("meal_day_status")
      .select("client_id,status,status_date,updated_at")
      .in("client_id", [...clientIds])
      .gte("status_date", fromDate)
      .lte("status_date", today)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("client_food_log")
      .select("client_id,log_date,created_at")
      .in("client_id", [...clientIds])
      .gte("log_date", fromDate)
      .lte("log_date", today)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  // Nutrition activity is useful context, but a rolling deployment with one of
  // these newer tables missing must not take the coach's whole dashboard down.
  const grouped = new Map<string, NutritionActivityItem>();
  const update = (
    clientId: string,
    date: string,
    at: string,
    change: Pick<NutritionActivityItem, "eaten" | "skipped" | "outsideFoods">,
  ) => {
    const key = `${clientId}:${date}`;
    const current = grouped.get(key) ?? {
      clientId,
      date,
      eaten: 0,
      skipped: 0,
      outsideFoods: 0,
      latestAt: at,
    };
    grouped.set(key, {
      ...current,
      eaten: current.eaten + change.eaten,
      skipped: current.skipped + change.skipped,
      outsideFoods: current.outsideFoods + change.outsideFoods,
      latestAt: at > current.latestAt ? at : current.latestAt,
    });
  };
  for (const row of statuses.data ?? [])
    update(row.client_id, row.status_date, row.updated_at, {
      eaten: row.status === "eaten" ? 1 : 0,
      skipped: row.status === "not_eaten" ? 1 : 0,
      outsideFoods: 0,
    });
  for (const row of foodLogs.data ?? [])
    update(row.client_id, row.log_date, row.created_at, {
      eaten: 0,
      skipped: 0,
      outsideFoods: 1,
    });
  return [...grouped.values()]
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt))
    .slice(0, 5);
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
