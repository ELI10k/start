/* eslint-disable @next/next/no-img-element -- profile URLs are coach-provided and may use arbitrary approved storage hosts. */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import SubmitButton from "@/components/forms/SubmitButton";
import ReviewCheckInForm from "@/components/coach/ReviewCheckInForm";
import { MetricTile } from "@/components/client/PremiumUI";
import { resetClientDevice } from "@/app/actions/product";
import { getAuthContext, getCoachClientDashboard } from "@/lib/data/product-repository";
import { bodyMassIndex, calculateEnergy, GOAL_LABELS, isNutritionGoal, MISSING_LABELS, type NutritionGoal, type Sex } from "@/lib/nutrition/energy";
import { calculateMacroTargetResult } from "@/lib/nutrition/macro-targets";
import { isTraineeLevel, TRAINEE_LEVEL_LABELS } from "@/lib/workouts/trainee-level";
import EnableFreeMenu from "@/components/coach/EnableFreeMenu";
import { resendClientInvite, sendClientMagicLink, sendClientPasswordReset } from "@/app/actions/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatIsraelDateTime } from "@/lib/date-time";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClientDetailExtras, { NotesPanel } from "@/components/coach/ClientDetailExtras";
import ClientIntakeForm from "@/components/coach/ClientIntakeForm";
import ClientTabs from "@/components/coach/client-file/ClientTabs";
import { ArchiveClientPanel } from "@/components/coach/client-file/ArchiveClient";
import ClientReportView from "@/components/coach/client-file/ClientReport";
import { buildClientReport } from "@/lib/coach-intelligence/client-report";
import { CLIENT_TABS, isClientTab } from "@/lib/coach/client-tabs";
import WeeklySummaryPanel from "@/components/coach/WeeklySummaryPanel";
import { getWeeklySummaries } from "@/lib/coach-intelligence/summary-repository";

const date = (value: string | null) => value ? formatIsraelDateTime(value) : "אין נתון";
const number = (value: number) => Math.round(value).toLocaleString("he-IL");

