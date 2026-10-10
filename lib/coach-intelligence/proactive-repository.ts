import { calendarDay, shiftDay } from "@/lib/health/calculations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildCoachAttention, type CoachedClientActivity } from "./proactive-coach";

type Row = Readonly<Record<string, unknown>>;
type QueryResult = Readonly<{ data: unknown; error: { message: string } | null }>;

const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const number = (value: unknown) => Number(value ?? 0) || 0;
const string = (value: unknown) => String(value ?? "");

/**
 * Build the coach queue from the current roster and the last seven days.
 *
 * A weekly report is useful detail, but it is not membership in the coach's
 * roster. The old implementation started at habit_analysis_reports, so a
 * coached client disappeared completely until the Saturday batch happened to
 * write a report. Starting at active relationships also excludes digital-only
 * clients by construction.
 */
export async function getCoachAttention(coachId: string, now: Date | string = new Date()) {
  const supabase = await createSupabaseServerClient();
  const end = calendarDay(now);
  const start = shiftDay(end, -6);

  const relationships = await supabase.from("coach_client_relationships")
    .select("client_id,created_at")
    .eq("coach_id", coachId)
    .eq("status", "active");
  if (relationships.error) return { items: [], measured: false };

  const relationshipRows = rows(relationships.data);
  const clientIds = relationshipRows.map((row) => string(row.client_id)).filter(Boolean);
  if (!clientIds.length) return { items: [], measured: true };

  const results = await Promise.all([
    supabase.from("profiles").select("id,full_name,status").in("id", clientIds).eq("role", "client").eq("status", "active"),
    supabase.from("client_meal_plan_assignments").select("client_id,meal_plan_id,assigned_from,assigned_until").in("client_id", clientIds).eq("status", "active").lte("assigned_from", end).or(`assigned_until.is.null,assigned_until.gte.${start}`),
    supabase.from("meal_day_status").select("client_id,meal_id,status_date,status").in("client_id", clientIds).gte("status_date", start).lte("status_date", end),
    supabase.from("client_food_log").select("client_id,log_date").in("client_id", clientIds).gte("log_date", start).lte("log_date", end),
    supabase.from("workout_sessions").select("client_id,completed_at").in("client_id", clientIds).eq("status", "completed").gte("completed_at", `${start}T00:00:00Z`).lte("completed_at", `${end}T23:59:59Z`),
    supabase.from("workout_assignments").select("client_id,weekly_frequency").in("client_id", clientIds).eq("status", "active"),
    supabase.from("check_ins").select("client_id,submitted_at").in("client_id", clientIds).gte("submitted_at", `${start}T00:00:00Z`).lte("submitted_at", `${end}T23:59:59Z`),
    supabase.from("progress_entries").select("client_id,date").in("client_id", clientIds).gte("date", start).lte("date", end),
  ]) as QueryResult[];
  if (results.some((result) => result.error)) return { items: [], measured: false };

  const [profilesResult, assignmentsResult, statusesResult, foodResult, workoutsResult, workoutAssignmentsResult, checkInsResult, progressResult] = results;
  const assignments = rows(assignmentsResult.data);
  const planIds = [...new Set(assignments.map((row) => string(row.meal_plan_id)).filter(Boolean))];
  const mealsResult: QueryResult = planIds.length
    ? await supabase.from("meals").select("id,meal_plan_id,day_index").in("meal_plan_id", planIds)
    : { data: [], error: null };
  if (mealsResult.error) return { items: [], measured: false };

  const profiles = new Map(rows(profilesResult.data).map((row) => [string(row.id), row]));
  const relationshipByClient = new Map(relationshipRows.map((row) => [string(row.client_id), row]));
  const assignmentByClient = new Map(assignments.map((row) => [string(row.client_id), row]));
  const mealsByPlan = group(rows(mealsResult.data), "meal_plan_id");
  const statusesByClient = group(rows(statusesResult.data), "client_id");
  const foodByClient = group(rows(foodResult.data), "client_id");
  const workoutsByClient = group(rows(workoutsResult.data), "client_id");
  const workoutAssignmentByClient = new Map(rows(workoutAssignmentsResult.data).map((row) => [string(row.client_id), row]));
  const checkInsByClient = group(rows(checkInsResult.data), "client_id");
  const progressByClient = group(rows(progressResult.data), "client_id");

  const activities: CoachedClientActivity[] = [];
  for (const clientId of clientIds) {
    const profile = profiles.get(clientId);
    if (!profile) continue;
    const relationship = relationshipByClient.get(clientId);
    const assignment = assignmentByClient.get(clientId);
    const assignedFrom = assignment ? string(assignment.assigned_from) : undefined;
    const eligibleStart = [start, string(relationship?.created_at).slice(0, 10), assignedFrom ?? ""].filter(Boolean).sort().at(-1) ?? start;
    const eligibleDates = datesBetween(eligibleStart, end);
    const planMeals = assignment ? (mealsByPlan.get(string(assignment.meal_plan_id)) ?? []) : [];
    const expectedMealIds = new Set<string>();
    let plannedMeals = 0;
    for (const date of eligibleDates) {
      const day = israelWeekday(date);
      const availableDays = new Set(planMeals.map((row) => number(row.day_index)));
      const selectedDay = availableDays.has(day) ? day : availableDays.size ? Math.min(...availableDays) : 0;
      const meals = planMeals.filter((row) => number(row.day_index) === selectedDay);
      plannedMeals += meals.length;
      for (const meal of meals) expectedMealIds.add(`${date}:${string(meal.id)}`);
    }

    const statuses = statusesByClient.get(clientId) ?? [];
    const markedMeals = new Set(statuses.map((row) => `${string(row.status_date)}:${string(row.meal_id)}`).filter((key) => expectedMealIds.has(key))).size;
    const nutritionDays = new Set([
      ...statuses.map((row) => string(row.status_date)),
      ...(foodByClient.get(clientId) ?? []).map((row) => string(row.log_date)),
    ]).size;

    activities.push({
      clientId,
      clientName: string(profile.full_name) || "לקוח",
      periodEnd: end,
      eligibleDays: eligibleDates.length,
      hasActiveMenu: Boolean(assignment && planMeals.length),
      plannedMeals,
      markedMeals,
      nutritionDays,
      workoutsCompleted: (workoutsByClient.get(clientId) ?? []).length,
      workoutsPlanned: number(workoutAssignmentByClient.get(clientId)?.weekly_frequency),
      checkIns: (checkInsByClient.get(clientId) ?? []).length,
      weighIns: (progressByClient.get(clientId) ?? []).length,
    });
  }

  return { items: buildCoachAttention(activities), measured: true };
}

function group(source: readonly Row[], key: string) {
  const grouped = new Map<string, Row[]>();
  for (const row of source) {
    const id = string(row[key]);
    const values = grouped.get(id);
    if (values) values.push(row); else grouped.set(id, [row]);
  }
  return grouped;
}

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  for (let date = start; date <= end && dates.length < 7; date = shiftDay(date, 1)) dates.push(date);
  return dates;
}

// Sunday is zero, matching the menu's persisted day_index.
function israelWeekday(date: string) {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse("1970-01-04T00:00:00Z")) / 86_400_000);
  return ((days % 7) + 7) % 7;
}
