import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDailyCoachMessage } from "@/lib/coach-intelligence/proactive-coach";
import { israelDateKey, israelWeekday } from "@/lib/date-time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = Record<string, unknown>;
const rows = (value: unknown) => (Array.isArray(value) ? value as Row[] : []);
const num = (value: unknown) => value === null || value === undefined ? 0 : Number(value) || 0;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const date = israelDateKey();
  const { data: clients, error } = await supabase.from("profiles").select("id").eq("role", "client").eq("status", "active");
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const clientIds = rows(clients).map((client) => String(client.id));
  const dailyInput = await gatherDailyInputs(supabase, clientIds, date);

  let delivered = 0;
  let failed = 0;
  for (const client of rows(clients)) {
    const clientId = String(client.id);
    try {
      const input = dailyInput(clientId);
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

type DailyInput = ReturnType<typeof emptyInput>;
const emptyInput = () => ({ mealsCompleted: 0, mealsPlanned: 0, calories: 0, protein: 0, calorieTarget: undefined as number | undefined, proteinTarget: undefined as number | undefined });

/**
 * Everything the evening message needs, for every client, in six queries.
 *
 * This used to run five sequential round trips per client inside the delivery
 * loop. At nine clients that is invisible; at a hundred it is four hundred and
 * fifty round trips in series, inside a Vercel function with a wall clock. The
 * shape is the same as before - it is the number of queries that no longer grows
 * with the roster.
 */
async function gatherDailyInputs(supabase: SupabaseClient, clientIds: readonly string[], date: string) {
  const byClient = new Map<string, DailyInput>(clientIds.map((id) => [id, emptyInput()]));
  if (!clientIds.length) return (id: string) => byClient.get(id) ?? emptyInput();

  const ids = [...clientIds];
  const { data: assignments } = await supabase.from("client_meal_plan_assignments")
    .select("client_id,meal_plan_id,meal_plans(calorie_target,protein_target)")
    .in("client_id", ids).eq("status", "active").lte("assigned_from", date)
    .or(`assigned_until.is.null,assigned_until.gte.${date}`);

  const planByClient = new Map<string, string>();
  for (const row of rows(assignments)) {
    const clientId = String(row.client_id);
    // One active assignment per client is the rule the schema enforces; if a
    // second ever appears, the first is used rather than the loop failing.
    if (planByClient.has(clientId)) continue;
    planByClient.set(clientId, String(row.meal_plan_id));
    const relation = row.meal_plans;
    const plan = (Array.isArray(relation) ? relation[0] : relation) as Row | undefined;
    const input = byClient.get(clientId);
    if (!input || !plan) continue;
    input.calorieTarget = plan.calorie_target === null || plan.calorie_target === undefined ? undefined : num(plan.calorie_target);
    input.proteinTarget = plan.protein_target === null || plan.protein_target === undefined ? undefined : num(plan.protein_target);
  }

  const planIds = [...new Set(planByClient.values())];
  const withPlan = [...planByClient.keys()];
  if (!planIds.length) return (id: string) => byClient.get(id) ?? emptyInput();

  const [{ data: allMeals }, { data: statuses }, { data: logs }] = await Promise.all([
    supabase.from("meals").select("id,meal_plan_id,day_index").in("meal_plan_id", planIds),
    supabase.from("meal_day_status").select("client_id,meal_id,status").in("client_id", withPlan).eq("status_date", date),
    supabase.from("nutrition_logs").select("id,client_id").in("client_id", withPlan).eq("log_date", date),
  ]);

  const logByClient = new Map(rows(logs).map((row) => [String(row.client_id), String(row.id)]));
  const logIds = [...logByClient.values()];
  const { data: eaten } = logIds.length
    ? await supabase.from("eaten_meal_items").select("nutrition_log_id,calculated_calories,calculated_protein").in("nutrition_log_id", logIds)
    : { data: [] };

  const eatenByLog = new Map<string, { calories: number; protein: number }>();
  for (const row of rows(eaten)) {
    const key = String(row.nutrition_log_id);
    const total = eatenByLog.get(key) ?? { calories: 0, protein: 0 };
    total.calories += num(row.calculated_calories);
    total.protein += num(row.calculated_protein);
    eatenByLog.set(key, total);
  }

  // Only today's day of each menu. A menu can carry a different Tuesday, and
  // counting every meal of every day it holds told a client on a two-day menu
  // they had marked "3 out of 12" on a day that has six meals in it.
  const today = israelWeekday(date);
  const mealsForPlan = new Map<string, Set<string>>();
  for (const planId of planIds) {
    const planMeals = rows(allMeals).filter((row) => String(row.meal_plan_id) === planId);
    const days = new Set(planMeals.map((row) => num(row.day_index)));
    const selectedDay = days.has(today) ? today : days.size ? Math.min(...days) : 0;
    mealsForPlan.set(planId, new Set(planMeals.filter((row) => num(row.day_index) === selectedDay).map((row) => String(row.id))));
  }

  for (const [clientId, planId] of planByClient) {
    const input = byClient.get(clientId);
    if (!input) continue;
    const mealIds = mealsForPlan.get(planId) ?? new Set<string>();
    input.mealsPlanned = mealIds.size;
    // Statuses are stored per meal, so they are narrowed to today's day too -
    // otherwise yesterday's Tuesday marks would count towards today.
    input.mealsCompleted = rows(statuses).filter((row) =>
      String(row.client_id) === clientId && row.status === "eaten" && mealIds.has(String(row.meal_id))).length;
    const totals = eatenByLog.get(logByClient.get(clientId) ?? "");
    input.calories = totals?.calories ?? 0;
    input.protein = totals?.protein ?? 0;
  }

  return (id: string) => byClient.get(id) ?? emptyInput();
}