export default async function CoachClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; invite?: string; login?: string; tab?: string }> }) {
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
  const weeklySummaries = await getWeeklySummaries(id);
  const tab = isClientTab(query.tab) ? query.tab : "overview";
  // The two most recent weigh-ins, so the card can say which way the client is
  // going rather than only where they are. One measurement is a number, not a
  // direction, and is reported as such.
  const [latestWeighIn, previousWeighIn] = data.progress;
  const weightChange = latestWeighIn && previousWeighIn
    ? Number(latestWeighIn.weight) - Number(previousWeighIn.weight)
    : null;
  // Whether the account is verified is one line on one card. Reaching for the
  // admin key to read it should not be able to take the whole client file down -
  // it does exactly that on any deployment without the service role key, which
  // includes the E2E dev server. Unknown is a fine answer here.
  // The factory throws synchronously when the key is absent, so the guard has to
  // wrap the call itself and not just the promise.
  const authUser=await (async () => {
    try {
      const { data } = await createSupabaseAdminClient().auth.admin.getUserById(id);
      return data.user;
    } catch {
      return null;
    }
  })();
  const accountActivated=Boolean(authUser?.email_confirmed_at);
  const latestInvitation=invitations?.[0] ?? null;
  const invitationExpired=latestInvitation?.effective_status==="expired";
  const invitationStatus=intake?.onboarding_completed ? "לקוח פעיל" : !latestInvitation ? "טרם נשלחה הזמנה" : invitationExpired ? "ההזמנה פגה" : latestInvitation.effective_status==="opened" ? "ההזמנה נפתחה" : "הזמנה נשלחה";
  const preferences=intake?.preferences && typeof intake.preferences==="object" && !Array.isArray(intake.preferences) ? Object.entries(intake.preferences).filter(([, item]) => item !== null && item !== "") : [];
  // The session count is one of the calorie inputs but lives inside the
  // preferences blob rather than in a column, which is where the repository
  // reads it from too.
  const weeklyWorkoutsRaw=Number((intake?.preferences as Record<string,unknown> | null)?.weekly_workouts);
  const weeklyWorkouts=Number.isFinite(weeklyWorkoutsRaw) && weeklyWorkoutsRaw>0 ? weeklyWorkoutsRaw : null;
  // The same engine the builder and the create form use. Read here, never
  // recomputed - a second copy of the formula is how two screens start
  // disagreeing about one client's target.
  const energy=calculateEnergy({
    ageYears: intake?.age_years ?? undefined,
    weightKg: latestWeighIn?.weight ? Number(latestWeighIn.weight) : undefined,
    heightCm: intake?.height ? Number(intake.height) : undefined,
    sex: (intake?.sex as Sex | null) ?? undefined,
    weeklyWorkouts: weeklyWorkouts ?? undefined,
    dailySteps: intake?.daily_steps ?? undefined,
    goal: (intake?.nutrition_goal as NutritionGoal | null) ?? undefined,
  });
  const macros=energy.ok && latestWeighIn?.weight
    ? calculateMacroTargetResult(Number(latestWeighIn.weight), energy.calorieTarget)
    : null;
  // Assembled from the client's own records. Every figure below is one the
  // database holds; nothing is generated here.
  const report=buildClientReport({
    weighIns: data.progress.map((entry) => ({ date: entry.date, weight: Number(entry.weight), navel: entry.navel_circumference === null ? null : Number(entry.navel_circumference) })),
    checkIns: data.checkIns.map((entry) => ({
      submittedAt: entry.submitted_at, adherence: entry.adherence ?? null, energy: entry.energy ?? null,
      sleep: entry.sleep ?? null, hunger: entry.hunger ?? null,
      workoutsCompleted: entry.workouts_completed ?? null, mealPlanDays: entry.meal_plan_days ?? null,
      notes: entry.notes ?? null,
    })),
    hasMenu: Boolean(data.menu),
    menuCompletionPercent: data.nutrition.completionPercent,
    menuPlannedItems: data.nutrition.plannedItems,
    hasProgram: Boolean(data.workouts.program),
    programName: data.workouts.program?.name ?? null,
    weeklyFrequency: data.workouts.assignment?.weekly_frequency ?? null,
    weeklyCompletionPercent: data.workouts.weeklyCompletionPercent,
    lastWorkoutAt: data.workouts.lastCompletedAt,
    goalLabel: isNutritionGoal(intake?.nutrition_goal) ? GOAL_LABELS[intake.nutrition_goal] : null,
    calorieTarget: energy.ok ? energy.calorieTarget : null,
  });

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

    {/* Seven sections, one at a time. The card used to be a single scroll of
        nine panels and the thing you came for was never the thing at the top. */}
    <ClientTabs clientId={id} active={tab}/>

    {tab === "overview" && <div className="mt-5 grid gap-4">
      <section className="premium-card">
        <h2 className="font-black">מצב הלקוח</h2>
        <dl className="compact-data-list mt-3">
          <div><span>סטטוס</span><strong>{invitationStatus}</strong></div>
          <div><span>מטרה</span><strong>{isNutritionGoal(intake?.nutrition_goal) ? GOAL_LABELS[intake.nutrition_goal] : intake?.goal ?? "לא הוגדרה"}</strong></div>
          <div><span>טלפון</span><strong>{data.profile.phone ?? "לא הוזן"}</strong></div>
          <div><span>כניסה אחרונה</span><strong>{data.lastLoginAt ? date(data.lastLoginAt) : "טרם נכנס"}</strong></div>
          <div><span>משקל אחרון</span><strong>{latestWeighIn ? `${latestWeighIn.weight} ק״ג` : "אין מדידה"}</strong></div>
          {/* One measurement is a number, not a direction. */}
          <div><span>שינוי מהמדידה הקודמת</span><strong>{weightChange === null ? (latestWeighIn ? "יש מדידה אחת בלבד" : "אין מדידות") : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} ק״ג`}</strong></div>
          <div><span>צ׳ק־אין אחרון</span><strong>{lastCheckIn ? date(lastCheckIn.submitted_at) : "טרם הוגש"}</strong></div>
          <div><span>תפריט פעיל</span><strong>{data.menu?.title ?? "אין תפריט פעיל"}</strong></div>
          <div><span>תוכנית אימונים</span><strong>{data.workouts.program?.name ?? "לא שויכה תוכנית"}</strong></div>
          <div><span>אימונים שהושלמו לאחרונה</span><strong>{data.workouts.lastCompletedAt ? `אחרון ב-${date(data.workouts.lastCompletedAt)}` : "אין אימון שהושלם"}</strong></div>
        </dl>
      </section>

      <section className="premium-card">
        <h2 className="font-black">פעולות מהירות</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link href={`/coach/clients/${id}?tab=intake`} className="premium-secondary-button">עריכת נתוני קליטה</Link>
          <Link href={data.menu ? `/coach/menus/${data.menu.id}` : "/coach/menus/new"} className="premium-secondary-button">{data.menu ? "פתיחת התפריט" : "יצירת תפריט"}</Link>
          <Link href={data.workouts.program ? `/coach/workouts/${data.workouts.program.id}` : "/coach/workouts"} className="premium-secondary-button">{data.workouts.program ? "פתיחת תוכנית האימונים" : "שיוך תוכנית אימונים"}</Link>
          <Link href={`/coach/clients/${id}?tab=notes`} className="premium-secondary-button">הוספת הערת מאמן</Link>
          <Link href={`/coach/clients/${id}?tab=report`} className="premium-secondary-button sm:col-span-2">פתיחת דוח שיפור</Link>
        </div>
      </section>
    </div>}

    <div className="mt-5">
      {/* Every tab but the overview lives in here, and a coach has been seeing
          this whole block come back empty while the overview above it renders.
          The heading is unconditional: if it is on screen and the sections under
          it are not, the sections are the problem; if the heading is missing too,
          nothing in here reached the browser at all. It also earns its place -
          a tab strip plus a bare card left the screen without a title. */}
      <h2 className="section-heading section-heading--compact">{CLIENT_TABS.find((entry) => entry.id === tab)?.label ?? "תיק הלקוח"}</h2>

      {tab === "nutrition" && <>
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

        {/* The target itself, from the same engine the builder uses. Adherence
            is shown only where a menu exists to adhere to. */}
        <div className="mt-4 border-t border-[#E5E7E5] pt-4">
          <h3 className="text-sm font-black text-[#3F433F]">יעד קלורי ומאקרו</h3>
          {energy.ok ? <dl className="compact-data-list mt-2">
            <div><span>BMR</span><strong>{energy.bmr} קל׳</strong></div>
            <div><span>מקדם פעילות</span><strong>×{energy.activityFactor}</strong></div>
            <div><span>הוצאה יומית</span><strong>{energy.tdee} קל׳</strong></div>
            <div><span>יעד קלורי</span><strong>{energy.calorieTarget} קל׳</strong></div>
            {macros?.ok && <><div><span>חלבון</span><strong>{macros.targets.protein} ג׳</strong></div>
            <div><span>שומן</span><strong>{macros.targets.fat} ג׳</strong></div>
            <div><span>פחמימות</span><strong>{macros.targets.carbohydrates} ג׳</strong></div></>}
          </dl> : <p className="mt-2 text-sm text-[#5B5F5B]">לא ניתן לחשב יעד. חסר בכרטיס הלקוח: {energy.missing.map((field) => MISSING_LABELS[field]).join(", ")}.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={data.menu ? `/coach/menus/${data.menu.id}` : "/coach/menus/new"} className="chip">{data.menu ? "פתיחת התפריט" : "יצירת תפריט"}</Link>
            <Link href={`/coach/clients/${id}?tab=intake`} className="chip">עריכת נתוני קליטה</Link>
          </div>
          <p className="mt-2 text-xs text-[#5B5F5B]">„חשב מחדש” והעריכה הידנית של המאקרו נמצאים בבונה התפריט, שם הם נשמרים.</p>
        </div>

        <div className="mt-4 border-t border-[#E5E7E5] pt-4">
          <h3 className="text-sm font-black text-[#3F433F]">משקל ומגמה</h3>
          {data.progress.length >= 2
            ? <p className="mt-2 text-sm text-[#5B5F5B]">{data.progress.length} מדידות · אחרונה {latestWeighIn?.weight} ק״ג · שינוי מהקודמת {weightChange !== null && weightChange > 0 ? "+" : ""}{weightChange?.toFixed(1)} ק״ג</p>
            : <p className="mt-2 text-sm text-[#5B5F5B]">{data.progress.length === 1 ? "יש מדידה אחת בלבד, ולכן אין עדיין מגמה." : "אין מדידות משקל."}</p>}
        </div>
      </Section>
      </>}

      {tab === "workouts" && <>
      {/* One card per running programme. A client can hold more than one active
          assignment, and a tab that named only the newest hid the rest. */}
      <Section title="אימונים" summary={data.workouts.activePrograms.length ? data.workouts.activePrograms.map((entry) => entry.program?.name ?? "תוכנית").join(" · ") : "אין תוכנית פעילה"} open>
        {data.workouts.activePrograms.length ? <div className="grid gap-4">
          {data.workouts.activePrograms.map((entry) => <article key={entry.assignment.id} className="rounded-2xl border border-[#E5E7E5] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-black">{entry.program?.name ?? "התוכנית אינה זמינה לצפייה"}</h3>
              <span className="pill pill--green">פעילה</span>
            </div>
            <dl className="compact-data-list mt-3">
              <div><span>השלמת השבוע</span><strong>{entry.weeklyCompletionPercent}%</strong></div>
              <div><span>אימון הבא</span><strong>{entry.nextDayName ?? "לא הוגדר"}</strong></div>
              <div><span>תדירות</span><strong>{entry.assignment.weekly_frequency} בשבוע</strong></div>
              <div><span>התחלה</span><strong>{entry.assignment.start_date}</strong></div>
              <div><span>ימי אימון</span><strong>{entry.days.length}</strong></div>
            </dl>
            {entry.assignment.coach_note && <p className="mt-3 text-sm text-[#5B5F5B]">{entry.assignment.coach_note}</p>}
            {entry.program && <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/coach/workouts/${entry.program.id}`} className="chip">פתיחת התוכנית</Link>
              <Link href={`/coach/workouts/${entry.program.id}#program-editor`} className="chip">עריכת התוכנית</Link>
              {entry.days.map((day) => <Link key={day.id} href={`/coach/workouts/${entry.program!.id}/days/${day.id}`} className="chip">{day.name}</Link>)}
            </div>}
          </article>)}
        </div> : <Empty text="ללקוח עדיין לא שויכה תוכנית אימונים."/>}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E5E7E5] pt-4">
          <Link href="/coach/workouts" className="chip">{data.workouts.activePrograms.length ? "שיוך תוכנית נוספת או החלפה" : "שיוך תוכנית"}</Link>
          <Link href={`/coach/clients/${id}/workouts`} className="chip">אימונים שהושלמו ונפח</Link>
          <Link href={`/coach/clients/${id}?tab=notes`} className="chip">הוספת הערה</Link>
        </div>
        <p className="mt-2 text-xs text-[#5B5F5B]">אימון אחרון: {date(data.workouts.lastCompletedAt)}. משקלים, חזרות ונפח לאורך זמן נמצאים במסך האימונים של הלקוח.</p>
      </Section>
      </>}

      {tab === "progress" && <>
      <Section title="צ׳ק־אין" summary="עדכון אחרון, הערות ותגובה" open>
        <div className="grid gap-3">{data.checkIns.slice(0, 4).map((entry) => <article key={entry.id} className="rounded-2xl border border-[#E5E7E5] p-4">
          <p className="text-sm text-[#5B5F5B]">{date(entry.submitted_at)} · היצמדות {entry.adherence}/5 · אנרגיה {entry.energy}/5 · שינה {entry.sleep}/5</p>
          {entry.notes && <p className="mt-2 text-sm">{entry.notes}</p>}
          {entry.coach_response ? <p className="mt-3 border-r-2 border-[#16A34A] pr-3 text-sm text-[#15803D]">{entry.coach_response}</p> : <ReviewCheckInForm checkInId={entry.id} clientId={id}/>}
          <p className="mt-3 text-xs text-[#5B5F5B]">תמונות: אין תמונות זמינות בצ׳ק־אין זה.</p>
        </article>)}</div>
        {!data.checkIns.length && <Empty text="אין צ׳ק־אין שמור."/>}
      </Section>

      <Section title="התקדמות" summary="משקל והיקף טבור" open>
        {data.progress.length ? <>
          <div className="app-list">{data.progress.slice(0, 8).map((entry) => <div key={entry.id}>
            <span className="app-list__main"><strong>{entry.weight} ק״ג</strong><span>{entry.date}</span></span>
            <span className="app-list__meta"><strong>{entry.navel_circumference ?? "—"}</strong>היקף טבור</span>
          </div>)}</div>
          {/* Two points is the minimum that can describe a direction. Below that
              the screen says so rather than drawing a line through one dot. */}
          <p className="mt-3 text-sm text-[#5B5F5B]">{data.progress.length >= 2
            ? `${data.progress.length} מדידות · שינוי מהמדידה הקודמת ${weightChange !== null && weightChange > 0 ? "+" : ""}${weightChange?.toFixed(1)} ק״ג`
            : "יש מדידה אחת בלבד, ולכן עדיין אין מגמה להציג."}</p>
        </> : <Empty text="אין מדידות שמורות."/>}
        <p className="mt-3 text-xs text-[#5B5F5B]">תמונות התקדמות נשמרות באחסון פרטי ונפתחות ממסך ההתקדמות של הלקוח, לפי ההרשאות.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/coach/clients/${id}/progress`} className="chip">מסך ההתקדמות המלא</Link>
          <Link href={`/coach/clients/${id}/check-ins`} className="chip">כל הצ׳ק־אינים</Link>
        </div>
      </Section>
      </>}

      {tab === "report" && <div className="grid gap-4">
        <ClientReportView report={report}/>
        {/* The weekly summary the AI coach writes, under its own heading, so a
            coach can always tell the counted lines from the written ones. */}
        <WeeklySummaryPanel summaries={weeklySummaries}/>
        <p className="text-xs text-[#5B5F5B]">הדוח אינו נשלח ללקוח אוטומטית. עריכה ושמירת גרסה מאושרת דורשות עמודות שעדיין אינן קיימות — ראו את המיגרציה המוכנה ב־<code>202608120002</code>.</p>
      </div>}

      {/* Only the notes. Content assignment and push notifications are coach
          tools too, but they are not notes, and a tab named for one thing should
          not carry three. */}
      {tab === "notes" && <NotesPanel clientId={id} notes={coachNotes??[]} open/>}

      {tab === "overview" && <>
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
      </>}

      {tab === "intake" && <>
      <Section title="נתוני קליטה" summary={intake?.onboarding_completed ? `הקליטה הושלמה ב-${date(intake.onboarding_completed_at ?? null)}` : "ממתין להשלמת קליטה מצד הלקוח"} open>
        {intake ? <dl className="compact-data-list">
          {/* The inputs the calorie target is computed from, so a coach can see
              at a glance which one is missing when the builder says it cannot
              compute. BMI is here as a reading and nothing more. */}
          <div><span>גיל</span><strong>{intake.age_years ?? "לא הוגדר"}</strong></div>
          <div><span>מין</span><strong>{intake.sex === "male" ? "זכר" : intake.sex === "female" ? "נקבה" : "לא הוגדר"}</strong></div>
          <div><span>גובה</span><strong>{intake.height ? `${intake.height} ס״מ` : "לא הוגדר"}</strong></div>
          <div><span>ממוצע צעדים יומי</span><strong>{intake.daily_steps ?? "לא הוגדר"}</strong></div>
          <div><span>מטרה</span><strong>{isNutritionGoal(intake.nutrition_goal) ? GOAL_LABELS[intake.nutrition_goal] : "לא הוגדרה"}</strong></div>
          <div><span>רמת מתאמן</span><strong>{isTraineeLevel(intake.trainee_level) ? TRAINEE_LEVEL_LABELS[intake.trainee_level] : "לא הוגדרה"}</strong></div>
          <div><span>יעד משקל</span><strong>{intake.target_weight ? `${intake.target_weight} ק״ג` : "לא הוגדר"}</strong></div>
          <div><span>BMI (תצוגה בלבד)</span><strong>{bodyMassIndex(data.progress[0]?.weight ? Number(data.progress[0].weight) : undefined, intake.height ? Number(intake.height) : undefined) ?? "—"}</strong></div>
          {preferences.map(([key,item])=><div key={key}><span>{key.replaceAll("_"," ")}</span><strong>{Array.isArray(item) ? item.join(", ") : String(item)}</strong></div>)}
        </dl> : <Empty text="אין נתוני קליטה זמינים."/>}

        {/* The intake form runs once, at creation. Without this a client created
            before the calorie columns existed could never be given an age or a
            goal, and the builder would go on naming what is missing forever. */}
        <div className="mt-4 border-t border-[#E5E7E5] pt-4">
          <h3 className="text-sm font-black text-[#3F433F]">עדכון נתוני החישוב</h3>
          <p className="mb-3 mt-1 text-xs text-[#5B5F5B]">מהם מחושבים BMR, ההוצאה היומית ויעד הקלוריות. שדה שנשאר ריק נשמר כלא מוגדר — המערכת לא מנחשת.</p>
          <ClientIntakeForm clientId={id} values={{
            ageYears: intake?.age_years ?? null,
            sex: intake?.sex ?? null,
            height: intake?.height ? Number(intake.height) : null,
            dailySteps: intake?.daily_steps ?? null,
            weeklyWorkouts: weeklyWorkouts,
            nutritionGoal: intake?.nutrition_goal ?? null,
            traineeLevel: intake?.trainee_level ?? null,
            latestWeight: data.progress[0]?.weight ? Number(data.progress[0].weight) : null,
          }}/>
        </div>
      </Section>
      </>}

      {/* Account actions, including the destructive one, live behind a heading
          rather than beside the client's name. */}
      {/* Content assignment and notifications live with the account tools on the
          overview, which is where a coach reaches for them. */}
      {tab === "overview" && <ClientDetailExtras clientId={id} content={(contentRows??[]).map((item)=>({...item,assigned:(contentAssignments??[]).some((assignment)=>assignment.content_item_id===item.id)}))} notifications={clientNotifications??[]} notes={coachNotes??[]}/>}

      {tab === "overview" && <Section title="פעולות חשבון" summary="כניסה, הזמנה ומכשיר">
        <div className="grid gap-2 sm:grid-cols-2">
          {intake?.onboarding_completed ? <>
            <form action={sendClientMagicLink}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="שליחת Magic Link" pending="שולחים…" className="premium-secondary-button w-full"/></form>
            <form action={sendClientPasswordReset}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="איפוס סיסמה" pending="שולחים…" className="premium-secondary-button w-full"/></form>
          </> : accountActivated
            ? <form action={sendClientMagicLink}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="שלח קישור כניסה להשלמת הקליטה" pending="שולחים…" className="premium-secondary-button w-full"/></form>
            : <form action={resendClientInvite}><input type="hidden" name="clientId" value={id}/><SubmitButton idle="שלח הזמנה מחדש" pending="שולחים…" className="premium-secondary-button w-full"/></form>}
          <form action={resetClientDevice} className="sm:col-span-2"><input type="hidden" name="clientId" value={id}/><SubmitButton idle="איפוס מכשיר" pending="מאפסים…" className="premium-secondary-button w-full border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]"/></form>
        </div>
      </Section>}
    </div>

    {tab === "nutrition" && <div className="mt-5"><EnableFreeMenu clientId={id}/></div>}

    {tab === "overview" && <ArchiveClientPanel clientId={id} clientName={data.profile.full_name}/>}
  </main>;
}

function Section({ title, summary, open = false, children }: { title: string; summary: string; open?: boolean; children: React.ReactNode }) {
  return <details className="disclosure" open={open}>
    <summary>
      <span className="min-w-0">
        <strong className="block">{title}</strong>
        <span className="block truncate text-xs font-normal text-[#5B5F5B]">{summary}</span>
      </span>
    </summary>
    <div className="disclosure__body">{children}</div>
  </details>;
}

function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-[#E5E7E5] p-5 text-center text-sm text-[#5B5F5B]">{text}</p>; }
