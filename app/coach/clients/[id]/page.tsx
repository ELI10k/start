/* eslint-disable @next/next/no-img-element -- profile URLs are coach-provided and may use arbitrary approved storage hosts. */
import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import SubmitButton from "@/components/forms/SubmitButton";
import ReviewCheckInForm from "@/components/coach/ReviewCheckInForm";
import { MetricTile } from "@/components/client/PremiumUI";
import { resetClientDevice } from "@/app/actions/product";
import { getAuthContext, getCoachClientDashboard } from "@/lib/data/product-repository";
import EnableFreeMenu from "@/components/coach/EnableFreeMenu";
import { resendClientInvite, sendClientMagicLink, sendClientPasswordReset } from "@/app/actions/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatIsraelDateTime } from "@/lib/date-time";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClientDetailExtras from "@/components/coach/ClientDetailExtras";

const date = (value: string | null) => value ? formatIsraelDateTime(value) : "אין נתון";
const number = (value: number) => Math.round(value).toLocaleString("he-IL");

export default async function CoachClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; invite?: string; login?: string }> }) {
  const auth = await getAuthContext(); if (!auth) redirect("/login"); if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params; const query=await searchParams; const data = await getCoachClientDashboard(auth.id, id); if (!data) notFound();
  const lastCheckIn = data.checkIns[0] ?? null;
  const latestNavelMeasurement=data.progress.find((entry)=>entry.navel_circumference!==null);
  const alertRows = [!lastCheckIn ? "צ׳ק־אין ממתין" : null, data.workouts.assignment && data.workouts.weeklyCompletionPercent < 100 ? "אימון שבועי שטרם הושלם" : null, data.menu && data.nutrition.completionPercent < 100 ? "ארוחות שטרם סומנו" : null].filter(Boolean);
  const intake=data.profile.clientProfile;
  const supabase=await createSupabaseServerClient();
  const [{ data: invitations }, { data: contentRows }, { data: contentAssignments }, { data: clientNotifications }, { data: coachNotes }]=await Promise.all([
    supabase.from("client_invitation_statuses").select("id,status,effective_status,sent_at,expires_at,opened_at,onboarding_completed_at").eq("client_id",id).order("sent_at",{ascending:false}),
    supabase.from("content_items").select("id,title").eq("status","published").order("sort_order"),
    supabase.from("client_content_assignments").select("content_item_id").eq("client_id",id),
    supabase.from("notifications").select("id,title,body,href,created_at,read_at").eq("recipient_id",id).order("created_at",{ascending:false}).limit(20),
    supabase.from("coach_client_notes").select("id,body,created_at,updated_at").eq("client_id",id).eq("coach_id",auth.id).order("created_at",{ascending:false}),
  ]);
  const { data: { user: authUser } } = await createSupabaseAdminClient().auth.admin.getUserById(id);
  const accountActivated=Boolean(authUser?.email_confirmed_at);
  const latestInvitation=invitations?.[0] ?? null;
  const invitationExpired=latestInvitation?.effective_status==="expired";
  const invitationStatus=intake?.onboarding_completed ? "לקוח פעיל" : !latestInvitation ? "טרם נשלחה הזמנה" : invitationExpired ? "ההזמנה פגה" : latestInvitation.effective_status==="opened" ? "ההזמנה נפתחה" : "הזמנה נשלחה";
  const preferences=intake?.preferences && typeof intake.preferences==="object" && !Array.isArray(intake.preferences) ? Object.entries(intake.preferences).filter(([, item]) => item !== null && item !== "") : [];

  return <main className="client-app-content">
    <header className="flex items-center gap-4 pb-4">
      {data.profile.avatar_url
        ? <img src={data.profile.avatar_url} alt="" className="size-14 shrink-0 rounded-2xl object-cover"/>
        : <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-xl font-black text-[#16A34A]">{data.profile.full_name.slice(0, 1)}</span>}
      <div className="min-w-0">
        <p className="text-xs font-black tracking-widest text-[#16A34A]">לקוח משויך</p>
        <h1 className="mt-1 truncate text-2xl font-black">{data.profile.full_name}</h1>
        <p className="mt-1 truncate text-xs text-[#5B5F5B]">{data.profile.email}</p>
      </div>
    </header>
    <p className="pill">{invitationStatus}</p>

    {(query.created==="1" || query.invite==="resent" || query.login) && <p role="status" className="mt-4 rounded-2xl border border-[#16A34A]/30 bg-[#ECFDF3] p-4 text-sm font-bold text-[#15803D]">{query.invite==="resent" ? "נשלחה הזמנה חדשה ללקוח." : query.login==="access-link-sent" ? "נשלח קישור כניסה מאובטח ללקוח." : query.login==="password-reset-sent" ? "קישור לאיפוס סיסמה נשלח ללקוח." : "הלקוח נוצר והוזמן להשלמת הקליטה."}</p>}

    {/* What a coach checks first, before any section is opened. */}
    <section className="dashboard-metrics mt-4" aria-label="מדדי הלקוח">
      <MetricTile label="יעד" value={data.profile.clientProfile?.goal ?? "לא הוגדר"}/>
      <MetricTile label="משקל אחרון" value={data.progress[0] ? `${data.progress[0].weight} ק״ג` : "אין מדידה"}/>
      <MetricTile label="צ׳ק־אין אחרון" value={lastCheckIn ? date(lastCheckIn.submitted_at) : "ממתין"}/>
      <MetricTile label="היקף טבור" value={latestNavelMeasurement ? `${latestNavelMeasurement.navel_circumference} ס״מ` : "אין עדיין מדידת היקף טבור"}/>
    </section>

    {alertRows.length > 0 && <section className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-4" aria-labelledby="client-alerts">
      <h2 id="client-alerts" className="flex items-center gap-2 font-black text-[#DC2626]"><AlertTriangle aria-hidden="true" size={17}/>דורש תשומת לב</h2>
      <ul className="mt-2 grid gap-1 text-sm">{alertRows.map((alert) => <li key={alert}>{alert}</li>)}</ul>
    </section>}

    {/* Everything else is a section a coach opens on purpose. The card used to be
        one continuous scroll of nine panels, and the thing you came for was
        never the thing at the top. */}
    <div className="mt-5">
      <Section title="תזונה" summary={data.menu ? data.menu.title : "אין תפריט פעיל"} open>
        {data.menu ? <>
          <dl className="compact-data-list">
            <div><span>השלמת היום</span><strong>{data.nutrition.completionPercent}%</strong></div>
            <div><span>קלוריות</span><strong>{number(data.nutrition.totals.calories)}</strong></div>
            <div><span>חלבון</span><strong>{number(data.nutrition.totals.protein)} ג׳</strong></div>
            <div><span>פחמימות / שומן</span><strong>{number(data.nutrition.totals.carbs)} / {number(data.nutrition.totals.fat)} ג׳</strong></div>
          </dl>
          <p className="mt-3 text-sm text-[#5B5F5B]">{data.nutrition.completedItems} מתוך {data.nutrition.plannedItems} פריטים סומנו היום.</p>
          {data.nutrition.skippedMeals.length > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#5B5F5B]">סומנו כלא נאכלו:</span>
              {data.nutrition.skippedMeals.map((title) => <span key={title} className="pill pill--red">{title}</span>)}
            </p>
          )}
        </> : <Empty text="ללקוח עדיין לא שויך תפריט פעיל."/>}
      </Section>

      <Section title="אימונים" summary={data.workouts.program?.name ?? "אין תוכנית פעילה"} open>
        {data.workouts.assignment ? <dl className="compact-data-list">
          <div><span>השלמת השבוע</span><strong>{data.workouts.weeklyCompletionPercent}%</strong></div>
          <div><span>אימון אחרון</span><strong>{date(data.workouts.lastCompletedAt)}</strong></div>
          <div><span>אימון הבא</span><strong>{data.workouts.nextDayName ?? "לא הוגדר"}</strong></div>
          <div><span>תדירות</span><strong>{data.workouts.assignment.weekly_frequency} בשבוע</strong></div>
        </dl> : <Empty text="ללקוח עדיין לא שויכה תוכנית אימונים."/>}
      </Section>

      <Section title="צ׳ק־אין" summary="עדכון אחרון, הערות ותגובה">
        <div className="grid gap-3">{data.checkIns.slice(0, 4).map((entry) => <article key={entry.id} className="rounded-2xl border border-[#E5E7E5] p-4">
          <p className="text-sm text-[#5B5F5B]">{date(entry.submitted_at)} · היצמדות {entry.adherence}/5 · אנרגיה {entry.energy}/5 · שינה {entry.sleep}/5</p>
          {entry.notes && <p className="mt-2 text-sm">{entry.notes}</p>}
          {entry.coach_response ? <p className="mt-3 border-r-2 border-[#16A34A] pr-3 text-sm text-[#15803D]">{entry.coach_response}</p> : <ReviewCheckInForm checkInId={entry.id} clientId={id}/>}
          <p className="mt-3 text-xs text-[#5B5F5B]">תמונות: אין תמונות זמינות בצ׳ק־אין זה.</p>
        </article>)}</div>
        {!data.checkIns.length && <Empty text="אין צ׳ק־אין שמור."/>}
      </Section>

      <Section title="התקדמות" summary="משקל והיקף טבור">
        {data.progress.length ? <div className="app-list">{data.progress.slice(0, 6).map((entry) => <div key={entry.id}>
          <span className="app-list__main"><strong>{entry.weight} ק״ג</strong><span>{entry.date}</span></span>
          <span className="app-list__meta"><strong>{entry.navel_circumference ?? "—"}</strong>היקף טבור</span>
        </div>)}</div> : <Empty text="אין מדידות שמורות."/>}
      </Section>

      <Section title="סטטוס הזמנה" summary={invitationStatus}>
        <dl className="compact-data-list">
          <div><span>נשלחה לאחרונה</span><strong>{latestInvitation ? date(latestInvitation.sent_at) : "טרם נשלחה"}</strong></div>
          <div><span>בתוקף עד</span><strong>{latestInvitation && !invitationExpired ? date(latestInvitation.expires_at) : "לא בתוקף"}</strong></div>
          <div><span>נפתחה</span><strong>{latestInvitation?.opened_at ? date(latestInvitation.opened_at) : "טרם נפתחה"}</strong></div>
          <div><span>Onboarding</span><strong>{intake?.onboarding_completed_at ? date(intake.onboarding_completed_at) : "ממתין"}</strong></div>
          <div><span>סה״כ הזמנות שנשלחו</span><strong>{invitations?.length ?? 0}</strong></div>
        </dl>
        {accountActivated&&!intake?.onboarding_completed&&<p className="mt-3 text-sm text-[#5B5F5B]">החשבון כבר אומת. נשלח ללקוח קישור כניסה מאובטח להמשך הקליטה, במקום הזמנה נוספת.</p>}
      </Section>

      <Section title="נתוני קליטה" summary={intake?.onboarding_completed ? `הקליטה הושלמה ב-${date(intake.onboarding_completed_at ?? null)}` : "ממתין להשלמת קליטה מצד הלקוח"}>
        {intake ? <dl className="compact-data-list">
          <div><span>רמת פעילות</span><strong>{intake.activity_level ?? "לא הוגדר"}</strong></div>
          <div><span>יעד משקל</span><strong>{intake.target_weight ? `${intake.target_weight} ק״ג` : "לא הוגדר"}</strong></div>
          {preferences.map(([key,item])=><div key={key}><span>{key.replaceAll("_"," ")}</span><strong>{Array.isArray(item) ? item.join(", ") : String(item)}</strong></div>)}
        </dl> : <Empty text="אין נתוני קליטה זמינים."/>}
      </Section>

      {/* Account actions, including the destructive one, live behind a heading
          rather than beside the client's name. */}
      <Section title="פעולות חשבון" summary="כניסה, הזמנה ומכשיר">
        <div className="grid gap-2 sm:grid-cols-2">
          {intake?.onboarding_completed ? <>
            <form action={sendClientMagicLink}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="שליחת Magic Link" pending="שולחים…" className="premium-secondary-button w-full"/></form>
            <form action={sendClientPasswordReset}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="איפוס סיסמה" pending="שולחים…" className="premium-secondary-button w-full"/></form>
          </> : accountActivated
            ? <form action={sendClientMagicLink}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="שלח קישור כניסה להשלמת הקליטה" pending="שולחים…" className="premium-secondary-button w-full"/></form>
            : <form action={resendClientInvite}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="שלח הזמנה מחדש" pending="שולחים…" className="premium-secondary-button w-full"/></form>}
          <form action={resetClientDevice} className="sm:col-span-2"><input type="hidden" name="clientId" value={id}/><SubmitButton idle="איפוס מכשיר" pending="מאפסים…" className="premium-secondary-button w-full border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]"/></form>
        </div>
      </Section>
    </div>

    <div className="mt-5 grid gap-3">
      <EnableFreeMenu clientId={id}/>
      <ClientDetailExtras clientId={id} content={(contentRows??[]).map((item)=>({...item,assigned:(contentAssignments??[]).some((assignment)=>assignment.content_item_id===item.id)}))} notifications={clientNotifications??[]} notes={coachNotes??[]}/>
    </div>
  </main>;
}

function Section({ title, summary, open = false, children }: { title: string; summary: string; open?: boolean; children: React.ReactNode }) {
  return <details className="collapse" open={open}>
    <summary>
      <span className="min-w-0">
        <strong className="block">{title}</strong>
        <span className="block truncate text-xs font-normal text-[#5B5F5B]">{summary}</span>
      </span>
    </summary>
    <div className="collapse__body">{children}</div>
  </details>;
}

function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-[#E5E7E5] p-5 text-center text-sm text-[#5B5F5B]">{text}</p>; }
