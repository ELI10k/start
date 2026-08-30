import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDailyCoachMessage } from "@/lib/coach-intelligence/proactive-coach";
import { israelDateKey, israelWeekday } from "@/lib/date-time";
import { generateWorkoutCycleProposals } from "@/lib/workouts/cycle-proposals";
import { generateNutritionProposals } from "@/lib/nutrition/adaptation-generator";

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

  // Whether each client asked for this message.
  //
  // "סיכום סוף יום" has been a switch on the preferences screen since
  // 202607210002 and nothing has ever read it - not this route, not any reminder
  // function. A client who turned it off kept getting the evening message every
  // night, which is the one thing a notification setting must never do. The
  // category gate inside create_in_app_notification does not cover it: that asks
  // whether nutrition notifications are wanted at all, which is a broader
  // question than this one.
  //
  // Absent row means never configured, and the column's default is true.
  const { data: preferences } = clientIds.length
    ? await supabase.from("notification_preferences").select("user_id,end_of_day_reminder").in("user_id", clientIds)
    : { data: [] };
  const wantsSummary = new Map(rows(preferences).map((row) => [String(row.user_id), row.end_of_day_reminder !== false]));

  // One write for the whole roster, not one per client.
  //
  // The reads stopped growing with the roster on 2026-08-20; the writes did not,
  // and they are inside a serverless function with a wall clock. At a few
  // hundred clients the loop was cut off partway through and the clients at the
  // end of the list never heard from it - with no error, because the function
  // simply stopped. The message is still built here, per client, in the language
  // the product speaks; only the delivery is batched.
  let declined = 0;
  const batch: Record<string, string | null>[] = [];
  for (const client of rows(clients)) {
    const clientId = String(client.id);
    if (!(wantsSummary.get(clientId) ?? true)) { declined += 1; continue; }
    const message = buildDailyCoachMessage(dailyInput(clientId));
    batch.push({
      recipient_id: clientId,
      actor_id: null,
      category: "nutrition",
      type: "end_of_day_reminder",
      title: message.title,
      body: `${message.summary} ${message.action}`,
      href: message.href,
      source_table: "daily_coach",
      source_id: date,
      dedupe_key: `daily-coach-${date}`,
    });
  }

  const { data: written, error: writeError } = batch.length
    ? await supabase.rpc("create_in_app_notifications", { p_rows: batch })
    : { data: 0, error: null };
  if (writeError) {
    console.error("daily coach batch failed", { message: writeError.message, size: batch.length });
    return NextResponse.json({ ok: false, date, message: writeError.message }, { status: 500 });
  }
  const delivered = Number(written ?? 0);
  // The function skips a row it cannot use rather than failing the batch, so a
  // shortfall is worth naming.
  const failed = batch.length - delivered;
  if (failed) console.error("daily coach skipped rows", { failed, size: batch.length });
  let workoutCycleProposals=0;
  try{workoutCycleProposals=await generateWorkoutCycleProposals(supabase,date)}catch(error){console.error("workout cycle proposals failed",error)}
  // The nutrition side of the same idea. Its own try/catch for the same reason
  // the evening cron gives each step one: a client who misses a menu proposal
  // should still get their daily message.
  let nutritionProposals=0;
  try{nutritionProposals=await generateNutritionProposals(supabase,date)}catch(error){console.error("nutrition proposals failed",error)}
  return NextResponse.json({ ok: failed === 0, date, delivered, failed, declined, workoutCycleProposals, nutritionProposals });
}

type DailyInput = ReturnType<typeof emptyInput>;
const emptyInput = () => ({ mealsCompleted: 0, mealsPlanned: 0, calories: 0, protein: 0, unmeasuredItems: 0, calorieTarget: undefined as number | undefined, proteinTarget: undefined as number | undefined });

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

  const [{ data: allMeals }, { data: statuses }, { data: logs }, { data: foodLog }] = await Promise.all([
    supabase.from("meals").select("id,meal_plan_id,day_index").in("meal_plan_id", planIds),
    supabase.from("meal_day_status").select("client_id,meal_id,status").in("client_id", withPlan).eq("status_date", date),
    supabase.from("nutrition_logs").select("id,client_id").in("client_id", withPlan).eq("log_date", date),
    // What was eaten instead of, or beside, the menu. The nutrition screen has
    // counted these into the day's totals since 202608200007; this message did
    // not, so a client who logged their food through "אכלתי משהו אחר" was told
    // every evening that they had eaten almost nothing.
    supabase.from("client_food_log").select("client_id,calories,protein").in("client_id", withPlan).eq("log_date", date),
  ]);

  const logByClient = new Map(rows(logs).map((row) => [String(row.client_id), String(row.id)]));
  const logIds = [...logByClient.values()];
  const { data: eaten } = logIds.length
    ? await supabase.from("eaten_meal_items").select("nutrition_log_id,calculated_calories,calculated_protein").in("nutrition_log_id", logIds)
    : { data: [] };

  // Only rows that carry figures join the totals. A sentence or a photograph is
  // real food with no macros attached, and it is counted separately so the
  // message can say the day is partial rather than quietly treat it as zero.
  const outsideByClient = new Map<string, { calories: number; protein: number; unmeasured: number }>();
  for (const row of rows(foodLog)) {
    const key = String(row.client_id);
    const total = outsideByClient.get(key) ?? { calories: 0, protein: 0, unmeasured: 0 };
    if (row.calories === null || row.calories === undefined) total.unmeasured += 1;
    else { total.calories += num(row.calories); total.protein += num(row.protein); }
    outsideByClient.set(key, total);
  }

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
    const outside = outsideByClient.get(clientId);
    input.calories = (totals?.calories ?? 0) + (outside?.calories ?? 0);
    input.protein = (totals?.protein ?? 0) + (outside?.protein ?? 0);
    input.unmeasuredItems = outside?.unmeasured ?? 0;
  }

  return (id: string) => byClient.get(id) ?? emptyInput();
}
