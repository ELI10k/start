import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDailyCoachMessage } from "@/lib/coach-intelligence/proactive-coach";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;
const rows = (value: unknown) => (Array.isArray(value) ? value as Row[] : []);
const num = (value: unknown) => value === null || value === undefined ? 0 : Number(value) || 0;

const israelDate = (now = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
}).format(now);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const date = israelDate();
  const { data: clients, error } = await supabase.from("profiles").select("id").eq("role", "client").eq("status", "active");
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  let delivered = 0;
  let failed = 0;
  for (const client of rows(clients)) {
    const clientId = String(client.id);
    try {
      const input = await gatherDailyInput(supabase, clientId, date);
      const message = buildDailyCoachMessage(input);
      const { error: notificationError } = await supabase.rpc("create_in_app_notification", {
        p_recipient_id: clientId,
        p_actor_id: null,
        p_category: "nutrition",
        p_type: "end_of_day_reminder",
        p_title: message.title,
        p_body: `${message.summary} ${message.action}`,
        p_href: message.href,
        p_source_table: "daily_coach",
        p_source_id: date,
        p_dedupe_key: `daily-coach-${date}`,
      });
      if (notificationError) throw notificationError;
      delivered += 1;
    } catch (cause) {
      failed += 1;
      console.error("daily coach failed for client", { clientId, message: cause instanceof Error ? cause.message : "unknown" });
    }
  }
  return NextResponse.json({ ok: failed === 0, date, delivered, failed });
}

async function gatherDailyInput(supabase: SupabaseClient, clientId: string, date: string) {
  const { data: assignment } = await supabase.from("client_meal_plan_assignments")
    .select("meal_plan_id,meal_plans(calorie_target,protein_target)")
    .eq("client_id", clientId).eq("status", "active").lte("assigned_from", date)
    .or(`assigned_until.is.null,assigned_until.gte.${date}`).maybeSingle();
  const planRelation = (assignment as Row | null)?.meal_plans;
  const plan = (Array.isArray(planRelation) ? planRelation[0] : planRelation) as Row | undefined;
  const planId = String((assignment as Row | null)?.meal_plan_id ?? "");
  if (!planId) return { mealsCompleted: 0, mealsPlanned: 0, calories: 0, protein: 0 };

  const [{ data: meals }, { data: statuses }, { data: log }] = await Promise.all([
    supabase.from("meals").select("id").eq("meal_plan_id", planId),
    supabase.from("meal_day_status").select("meal_id,status").eq("client_id", clientId).eq("status_date", date),
    supabase.from("nutrition_logs").select("id").eq("client_id", clientId).eq("log_date", date).maybeSingle(),
  ]);
  const logId = (log as Row | null)?.id;
  const { data: eaten } = logId
    ? await supabase.from("eaten_meal_items").select("calculated_calories,calculated_protein").eq("nutrition_log_id", logId)
    : { data: [] };
  const eatenRows = rows(eaten);
  return {
    mealsCompleted: rows(statuses).filter((row) => row.status === "eaten").length,
    mealsPlanned: rows(meals).length,
    calories: eatenRows.reduce((total, row) => total + num(row.calculated_calories), 0),
    calorieTarget: plan?.calorie_target === null || plan?.calorie_target === undefined ? undefined : num(plan.calorie_target),
    protein: eatenRows.reduce((total, row) => total + num(row.calculated_protein), 0),
    proteinTarget: plan?.protein_target === null || plan?.protein_target === undefined ? undefined : num(plan.protein_target),
  };
}
