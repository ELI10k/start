import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSummaryProvider } from "@/lib/coach-intelligence/summary-provider";
import { isSummaryHour, israelWeek } from "@/lib/coach-intelligence/week-window";
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
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

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
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  let written = 0;
  let insufficient = 0;
  for (const client of rows(clients)) {
    const clientId = String(client.id);
    try {
      const facts = await gatherFacts(supabase, clientId, week);
      const summary = await provider.summarize(facts);
      const { error: writeError } = await supabase.rpc("upsert_weekly_summary", {
        p_client_id: clientId,
        p_week_start: week.start,
        p_status: summary.status === "ready" ? "draft" : "insufficient_data",
        p_provider: summary.provider,
        p_facts: summary.facts,
        p_went_well: summary.wentWell,
        p_needs_work: summary.needsWork,
        p_actions: summary.actions,
      });
      if (writeError) throw writeError;
      if (summary.status === "ready") written += 1;
      else insufficient += 1;
    } catch (cause) {
      // One client's bad week must not stop the other clients' summaries.
      console.error("weekly summary failed for client", { clientId, message: cause instanceof Error ? cause.message : "unknown" });
    }
  }

  console.info("weekly summary ran", { week: week.start, written, insufficient });
  return NextResponse.json({ ok: true, week: week.start, written, insufficient, provider: provider.name });
}

async function gatherFacts(supabase: SupabaseClient, clientId: string, week: ReturnType<typeof israelWeek>): Promise<WeeklyFacts> {
  const [sessions, previousSessions, mealStatus, steps, previousSteps, progress, previousProgress, checkIns] = await Promise.all([
    supabase.from("workout_sessions").select("id,status,completed_at,total_volume,assignment_id").eq("client_id", clientId).eq("status", "completed").gte("completed_at", `${week.start}T00:00:00Z`).lte("completed_at", `${week.end}T23:59:59Z`),
    supabase.from("workout_sessions").select("id").eq("client_id", clientId).eq("status", "completed").gte("completed_at", `${week.previousStart}T00:00:00Z`).lt("completed_at", `${week.start}T00:00:00Z`),
    supabase.from("meal_day_status").select("status,status_date").eq("client_id", clientId).gte("status_date", week.start).lte("status_date", week.end),
    supabase.from("health_steps").select("day,steps").eq("client_id", clientId).gte("day", week.start).lte("day", week.end),
    supabase.from("health_steps").select("day,steps").eq("client_id", clientId).gte("day", week.previousStart).lt("day", week.start),
    supabase.from("progress_entries").select("date,weight,waist,chest,hips").eq("client_id", clientId).gte("date", week.start).lte("date", week.end).order("date"),
    supabase.from("progress_entries").select("date,weight").eq("client_id", clientId).lt("date", week.start).order("date", { ascending: false }).limit(1),
    supabase.from("check_ins").select("id,status").eq("client_id", clientId).gte("submitted_at", `${week.start}T00:00:00Z`).lte("submitted_at", `${week.end}T23:59:59Z`),
  ]);

  const assignment = await supabase.from("workout_assignments").select("weekly_frequency").eq("client_id", clientId).eq("status", "active").maybeSingle();
  const planned = num((assignment.data as Row | null)?.weekly_frequency);
  const completedRows = rows(sessions.data);
  const workouts = planned > 0 || completedRows.length
    ? {
        completed: completedRows.length,
        planned: planned || completedRows.length,
        skipped: 0,
        volumeKg: completedRows.reduce((total, row) => total + num(row.total_volume), 0),
        previousCompleted: rows(previousSessions.data).length,
      }
    : undefined;

  const statusRows = rows(mealStatus.data);
  const nutrition = statusRows.length
    ? {
        daysReported: new Set(statusRows.map((row) => String(row.status_date))).size,
        mealsEaten: statusRows.filter((row) => row.status === "eaten").length,
        mealsPlanned: statusRows.length,
        freeCalorieDays: 0,
      }
    : undefined;

  const stepRows = rows(steps.data);
  const previousStepRows = rows(previousSteps.data);
  const goalRow = await supabase.from("health_preferences").select("daily_step_goal").eq("client_id", clientId).maybeSingle();
  const goal = num((goalRow.data as Row | null)?.daily_step_goal) || 10000;
  const average = (source: Row[]) => (source.length ? Math.round(source.reduce((total, row) => total + num(row.steps), 0) / source.length) : 0);
  const stepFacts = stepRows.length
    ? {
        daysReported: stepRows.length,
        average: average(stepRows),
        goal,
        daysMetGoal: stepRows.filter((row) => num(row.steps) >= goal).length,
        previousAverage: previousStepRows.length ? average(previousStepRows) : undefined,
      }
    : undefined;

  const progressRows = rows(progress.data);
  const latest = progressRows[progressRows.length - 1];
  const baseline = rows(previousProgress.data)[0];
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

  const checkInRows = rows(checkIns.data);
  const checkInFacts = { submitted: checkInRows.length, reviewed: checkInRows.filter((row) => row.status === "reviewed").length };

  return { weekStart: week.start, weekEnd: week.end, workouts, nutrition, steps: stepFacts, weight, measurements, checkIns: checkInFacts };
}
