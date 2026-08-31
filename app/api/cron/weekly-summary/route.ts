import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSummaryProvider } from "@/lib/coach-intelligence/summary-provider";
import { isSummaryHour, israelWeek } from "@/lib/coach-intelligence/week-window";
import { calculateCoachScores, weeklyRecommendations, type HabitMetrics } from "@/lib/coach-intelligence/rule-engine";
import type { WeeklyFacts } from "@/lib/coach-intelligence/weekly-facts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Saturday 20:00 Israel time, one summary per active client, written only from
// what that client produced during the week.
//
// Idempotent: upsert_weekly_summary is keyed on (client, week) and refuses to
// overwrite a summary the coach has already sent, so a re-run - or a retry after
// a timeout - cannot rewrite what a client has read.

type Row = Record<string, unknown>;
const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);
const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value) || 0);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  if (!isAuthorizedCronRequest(request, secret)) return NextResponse.json({ ok: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 });

  // The cron fires on every Saturday hour around the target so a daylight-saving
  // shift cannot skip the week; this is the gate that picks the right one. A
  // caller holding the secret can force a run.
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (!force && !isSummaryHour(new Date())) {
    return NextResponse.json({ ok: true, skipped: "not_summary_hour" });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const week = israelWeek(new Date());
  // BLOCKED-EXTERNAL: with no model credential this is the deterministic writer.
  const provider = resolveSummaryProvider();

  const { data: clients, error } = await supabase.from("profiles").select("id").eq("role", "client").eq("status", "active");
  if (error) {
    console.error("weekly summary: client list failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, error: "weekly_summary_failed" }, { status: 500 });
  }

  // Everything the whole roster needs, in a fixed number of queries.
  //
  // This ran gatherFacts per client - ten round trips each - and then three more
  // to write, inside one serverless function with a wall clock. The shape did
  // not fail loudly at a few dozen clients; it stopped partway through, and the
  // clients at the end of the list had no report and no error to explain it.
  const clientIds = rows(clients).map((client) => String(client.id));
  const factsFor = await gatherAllFacts(supabase, clientIds, week);

  const summaries: Record<string, unknown>[] = [];
  const coachNotices: Record<string, string | null>[] = [];
  let written = 0;
  let insufficient = 0;
  const coachByClient = await coachesFor(supabase, clientIds);

  for (const clientId of clientIds) {
    try {
      const summary = await provider.summarize(factsFor(clientId));
      summaries.push({
        client_id: clientId,
        week_start: week.start,
        status: summary.status === "ready" ? "draft" : "insufficient_data",
        provider: summary.provider,
        facts: summary.facts,
        went_well: summary.wentWell,
        needs_work: summary.needsWork,
        actions: summary.actions,
      });
      if (summary.status !== "ready") { insufficient += 1; continue; }
      written += 1;
      const coachId = coachByClient.get(clientId);
      if (coachId) coachNotices.push({
        recipient_id: coachId, actor_id: null, category: "check_ins", type: "coach_message",
        title: "דוח שבועי מוכן לאישור", body: "START הכינה טיוטה חדשה. יש לבדוק ולאשר לפני שהלקוח יראה אותה.",
        href: `/coach/clients/${clientId}?tab=improvement`, source_table: "weekly_summaries",
        source_id: `${clientId}-${week.start}`, dedupe_key: `weekly-summary-ready-${clientId}-${week.start}`,
      });
    } catch (cause) {
      // One client's bad week must not stop the other clients' summaries.
      console.error("weekly summary failed for client", { clientId, message: cause instanceof Error ? cause.message : "unknown" });
    }
  }

  if (summaries.length) {
    const { error: writeError } = await supabase.rpc("upsert_weekly_summaries", { p_rows: summaries });
    if (writeError) {
      console.error("weekly summary batch failed", { message: writeError.message, size: summaries.length });
      return NextResponse.json({ ok: false, week: week.start, error: "weekly_summary_failed" }, { status: 500 });
    }
  }
  // The risk scores the coach dashboard reads.
  //
  // habit_analysis_reports has been read since it was created and written by
  // nothing: no application code, no SQL, no job, and no insert policy. So the
  // "דורשים תשומת לב" panel - the thing the 2026-08-20 review moved to the top of
  // the coach's morning screen as the most actionable item on it - has never
  // once had a row to show, and its empty state says "no client currently has a
  // data-based risk signal", which a coach reads as "everyone is fine".
  //
  // The engine to fill it already existed: calculateCoachScores turns the same
  // facts gathered above into exactly the seven scores the table stores. Only
  // the writer was missing.
  //
  // Best effort on purpose. This is a panel, and the summaries are the point of
  // the run - a bad column name here must not cost every client their report.
  try {
    const reports = clientIds.flatMap((clientId) => {
      const coachId = coachByClient.get(clientId);
      if (!coachId) return [];
      const facts = factsFor(clientId);
      // Optional on WeeklyFacts because a summary may have none; here a client
      // with no check-ins is a client with zero, not a client with nothing.
      const submitted = facts.checkIns?.submitted ?? 0;
      const metrics: HabitMetrics = {
        mealCompletion: facts.nutrition?.mealsPlanned ? Math.round((facts.nutrition.mealsEaten / facts.nutrition.mealsPlanned) * 100) : 0,
        workoutCompletion: facts.workouts?.planned ? Math.round((facts.workouts.completed / facts.workouts.planned) * 100) : 0,
        averageProtein: 0,
        activeDays: facts.nutrition?.daysReported ?? 0,
        checkIns: submitted,
        weightTrend: facts.weight?.changeKg ?? 0,
        skippedWorkouts: facts.workouts?.skipped ?? 0,
        logins: facts.loginDays,
      };
      const scores = calculateCoachScores(metrics);
      const actions = weeklyRecommendations(metrics);
      // A week with nothing in it scores badly for the wrong reason, so it is
      // marked as such rather than reported as risk.
      const measured = Boolean(facts.workouts || facts.nutrition || submitted || facts.loginDays);
      return [{
        client_id: clientId, coach_id: coachId,
        week_start: week.start, week_end: week.end,
        consistency_score: scores.consistency, nutrition_score: scores.nutrition,
        workout_score: scores.workouts, tracking_score: scores.tracking,
        client_health_score: scores.health, risk_score: scores.risk, retention_risk: scores.retention,
        summary: measured ? `עקביות ${scores.consistency}/100 · תזונה ${scores.nutrition} · אימונים ${scores.workouts}` : "אין מספיק נתונים לשבוע הזה.",
        progress_explanation: measured ? `נכנס ל־${facts.loginDays} ימים מתוך 7, ${submitted} צ׳ק־אינים.` : "לא נרשמה פעילות מדודה.",
        strengths: [], improvements: [], recommended_actions: actions,
        metrics, status: measured ? "ready" : "insufficient_data",
      }];
    });
    if (reports.length) {
      const { error: reportError } = await supabase.from("habit_analysis_reports")
        .upsert(reports, { onConflict: "client_id,week_start,week_end" });
      if (reportError) console.error("habit reports failed", { message: reportError.message });
    }
  } catch (cause) {
    console.error("habit reports threw", { message: cause instanceof Error ? cause.message : "unknown" });
  }

  if (coachNotices.length) {
    const { error: noticeError } = await supabase.rpc("create_in_app_notifications", { p_rows: coachNotices });
    // The summaries are the point of the run; a coach who did not get the nudge
    // still finds the draft waiting on the client's file.
    if (noticeError) console.error("weekly summary notices failed", { message: noticeError.message });
  }

  console.info("weekly summary ran", { week: week.start, written, insufficient });
  return NextResponse.json({ ok: true, week: week.start, written, insufficient, provider: provider.name });
}

/** Which coach holds each client, in one query rather than one per client. */
async function coachesFor(supabase: SupabaseClient, clientIds: readonly string[]) {
  if (!clientIds.length) return new Map<string, string>();
  const { data } = await supabase.from("coach_client_relationships")
    .select("client_id,coach_id").in("client_id", [...clientIds]).eq("status", "active");
  const byClient = new Map<string, string>();
  // One active coach per client is the rule; if a second ever appears the first
  // is used rather than the run failing.
  for (const row of rows(data)) if (!byClient.has(String(row.client_id))) byClient.set(String(row.client_id), String(row.coach_id));
  return byClient;
}

/**
 * Everything every client's summary needs, in ten queries rather than ten each.
 *
 * The per-client version is kept below and still holds the arithmetic - this
 * only changes where the rows come from, so the facts a summary is built on are
 * produced by exactly one piece of code.
 */
async function gatherAllFacts(supabase: SupabaseClient, clientIds: readonly string[], week: ReturnType<typeof israelWeek>) {
  // The facts a summary is built from, plus how many days the client opened the
  // app - which the risk score needs and a summary does not.
  type FactsWithLogins = WeeklyFacts & { loginDays: number };
  const empty = (): FactsWithLogins => ({ weekStart: week.start, weekEnd: week.end, checkIns: { submitted: 0, reviewed: 0 }, loginDays: 0 });
  if (!clientIds.length) return (): FactsWithLogins => empty();
  const ids = [...clientIds];

  const [sessions, previousSessions, mealStatus, foodLogs, steps, previousSteps, progress, earlierProgress, checkIns, assignments, stepGoals, deviceSessions] =
    await Promise.all([
      supabase.from("workout_sessions").select("client_id,id,status,completed_at,total_volume,assignment_id").in("client_id", ids).eq("status", "completed").gte("completed_at", `${week.start}T00:00:00Z`).lte("completed_at", `${week.end}T23:59:59Z`),
      supabase.from("workout_sessions").select("client_id,id").in("client_id", ids).eq("status", "completed").gte("completed_at", `${week.previousStart}T00:00:00Z`).lt("completed_at", `${week.start}T00:00:00Z`),
      supabase.from("meal_day_status").select("client_id,status,status_date").in("client_id", ids).gte("status_date", week.start).lte("status_date", week.end),
      supabase.from("client_food_log").select("client_id,meal_id,log_date,calories,protein,carbs,fat").in("client_id", ids).gte("log_date", week.start).lte("log_date", week.end),
      supabase.from("health_steps").select("client_id,day,steps").in("client_id", ids).gte("day", week.start).lte("day", week.end),
      supabase.from("health_steps").select("client_id,day,steps").in("client_id", ids).gte("day", week.previousStart).lt("day", week.start),
      supabase.from("progress_entries").select("client_id,date,weight,waist,chest,hips").in("client_id", ids).gte("date", week.start).lte("date", week.end).order("date"),
      // The last weigh-in before the week, per client. Ordered newest first so
      // the first row seen for a client is the one that matters.
      supabase.from("progress_entries").select("client_id,date,weight").in("client_id", ids).lt("date", week.start).order("date", { ascending: false }),
      supabase.from("check_ins").select("client_id,id,status").in("client_id", ids).gte("submitted_at", `${week.start}T00:00:00Z`).lte("submitted_at", `${week.end}T23:59:59Z`),
      supabase.from("workout_assignments").select("client_id,weekly_frequency").in("client_id", ids).eq("status", "active"),
      supabase.from("health_preferences").select("client_id,daily_step_goal").in("client_id", ids),
      // How many days of the week the client actually opened the app. The risk
      // score leans on this hard - with no figure at all every client scores as
      // absent, which is how a "requires attention" panel ends up naming
      // everybody and being read by nobody.
      supabase.from("device_sessions").select("user_id,last_seen_at").in("user_id", ids).gte("last_seen_at", `${week.start}T00:00:00Z`).lte("last_seen_at", `${week.end}T23:59:59Z`),
    ]);

  const group = (result: { data: unknown }) => {
    const byClient = new Map<string, Row[]>();
    for (const row of rows(result.data)) {
      const key = String(row.client_id);
      const list = byClient.get(key);
      if (list) list.push(row); else byClient.set(key, [row]);
    }
    return byClient;
  };
  const sessionsBy = group(sessions), previousSessionsBy = group(previousSessions), mealBy = group(mealStatus), foodLogsBy = group(foodLogs);
  const stepsBy = group(steps), previousStepsBy = group(previousSteps), progressBy = group(progress);
  const earlierProgressBy = group(earlierProgress), checkInsBy = group(checkIns);
  const assignmentBy = group(assignments), goalBy = group(stepGoals);
  const loginDaysBy = new Map<string, number>();
  for (const row of rows(deviceSessions)) {
    const key = String(row.user_id);
    const days = loginDaysBy.get(key) ?? 0;
    loginDaysBy.set(key, days + 1);
  }
  const of = (map: Map<string, Row[]>, id: string) => map.get(id) ?? [];

  return (clientId: string): FactsWithLogins => ({
    ...buildFacts({
    week,
    sessions: of(sessionsBy, clientId),
    previousSessions: of(previousSessionsBy, clientId),
    mealStatus: of(mealBy, clientId),
    foodLogs: of(foodLogsBy, clientId),
    steps: of(stepsBy, clientId),
    previousSteps: of(previousStepsBy, clientId),
    progress: of(progressBy, clientId),
    earlierProgress: of(earlierProgressBy, clientId),
    checkIns: of(checkInsBy, clientId),
    plannedFrequency: num(of(assignmentBy, clientId)[0]?.weekly_frequency),
    stepGoal: num(of(goalBy, clientId)[0]?.daily_step_goal) || 10_000,
    }),
    loginDays: Math.min(7, loginDaysBy.get(clientId) ?? 0),
  });
}

/** The arithmetic, on rows that have already been fetched and grouped. */
function buildFacts(input: {
  week: ReturnType<typeof israelWeek>;
  sessions: Row[]; previousSessions: Row[]; mealStatus: Row[]; foodLogs: Row[];
  steps: Row[]; previousSteps: Row[]; progress: Row[]; earlierProgress: Row[];
  checkIns: Row[]; plannedFrequency: number; stepGoal: number;
}): WeeklyFacts {
  const { week } = input;
  const completedRows = input.sessions;
  const planned = input.plannedFrequency;
  const workouts = planned > 0 || completedRows.length
    ? {
        completed: completedRows.length,
        planned: planned || completedRows.length,
        skipped: 0,
        volumeKg: completedRows.reduce((total, row) => total + num(row.total_volume), 0),
        previousCompleted: input.previousSessions.length,
      }
    : undefined;

  const statusRows = input.mealStatus;
  const nutrition = statusRows.length
    ? {
        daysReported: new Set(statusRows.map((row) => String(row.status_date))).size,
        mealsEaten: statusRows.filter((row) => row.status === "eaten").length,
        mealsPlanned: statusRows.length,
        freeCalorieDays: 0,
        outsideMenuItems: input.foodLogs.filter((row) => !row.meal_id).length,
        measuredOutsideMenuItems: input.foodLogs.filter((row) => !row.meal_id && row.calories !== null).length,
        unmeasuredOutsideMenuItems: input.foodLogs.filter((row) => !row.meal_id && row.calories === null).length,
      }
    : input.foodLogs.length
      ? {
          daysReported: new Set(input.foodLogs.map((row) => String(row.log_date))).size,
          mealsEaten: 0,
          mealsPlanned: 0,
          freeCalorieDays: 0,
          outsideMenuItems: input.foodLogs.filter((row) => !row.meal_id).length,
          measuredOutsideMenuItems: input.foodLogs.filter((row) => !row.meal_id && row.calories !== null).length,
          unmeasuredOutsideMenuItems: input.foodLogs.filter((row) => !row.meal_id && row.calories === null).length,
        }
      : undefined;

  const goal = input.stepGoal;
  const average = (source: Row[]) => (source.length ? Math.round(source.reduce((total, row) => total + num(row.steps), 0) / source.length) : 0);
  const stepFacts = input.steps.length
    ? {
        daysReported: input.steps.length,
        average: average(input.steps),
        goal,
        daysMetGoal: input.steps.filter((row) => num(row.steps) >= goal).length,
        previousAverage: input.previousSteps.length ? average(input.previousSteps) : undefined,
      }
    : undefined;

  const progressRows = input.progress;
  const latest = progressRows[progressRows.length - 1];
  const baseline = input.earlierProgress[0];
  const weight = progressRows.length
    ? {
        entries: progressRows.length,
        latestKg: num(latest?.weight),
        changeKg: baseline ? Number((num(latest?.weight) - num(baseline.weight)).toFixed(1)) : undefined,
      }
    : undefined;

  const sites = ["waist", "chest", "hips"] as const;
  const labels: Record<(typeof sites)[number], string> = { waist: "מותן", chest: "חזה", hips: "ירכיים" };
  const changedSites = progressRows.length ? sites.filter((site) => progressRows.some((row) => row[site] !== null && row[site] !== undefined)).map((site) => labels[site]) : [];
  const measurements = changedSites.length ? { entries: progressRows.length, changedSites } : undefined;

  const checkInFacts = { submitted: input.checkIns.length, reviewed: input.checkIns.filter((row) => row.status === "reviewed").length };

  return { weekStart: week.start, weekEnd: week.end, workouts, nutrition, steps: stepFacts, weight, measurements, checkIns: checkInFacts };
}
