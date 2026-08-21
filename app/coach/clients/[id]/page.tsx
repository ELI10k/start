/* eslint-disable @next/next/no-img-element -- profile URLs are coach-provided and may use arbitrary approved storage hosts. */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import SubmitButton from "@/components/forms/SubmitButton";
import ReviewCheckInForm from "@/components/coach/ReviewCheckInForm";
import { listResponseTemplates } from "@/app/actions/response-templates";
import { MetricTile } from "@/components/client/PremiumUI";
import { resetClientDevice } from "@/app/actions/product";
import { getAuthContext, getCoachClientDashboard } from "@/lib/data/product-repository";
import { bodyMassIndex, calculateEnergy, GOAL_LABELS, isNutritionGoal, MISSING_LABELS, type NutritionGoal, type Sex } from "@/lib/nutrition/energy";
import { calculateMacroTargetResult } from "@/lib/nutrition/macro-targets";
import { isTraineeLevel, TRAINEE_LEVEL_LABELS } from "@/lib/workouts/trainee-level";
import EnableFreeMenu from "@/components/coach/EnableFreeMenu";
import { resendClientInvite, sendClientMagicLink, sendClientPasswordReset } from "@/app/actions/onboarding";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { daysSince, formatIsraelDateTime, israelDateKey, israelHour, israelWeekday } from "@/lib/date-time";
import { listClientFoodLog } from "@/lib/data/product-repository";
import LoggedFoodList from "@/components/client/LoggedFoodList";
import { sumLoggedFood } from "@/lib/nutrition/food-log";
import { reportedPortions } from "@/lib/nutrition/menu-intake";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClientDetailExtras, { NotesPanel } from "@/components/coach/ClientDetailExtras";
import ClientIntakeForm from "@/components/coach/ClientIntakeForm";
import ClientTabs from "@/components/coach/client-file/ClientTabs";
import CheckInPhotoGallery from "@/components/client/CheckInPhotoGallery";
import { CHECK_IN_PHOTO_BUCKET, CHECK_IN_PHOTO_URL_TTL_SECONDS } from "@/lib/check-ins/photo-storage";
import { ArchiveClientPanel } from "@/components/coach/client-file/ArchiveClient";
import ClientReportView from "@/components/coach/client-file/ClientReport";
import { buildClientReport } from "@/lib/coach-intelligence/client-report";
import { CLIENT_TABS, isClientTab } from "@/lib/coach/client-tabs";
import MessageThread from "@/components/messages/MessageThread";
import { listThread, markThreadRead } from "@/lib/messages/repository";
import WeeklySummaryPanel from "@/components/coach/WeeklySummaryPanel";
import { getWeeklySummaries } from "@/lib/coach-intelligence/summary-repository";

const date = (value: string | null) => value ? formatIsraelDateTime(value) : "אין נתון";
const number = (value: number) => Math.round(value).toLocaleString("he-IL");

export default async function CoachClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; invite?: string; login?: string; tab?: string }> }) {
  const auth = await getAuthContext(); if (!auth) redirect("/login"); if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params; const query=await searchParams; const data = await getCoachClientDashboard(auth.id, id); if (!data) notFound();
  const lastCheckIn = data.checkIns[0] ?? null;
  const latestNavelMeasurement=data.progress.find((entry)=>entry.navel_circumference!==null);
  // "Requires attention" has to be able to be empty, or it is furniture.
  //
  // The three rules it used to run were "no check-in yet", "the training week is
  // not finished" and "not every meal is marked" - and the last two are true of
  // every client on a Monday morning, so the red panel was on every file, every
  // day, and stopped being read. Each rule now describes something that is
  // actually late rather than merely unfinished: a check-in that has not come in
  // for over a week, a week that is nearly over with most of the training still
  // to do, and a day whose meals are going unanswered past the evening.
  const daysSinceCheckIn = lastCheckIn ? daysSince(lastCheckIn.submitted_at) : null;
  // Sunday is 0, so 5 is Friday: by then the training week is what it is going
  // to be. 20:00 is past dinner, so a day still unanswered then will stay so.
  const weekday = israelWeekday(israelDateKey());
  const hour = israelHour();
  const alertRows = [
    daysSinceCheckIn === null ? "טרם הוגש צ׳ק־אין" : daysSinceCheckIn > 8 ? `לא הוגש צ׳ק־אין ${daysSinceCheckIn} ימים` : null,
    data.workouts.assignment && weekday >= 5 && data.workouts.weeklyCompletionPercent < 50 ? "רוב אימוני השבוע לא בוצעו, והשבוע נגמר" : null,
    data.menu && hour >= 20 && data.nutrition.completionPercent < 50 ? "רוב ארוחות היום נותרו ללא סימון" : null,
  ].filter(Boolean);
  const intake=data.profile.clientProfile;
  const supabase=await createSupabaseServerClient();
  // The file is eight tabs and shows one at a time, but it used to load all
  // eight - including signing a URL for every photo of every check-in while the
  // overview tab, which shows no photos at all, was the one on screen. Each
  // query now belongs to the tab that renders it.
  const tab = isClientTab(query.tab) ? query.tab : "overview";
  const none = <T,>() => Promise.resolve({ data: [] as T[] });
  const [{ data: invitations }, { data: contentRows }, { data: contentAssignments }, { data: clientNotifications }, { data: coachNotes }]=await Promise.all([
    // The pill under the client's name needs the newest invitation on every tab.
    // The full history - and the "how many were sent" count - is only rendered
    // on the overview, so only the overview pays for it.
    tab==="overview"
      ?supabase.from("client_invitation_statuses").select("id,status,effective_status,sent_at,expires_at,opened_at,onboarding_completed_at").eq("client_id",id).order("sent_at",{ascending:false})
      :supabase.from("client_invitation_statuses").select("id,status,effective_status,sent_at,expires_at,opened_at,onboarding_completed_at").eq("client_id",id).order("sent_at",{ascending:false}).limit(1),
    tab==="notes"?supabase.from("content_items").select("id,title").eq("status","published").order("sort_order"):none<{id:string;title:string}>(),
    tab==="notes"?supabase.from("client_content_assignments").select("content_item_id").eq("client_id",id):none<{content_item_id:string}>(),
    // Read on the progress tab, where each coach response is shown alongside
    // whether the client has opened it, and on notes, which lists them.
    tab==="progress"||tab==="notes"?supabase.from("notifications").select("id,type,source_id,title,body,href,created_at,read_at").eq("recipient_id",id).order("created_at",{ascending:false}).limit(50):none<{id:string;type:string;source_id:string|null;title:string;body:string;href:string;created_at:string;read_at:string|null}>(),
    tab==="notes"?supabase.from("coach_client_notes").select("id,body,created_at,updated_at").eq("client_id",id).eq("coach_id",auth.id).order("created_at",{ascending:false}):none<{id:string;body:string;created_at:string;updated_at:string}>(),
  ]);
  // The check-in photos, signed for this request. The client file has always
  // said "אין תמונות זמינות בצ׳ק־אין זה" - a fixed line, printed under every
  // check-in whether or not photos were attached, because nothing here ever
  // looked for them. A coach who asks a client for three photos has to be able
  // to see the three photos.
  // Signing a URL is a network round trip per photo. Only the tab that shows
  // them needs them.
  const checkInIds = tab === "progress" ? data.checkIns.map((entry) => entry.id) : [];
  const photoRows = checkInIds.length
    ? (await supabase.from("check_in_photos").select("id,check_in_id,view,storage_path").in("check_in_id", checkInIds).order("created_at")).data ?? []
    : [];
  const signedPhotos = photoRows.length
    ? await supabase.storage.from(CHECK_IN_PHOTO_BUCKET).createSignedUrls(photoRows.map((photo) => photo.storage_path), CHECK_IN_PHOTO_URL_TTL_SECONDS)
    : { data: [], error: null };
  const photosByCheckIn: Record<string, { id: string; view: string; signedUrl: string }[]> = {};
  if (!signedPhotos.error)
    photoRows.forEach((photo, index) => {
      const signedUrl = signedPhotos.data?.[index]?.signedUrl;
      if (!signedUrl) return;
      (photosByCheckIn[photo.check_in_id] ??= []).push({ id: photo.id, view: photo.view, signedUrl });
    });

  // Whether the client has actually opened what the coach sent. The review
  // notification carries the check-in's id, and notifications already record
  // when they were read - the client file simply never looked. A coach who
  // writes feedback and hears nothing should be able to tell "not read yet"
  // from "read and ignored".
  const responseReadAt = new Map(
    (clientNotifications ?? [])
      .filter((row) => row.type === "check_in_reviewed" && row.source_id)
      .map((row) => [String(row.source_id), row.read_at as string | null]),
  );

  // Both of these belong to one tab each - the summaries to "report", the saved
  // replies to "progress", where the response form is - and both ran on every
  // load regardless. The rest of this screen was made tab-aware above; these two
  // were missed.
  // What the client says they actually ate today, in their own words and their
  // own photographs. Read on the tab that shows it and nowhere else.
  const loggedFood = tab === "nutrition" ? await listClientFoodLog(id, israelDateKey()) : [];
  const loggedTotals = sumLoggedFood(loggedFood);
  const [weeklySummaries, responseTemplates] = await Promise.all([
    tab === "report" ? getWeeklySummaries(id) : Promise.resolve([]),
    tab === "progress" ? listResponseTemplates() : Promise.resolve([]),
  ]);
  // Only when the tab is open: loading a conversation to render a tab nobody
  // clicked is the same waste as signing every photo for the overview.
  const messages = tab === "messages" ? await listThread(id) : [];
  if (messages.some((message) => !message.fromMe && !message.readAt)) await markThreadRead(id);
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
  //
  // Read on the overview and nowhere else: it is a round trip to the Admin API,
  // and "פעולות חשבון" - the only section that asks whether the account is
  // verified - lives on that tab. Every other tab was paying for it.
  const authUser=tab==="overview"?await (async () => {
    try {
      const { data } = await createSupabaseAdminClient().auth.admin.getUserById(id);
      return data.user;
    } catch {
      return null;
    }
  })():null;
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
  // Built on the tab that prints it. It reads no database of its own, but it
  // walks every weigh-in and every check-in the client has ever filed, on every
  // load of a screen that shows it one time in eight.
  const report=tab==="report"?buildClientReport({
    weighIns: data.progress.map((entry) => ({ date: entry.date, weight: Number(entry.weight), navel: entry.navel_circumference === null ? null : Number(entry.navel_circumference) })),
    checkIns: data.checkIns.map((entry) => ({
      submittedAt: entry.submitted_at, adherence: entry.adherence ?? null, energy: entry.energy ?? null,
      sleep: entry.sleep ?? null, hunger: entry.hunger ?? null,
      workoutsCompleted: entry.workouts_completed ?? null, mealPlanDays: entry.meal_plan_days ?? null,
      notes: entry.notes ?? null,
    })),
    hasMenu: Boolean(data.menu),
    menuCompletionPercent: data.nutrition.completionPercent,
    menuPlannedMeals: data.nutrition.plannedMeals,
    hasProgram: Boolean(data.workouts.program),
    programName: data.workouts.program?.name ?? null,
    weeklyFrequency: data.workouts.assignment?.weekly_frequency ?? null,
    weeklyCompletionPercent: data.workouts.weeklyCompletionPercent,
    lastWorkoutAt: data.workouts.lastCompletedAt,
    goalLabel: isNutritionGoal(intake?.nutrition_goal) ? GOAL_LABELS[intake.nutrition_goal] : null,
    calorieTarget: energy.ok ? energy.calorieTarget : null,
  }):null;

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
            <div><span>ארוחות שסומנו היום</span><strong>{data.nutrition.completionPercent}%</strong></div>
            <div><span>קלוריות</span><strong>{number(data.nutrition.totals.calories)}</strong></div>
            <div><span>חלבון</span><strong>{number(data.nutrition.totals.protein)} ג׳</strong></div>
            <div><span>פחמימות / שומן</span><strong>{number(data.nutrition.totals.carbs)} / {number(data.nutrition.totals.fat)} ג׳</strong></div>
          </dl>
          {/* Meals, not rows: a meal holds a primary and its alternatives, and
              only one of them is ever eaten. */}
          <p className="mt-3 text-sm text-[#5B5F5B]">{data.nutrition.markedMeals} מתוך {data.nutrition.plannedMeals} ארוחות נענו היום (נאכלה, לא נאכלה או נאכל משהו אחר).</p>
          {/* The figures above already read what the client reported eating. This
              says where that differs from what was written - which is the part
              that changes what a coach does next. A day eaten as prescribed
              produces nothing here, which is the common case. */}
          {(() => {
            const changed = reportedPortions(data.menu?.meals ?? []);
            if (!changed.length) return null;
            return (
              <div className="mt-4 border-t border-[#E5E7E5] pt-4">
                <h3 className="text-sm font-black text-[#3F433F]">כמויות ששונו מהמתוכנן</h3>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {changed.map((row) => (
                    <li key={`${row.mealTitle}-${row.name}`} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-[#F7F8F7] px-3 py-2">
                      <span className="min-w-0"><strong>{row.name}</strong><span className="mr-2 text-xs text-[#5B5F5B]">{row.mealTitle}</span></span>
                      <span className="text-[#5B5F5B]">
                        תוכנן {row.planned} {row.unit} · נאכל <strong className={row.reported < row.planned ? "text-[#B45309]" : "text-[#0B0B0B]"}>{row.reported}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          {/* Read-only here: this is the client's account of their own day. */}
          {loggedFood.length > 0 && (
            <div className="mt-4 border-t border-[#E5E7E5] pt-4">
              <h3 className="text-sm font-black text-[#3F433F]">מה נאכל במקום</h3>
              <p className="mt-1 text-xs text-[#5B5F5B]">
                {loggedTotals.measured ? `${loggedTotals.measured} פריטים סרוקים · ${Math.round(loggedTotals.calories)} קל׳` : "ללא ערכים מאושרים"}
                {loggedTotals.unmeasured ? ` · ${loggedTotals.unmeasured} תיאורים או תמונות ללא ערכים` : ""}
              </p>
              <LoggedFoodList entries={loggedFood} readOnly/>
            </div>
          )}
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
          {/* Out of ten. The scale moved to 1-10 in 202607280002 and this line
              was still dividing by five, so every rating here read as double. */}
          <p className="text-sm text-[#5B5F5B]">{date(entry.submitted_at)} · היצמדות {entry.adherence}/10 · אנרגיה {entry.energy}/10 · שינה {entry.sleep}/10</p>
          {entry.notes && <p className="mt-2 text-sm">{entry.notes}</p>}
          {entry.coach_response ? <div className="mt-3 border-r-2 border-[#16A34A] pr-3">
            <p className="text-sm text-[#15803D]">{entry.coach_response}</p>
            <p className="mt-1 text-xs text-[#5B5F5B]">
              {responseReadAt.get(entry.id) ? `הלקוח קרא · ${date(responseReadAt.get(entry.id)!)}` : "טרם נקרא על ידי הלקוח"}
            </p>
          </div> : <ReviewCheckInForm checkInId={entry.id} clientId={id} clientName={data.profile.full_name} templates={responseTemplates}/>}
          {photosByCheckIn[entry.id]?.length
            ? <div className="mt-3"><CheckInPhotoGallery photos={photosByCheckIn[entry.id]}/></div>
            : <p className="mt-3 text-xs text-[#5B5F5B]">{signedPhotos.error ? "לא ניתן לטעון את התמונות כרגע. רענון הדף ייצור קישורים חדשים." : "לא צורפו תמונות לצ׳ק־אין זה."}</p>}
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
        {report && <ClientReportView report={report}/>}
        {/* The weekly summary the AI coach writes, under its own heading, so a
            coach can always tell the counted lines from the written ones. */}
        <WeeklySummaryPanel summaries={weeklySummaries}/>
        <p className="text-xs text-[#5B5F5B]">הדוח אינו נשלח ללקוח אוטומטית. עריכה ושמירת גרסה מאושרת דורשות עמודות שעדיין אינן קיימות — ראו את המיגרציה המוכנה ב־<code>202608120002</code>.</p>
      </div>}

      {/* Only the notes. Content assignment and push notifications are coach
          tools too, but they are not notes, and a tab named for one thing should
          not carry three. */}
      {tab === "notes" && <NotesPanel clientId={id} notes={coachNotes??[]} open/>}

      {/* The direct channel. Notes above are private to the coach; this is the
          one place the two of them actually talk. */}
      {tab === "messages" && <section className="mt-5">
        <MessageThread
          messages={messages}
          clientId={id}
          emptyTitle={`עדיין לא התכתבתם עם ${data.profile.full_name.split(" ")[0]}`}
          emptyDescription="הודעה שתישלח כאן מגיעה ללקוח עם התראה, גם כשהאפליקציה סגורה."
          placeholder="מה לכתוב ללקוח?"
        />
      </section>}

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
