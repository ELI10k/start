import "server-only";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/database.types";
import {
  CHECK_IN_PHOTO_BUCKET,
  CHECK_IN_PHOTO_URL_TTL_SECONDS,
} from "@/lib/check-ins/photo-storage";

export type AuthContext = Readonly<{
  id: string;
  role: UserRole;
  fullName: string;
  status: string;
}>;

export type PersistedMealItem = Readonly<{
  id: string;
  foodId: string;
  name: string;
  amount: number;
  displayQuantity:number;
  measurementUnit:string;
  itemRole:"primary"|"alternative";
  amountSource:"auto"|"manual";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  eaten: boolean;
}>;

export type PersistedMeal = Readonly<{
  id: string;
  title: string;
  notes?: string;
  freeCalorieTarget?: number;
  sortOrder: number;
  items: readonly PersistedMealItem[];
  groups: readonly Readonly<{id:string;type:string;items:readonly PersistedMealItem[];selectedItemId?:string}>[];
  completed: boolean;
  // Unmarked is null; the two marks are explicit.
  status: "eaten" | "not_eaten" | null;
  skipped: boolean;
}>;

export type PersistedMenu = Readonly<{
  id: string;
  title: string;
  description?: string;
  status: string;
  calorieTarget?: number;
  proteinTarget?: number;
  carbohydrateTarget?: number;
  fatTarget?: number;
  meals: readonly PersistedMeal[];
}>;

function foodRelationName(value: unknown): string {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === "object" && "name" in relation
    ? String(relation.name)
    : "מזון";
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id,role,full_name,status")
    .eq("id", user.id)
    .single();
  if (!data || (data.role !== "coach" && data.role !== "client")) return null;
  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name,
    status: data.status,
  };
}

export async function listCoachClients(coachId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: relationships, error } = await supabase
    .from("coach_client_relationships")
    .select("client_id,status,start_date")
    .eq("coach_id", coachId)
    .eq("status", "active");
  if (error) throw error;
  const ids = (relationships ?? []).map((row) => row.client_id);
  if (!ids.length) return [];
  const [
    { data: profiles, error: profileError },
    { data: details, error: detailError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,full_name,email,phone,status,avatar_url")
      .in("id", ids),
    supabase
      .from("client_profiles")
      .select("user_id,goal,target_weight,height,birth_date,activity_level,calorie_target,protein_target,preferences,notes,onboarding_completed,onboarding_completed_at")
      .in("user_id", ids),
  ]);
  if (profileError) throw profileError;
  if (detailError) throw detailError;
  return (profiles ?? []).map((profile) => ({
    ...profile,
    clientProfile:
      (details ?? []).find((detail) => detail.user_id === profile.id) ?? null,
  }));
}

// What the menu editor needs from a client, and nothing else: a name to show in
// the picker, a weight to derive macros from, and the calorie target to prefill.
// It used to call listCoachDashboardClients, which additionally scans every
// check-in and every device session the coach's clients have ever produced -
// three unbounded queries for two fields. Under load those were what pushed the
// route past the database statement timeout.
export type CoachMenuClient = Readonly<{
  id: string;
  full_name: string;
  weight: number | null;
  calorieTarget: number | null;
}>;

export async function listCoachMenuClients(coachId: string): Promise<readonly CoachMenuClient[]> {
  const supabase = await createSupabaseServerClient();
  const { data: relationships, error } = await supabase
    .from("coach_client_relationships")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("status", "active");
  if (error) throw error;
  const ids = (relationships ?? []).map((row) => row.client_id);
  if (!ids.length) return [];

  const [
    { data: profiles, error: profileError },
    { data: details, error: detailError },
    { data: weights, error: weightError },
  ] = await Promise.all([
    supabase.from("profiles").select("id,full_name").in("id", ids),
    supabase.from("client_profiles").select("user_id,calorie_target").in("user_id", ids),
    // Newest first, and bounded: only the most recent weigh-in per client is
    // read, so a client with years of history costs the same as a new one.
    supabase
      .from("progress_entries")
      .select("client_id,weight,date")
      .in("client_id", ids)
      .order("date", { ascending: false })
      .limit(Math.min(500, ids.length * 10)),
  ]);
  if (profileError) throw profileError;
  if (detailError) throw detailError;
  if (weightError) throw weightError;

  return (profiles ?? []).map((profile) => {
    const weight = (weights ?? []).find((row) => row.client_id === profile.id);
    const detail = (details ?? []).find((row) => row.user_id === profile.id);
    return {
      id: profile.id,
      full_name: profile.full_name,
      weight: weight ? Number(weight.weight) : null,
      calorieTarget:
        detail?.calorie_target === null || detail?.calorie_target === undefined
          ? null
          : Number(detail.calorie_target),
    };
  });
}

export type CoachClientListItem = Awaited<ReturnType<typeof listCoachClients>>[number] & Readonly<{
  latestWeight: number | null;
  latestWeightDate: string | null;
  lastCheckInAt: string | null;
  lastLoginAt: string | null;
  dashboardStatus: "active" | "waiting" | "inactive";
}>;

export async function listCoachDashboardClients(
  coachId: string,
  options: Readonly<{ query?: string; sort?: "name" | "checkin" | "weight"; page?: number; pageSize?: number }> = {},
): Promise<Readonly<{ items: readonly CoachClientListItem[]; total: number; page: number; pageSize: number }>> {
  const clients = await listCoachClients(coachId);
  const ids = clients.map((client) => client.id);
  const supabase = await createSupabaseServerClient();
  const [progressResult, checkInResult, deviceResult] = ids.length
    ? await Promise.all([
        supabase.from("progress_entries").select("client_id,weight,date").in("client_id", ids).order("date", { ascending: false }),
        supabase.from("check_ins").select("client_id,submitted_at").in("client_id", ids).order("submitted_at", { ascending: false }),
        supabase.from("device_sessions").select("user_id,last_seen_at").in("user_id", ids).is("revoked_at", null).order("last_seen_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  for (const result of [progressResult, checkInResult, deviceResult]) if (result.error) throw result.error;
  const latest = <T extends { client_id: string }>(rows: readonly T[], id: string) => rows.find((row) => row.client_id === id) ?? null;
  const normalized = options.query?.trim().toLocaleLowerCase("he") ?? "";
  const enriched = clients
    .filter((client) => !normalized || `${client.full_name} ${client.email} ${client.phone ?? ""}`.toLocaleLowerCase("he").includes(normalized))
    .map((client) => {
      const progress = latest(progressResult.data ?? [], client.id);
      const checkIn = latest(checkInResult.data ?? [], client.id);
      const device = (deviceResult.data ?? []).find((row) => row.user_id === client.id) ?? null;
      const waiting = !checkIn || Date.now() - new Date(checkIn.submitted_at).getTime() > 7 * 24 * 60 * 60 * 1000;
      return {
        ...client,
        latestWeight: progress ? Number(progress.weight) : null,
        latestWeightDate: progress?.date ?? null,
        lastCheckInAt: checkIn?.submitted_at ?? null,
        lastLoginAt: device?.last_seen_at ?? null,
        dashboardStatus: client.status !== "active" ? "inactive" : waiting ? "waiting" : "active",
      } satisfies CoachClientListItem;
    });
  const sort = options.sort ?? "name";
  enriched.sort((left, right) => sort === "checkin"
    ? (right.lastCheckInAt ?? "").localeCompare(left.lastCheckInAt ?? "")
    : sort === "weight"
      ? (right.latestWeight ?? -Infinity) - (left.latestWeight ?? -Infinity)
      : left.full_name.localeCompare(right.full_name, "he"));
  const pageSize = Math.min(50, Math.max(5, options.pageSize ?? 12));
  const total = enriched.length;
  const page = Math.min(Math.max(1, options.page ?? 1), Math.max(1, Math.ceil(total / pageSize)));
  return { items: enriched.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize };
}

export async function getCoachClient(coachId: string, clientId: string) {
  const clients = await listCoachClients(coachId);
  const profile = clients.find((item) => item.id === clientId);
  if (!profile) return null;
  const supabase = await createSupabaseServerClient();
  const [
    { data: progress, error: progressError },
    { data: checkIns, error: checkError },
    { data: assignment, error: assignmentError },
  ] = await Promise.all([
    supabase
      .from("progress_entries")
      .select("*")
      .eq("client_id", clientId)
      .order("date", { ascending: false }),
    supabase
      .from("check_ins")
      .select("*")
      .eq("client_id", clientId)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("client_meal_plan_assignments")
      .select("meal_plan_id")
      .eq("client_id", clientId)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (progressError) throw progressError;
  if (checkError) throw checkError;
  if (assignmentError) throw assignmentError;
  const { data: activeMenu, error: menuError } = assignment
    ? await supabase
        .from("meal_plans")
        .select("id,title,status,updated_at")
        .eq("id", assignment.meal_plan_id)
        .maybeSingle()
    : { data: null, error: null };
  if (menuError) throw menuError;
  return {
    profile,
    progress: progress ?? [],
    checkIns: checkIns ?? [],
    activeMenu,
  };
}

export async function getCoachClientDashboard(coachId: string, clientId: string, date = new Date().toISOString().slice(0, 10)) {
  const base = await getCoachClient(coachId, clientId);
  if (!base) return null;
  const supabase = await createSupabaseServerClient();
  const [menu, deviceResult, assignmentResult, sessionResult] = await Promise.all([
    getActiveClientMenu(clientId, date),
    supabase.from("device_sessions").select("last_seen_at").eq("user_id", clientId).is("revoked_at", null).order("last_seen_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("workout_assignments").select("id,program_id,start_date,weekly_frequency,coach_note").eq("client_id", clientId).eq("status", "active").maybeSingle(),
    supabase.from("workout_sessions").select("id,status,completed_at,started_at,day_id").eq("client_id", clientId).order("started_at", { ascending: false }).limit(30),
  ]);
  for (const result of [deviceResult, assignmentResult, sessionResult]) if (result.error) throw result.error;
  const assignment = assignmentResult.data;
  const [programResult, daysResult] = assignment
    ? await Promise.all([
        supabase.from("workout_programs").select("id,name").eq("id", assignment.program_id).maybeSingle(),
        supabase.from("workout_program_days").select("id,name,sort_order").eq("program_id", assignment.program_id).order("sort_order"),
      ])
    : [{ data: null, error: null }, { data: [], error: null }];
  for (const result of [programResult, daysResult]) if (result.error) throw result.error;
  const sessions = sessionResult.data ?? [];
  const completedThisWeek = sessions.filter((session) => session.status === "completed" && session.completed_at && new Date(session.completed_at).getTime() >= new Date(`${date}T00:00:00Z`).getTime() - 6 * 24 * 60 * 60 * 1000).length;
  const totals = menu?.meals.flatMap((meal) => meal.items.filter((item) => item.eaten)).reduce((sum, item) => ({ calories: sum.calories + item.calories, protein: sum.protein + item.protein, carbs: sum.carbs + item.carbs, fat: sum.fat + item.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const plannedItems = menu?.meals.flatMap((meal) => meal.items) ?? [];
  const completedItems = plannedItems.filter((item) => item.eaten).length;
  const latestCompleted = sessions.find((session) => session.status === "completed") ?? null;
  const nextDay = (daysResult.data ?? []).find((day) => !sessions.some((session) => session.day_id === day.id && session.status === "completed")) ?? (daysResult.data ?? [])[0] ?? null;
  return {
    ...base,
    menu,
    nutrition: {
      totals,
      plannedItems: plannedItems.length,
      completedItems,
      completionPercent: plannedItems.length ? Math.round(completedItems / plannedItems.length * 100) : 0,
      // What the client actively skipped, so a coach can tell a deliberate skip
      // from a meal that was simply never marked.
      skippedMeals: (menu?.meals ?? []).filter((meal) => meal.skipped).map((meal) => meal.title),
    },
    lastLoginAt: deviceResult.data?.last_seen_at ?? null,
    workouts: { assignment, program: programResult.data, lastCompletedAt: latestCompleted?.completed_at ?? null, nextDayName: nextDay?.name ?? null, weeklyCompletionPercent: assignment ? Math.min(100, Math.round(completedThisWeek / assignment.weekly_frequency * 100)) : 0 },
  };
}

export async function getActiveClientMenu(
  clientId: string,
  date: string,
): Promise<PersistedMenu | null> {
  const supabase = await createSupabaseServerClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("client_meal_plan_assignments")
    .select("id,meal_plan_id")
    .eq("client_id", clientId)
    .eq("status", "active")
    .lte("assigned_from", date)
    .or(`assigned_until.is.null,assigned_until.gte.${date}`)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment) return null;

  const { data: plan, error: planError } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", assignment.meal_plan_id)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return null;

  const { data: allMeals, error: mealError } = await supabase
    .from("meals")
    .select("id,title,notes,free_calorie_target,sort_order,day_index")
    .eq("meal_plan_id", plan.id)
    .order("day_index")
    .order("sort_order");
  if (mealError) throw mealError;
  const dayIndex = new Date(`${date}T00:00:00Z`).getUTCDay();
  const availableDays = new Set((allMeals ?? []).map((meal) => meal.day_index));
  const selectedDay = availableDays.has(dayIndex)
    ? dayIndex
    : availableDays.size
      ? Math.min(...availableDays)
      : 0;
  const meals = (allMeals ?? []).filter((meal) => meal.day_index === selectedDay);
  const mealIds = meals.map((meal) => meal.id);

  const [{ data: groups, error: groupError },{ data: items, error: itemError }, { data: log, error: logError }] =
    await Promise.all([
      mealIds.length
        ? supabase.from("meal_food_groups").select("id,meal_id,group_type,sort_order").in("meal_id",mealIds).order("sort_order")
        : Promise.resolve({data:[],error:null}),
      mealIds.length
        ? supabase
            .from("meal_items")
            .select(
              "id,meal_id,group_id,food_id,amount,display_quantity,measurement_unit,item_role,amount_source,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,foods(name)",
            )
            .in("meal_id", mealIds)
            .order("sort_order")
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("nutrition_logs")
        .select("id")
        .eq("client_id", clientId)
        .eq("log_date", date)
        .maybeSingle(),
    ]);
  if(groupError)throw groupError;
  if (itemError) throw itemError;
  if (logError) throw logError;
  const { data: eatenRows, error: eatenError } = log
    ? await supabase
        .from("eaten_meal_items")
        .select("meal_item_id")
        .eq("nutrition_log_id", log.id)
        .not("meal_item_id", "is", null)
    : { data: [], error: null };
  if (eatenError) throw eatenError;
  const eatenIds = new Set((eatenRows ?? []).map((entry) => entry.meal_item_id));
  const groupIds=(groups??[]).map(group=>group.id);
  const {data:selections,error:selectionError}=groupIds.length
    ?await supabase.from("meal_group_selections").select("group_id,meal_item_id").eq("client_id",clientId).eq("selection_date",date).in("group_id",groupIds)
    :{data:[],error:null};
  if(selectionError)throw selectionError;
  const selectedByGroup=new Map((selections??[]).map(row=>[row.group_id,row.meal_item_id]));
  const statusByMeal = await readMealDayStatus(clientId, date, meals.map((meal) => meal.id));

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description ?? undefined,
    status: "active",
    calorieTarget: plan.calorie_target ?? undefined,
    proteinTarget: plan.protein_target ?? undefined,
    carbohydrateTarget: plan.carbohydrate_target ?? undefined,
    fatTarget: plan.fat_target ?? undefined,
    meals: meals.map((meal) => {
      const mealItems = (items ?? [])
        .filter((item) => item.meal_id === meal.id)
        .map((item) => ({
          id: item.id,
          foodId: item.food_id,
          name: foodRelationName(item.foods),
          amount: Number(item.amount),
          displayQuantity:Number(item.display_quantity??item.amount),
          measurementUnit:item.measurement_unit??"גרם",
          itemRole:(item.item_role==="primary"?"primary":"alternative") as "primary"|"alternative",
          amountSource:(item.amount_source==="auto"?"auto":"manual") as "auto"|"manual",
          calories: Number(item.calculated_calories),
          protein: Number(item.calculated_protein),
          carbs: Number(item.calculated_carbohydrates),
          fat: Number(item.calculated_fat),
          eaten: eatenIds.has(item.id),
        }));
      return {
        id: meal.id,
        title: meal.title,
        notes: "notes" in meal ? String(meal.notes??"") : undefined,
        freeCalorieTarget: "free_calorie_target" in meal && meal.free_calorie_target?Number(meal.free_calorie_target):undefined,
        sortOrder: meal.sort_order,
        groups:(groups??[]).filter(group=>group.meal_id===meal.id).map(group=>({
          id:group.id,type:group.group_type,
          items:mealItems.filter(item=>(items??[]).find(row=>row.id===item.id)?.group_id===group.id),
          selectedItemId:selectedByGroup.get(group.id),
        })),
        // An explicit mark wins. Without one, a meal that has groups is still
        // considered eaten once every group's chosen item is logged - that is how
        // the state behaved before the mark existed, and menus assigned before
        // this change keep reading correctly.
        status: statusByMeal.get(meal.id) ?? null,
        completed: statusByMeal.get(meal.id) === "eaten" || (
          statusByMeal.get(meal.id) !== "not_eaten" &&
          (groups??[]).filter(group=>group.meal_id===meal.id).length>0&&
          (groups??[]).filter(group=>group.meal_id===meal.id).every(group=>{
            const selected=selectedByGroup.get(group.id);
            return Boolean(selected&&eatenIds.has(selected));
          })
        ),
        skipped: statusByMeal.get(meal.id) === "not_eaten",
        items: mealItems,
      };
    }),
  };
}

export type MealDayStatus = "eaten" | "not_eaten";

// Reads the explicit per-meal marks for a day.
//
// The table arrives in 202608100001_meal_day_status.sql. Until that migration is
// applied the relation does not exist, and a missing relation must not take the
// nutrition screen down - every meal simply reads as unmarked, which is exactly
// the behaviour that shipped before. Any other error is a real fault and is
// rethrown.
const MISSING_RELATION = new Set(["42P01", "PGRST205"]);

async function readMealDayStatus(
  clientId: string,
  date: string,
  mealIds: readonly string[],
): Promise<ReadonlyMap<string, MealDayStatus>> {
  if (!mealIds.length) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("meal_day_status")
    .select("meal_id,status")
    .eq("client_id", clientId)
    .eq("status_date", date)
    .in("meal_id", mealIds);
  if (error) {
    if (MISSING_RELATION.has(error.code ?? "")) return new Map();
    throw error;
  }
  return new Map((data ?? []).map((row) => [row.meal_id as string, row.status as MealDayStatus]));
}

export async function getFreeMenuDay(clientId: string, date: string) {
  const supabase = await createSupabaseServerClient();
  const { data: day, error } = await supabase.from("free_menu_days").select("id,menu_date,calorie_target,protein_target,status").eq("client_id", clientId).eq("menu_date", date).eq("status", "active").maybeSingle();
  if (error) throw error; if (!day) return null;
  const [{ data: entries, error: entryError }, { data: summary, error: summaryError }] = await Promise.all([supabase.from("free_menu_entries").select("*").eq("free_menu_day_id", day.id).order("eaten_at"),supabase.from("free_menu_daily_summaries").select("*").eq("free_menu_day_id", day.id).maybeSingle()]);
  if (entryError) throw entryError; if (summaryError) throw summaryError;
  return { day, entries: entries ?? [], summary };
}

export async function getClientOverview(clientId: string, date: string) {
  const supabase = await createSupabaseServerClient();
  const [menu, profileResult, progressResult, checkInResult] =
    await Promise.all([
      getActiveClientMenu(clientId, date),
      supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", clientId)
        .single(),
      supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(20),
      supabase
        .from("check_ins")
        .select("*")
        .eq("client_id", clientId)
        .order("submitted_at", { ascending: false })
        .limit(20),
    ]);
  if (profileResult.error) throw profileResult.error;
  if (progressResult.error) throw progressResult.error;
  if (checkInResult.error) throw checkInResult.error;
  return {
    menu,
    clientProfile: profileResult.data,
    progress: progressResult.data ?? [],
    checkIns: checkInResult.data ?? [],
  };
}

export async function getClientCheckInHistory(clientId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: checkIns, error: checkInError }, { data: photos, error: photoError }] =
    await Promise.all([
      supabase
        .from("check_ins")
        .select("*")
        .eq("client_id", clientId)
        .order("submitted_at", { ascending: false })
        .limit(20),
      supabase
        .from("check_in_photos")
        .select("id,check_in_id,view,storage_path")
        .eq("client_id", clientId)
        .order("created_at"),
    ]);
  if (checkInError) throw checkInError;
  if (photoError)
    return { checkIns: checkIns ?? [], photosByCheckIn: {}, photoError: true };
  const paths = (photos ?? []).map((photo) => photo.storage_path);
  const signed = paths.length
    ? await supabase.storage
        .from(CHECK_IN_PHOTO_BUCKET)
        .createSignedUrls(paths, CHECK_IN_PHOTO_URL_TTL_SECONDS)
    : { data: [], error: null };
  if (signed.error)
    return { checkIns: checkIns ?? [], photosByCheckIn: {}, photoError: true };
  const photosByCheckIn: Record<
    string,
    { id: string; view: string; signedUrl: string }[]
  > = {};
  (photos ?? []).forEach((photo, index) => {
    const signedUrl = signed.data?.[index]?.signedUrl;
    if (!signedUrl) return;
    (photosByCheckIn[photo.check_in_id] ??= []).push({
      id: photo.id,
      view: photo.view,
      signedUrl,
    });
  });
  return { checkIns: checkIns ?? [], photosByCheckIn, photoError: false };
}

export type CoachCheckInFilters = Readonly<{
  client?: string;
  status?: "all" | "new" | "responded" | "handled";
  from?: string;
  to?: string;
}>;

export async function listCoachCheckIns(
  coachId: string,
  filters: CoachCheckInFilters = {},
) {
  const clients = await listCoachClients(coachId);
  const clientIds = clients.map((client) => client.id);
  if (!clientIds.length)
    return { items: [], clients: [], photoError: false };
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("check_ins")
    .select("*")
    .in("client_id", clientIds)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (filters.client && clientIds.includes(filters.client))
    query = query.eq("client_id", filters.client);
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? ""))
    query = query.gte("submitted_at", `${filters.from}T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? ""))
    query = query.lte("submitted_at", `${filters.to}T23:59:59.999`);
  if (filters.status === "new")
    query = query.eq("status", "submitted").is("handled_at", null);
  if (filters.status === "responded")
    query = query.eq("status", "reviewed").is("handled_at", null);
  if (filters.status === "handled")
    query = query.not("handled_at", "is", null);
  const { data: checkIns, error } = await query;
  if (error) throw error;
  const checkInIds = (checkIns ?? []).map((item) => item.id);
  const { data: photos, error: photoError } = checkInIds.length
    ? await supabase
        .from("check_in_photos")
        .select("id,check_in_id,view,storage_path")
        .in("check_in_id", checkInIds)
        .order("created_at")
    : { data: [], error: null };
  let signedError = Boolean(photoError);
  const paths = (photos ?? []).map((photo) => photo.storage_path);
  const signed = paths.length
    ? await supabase.storage
        .from(CHECK_IN_PHOTO_BUCKET)
        .createSignedUrls(paths, CHECK_IN_PHOTO_URL_TTL_SECONDS)
    : { data: [], error: null };
  signedError ||= Boolean(signed.error);
  const photosByCheckIn: Record<
    string,
    { id: string; view: string; signedUrl: string }[]
  > = {};
  if (!signedError)
    (photos ?? []).forEach((photo, index) => {
      const signedUrl = signed.data?.[index]?.signedUrl;
      if (!signedUrl) return;
      (photosByCheckIn[photo.check_in_id] ??= []).push({
        id: photo.id,
        view: photo.view,
        signedUrl,
      });
    });
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  return {
    clients,
    photoError: signedError,
    items: (checkIns ?? []).map((item) => ({
      ...item,
      client: clientsById.get(item.client_id) ?? null,
      photos: photosByCheckIn[item.id] ?? [],
    })),
  };
}

export async function getCoachCheckInDashboard(coachId: string) {
  const clients = await listCoachClients(coachId);
  const clientIds = clients.map((client) => client.id);
  if (!clientIds.length)
    return { newCount: 0, respondedCount: 0, handledCount: 0, recent: [] };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("id,client_id,submitted_at,status,handled_at")
    .in("client_id", clientIds)
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const rows = data ?? [];
  return {
    newCount: rows.filter((item) => item.status === "submitted" && !item.handled_at)
      .length,
    respondedCount: rows.filter(
      (item) => item.status === "reviewed" && !item.handled_at,
    ).length,
    handledCount: rows.filter((item) => item.handled_at).length,
    recent: rows.slice(0, 5).map((item) => ({
      ...item,
      client: clientsById.get(item.client_id) ?? null,
    })),
  };
}

export async function listPublishedContent() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("published", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function listCoachMenus(coachId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: plans, error } = await supabase
    .from("meal_plans")
    .select("id,title,description,status,updated_at,is_system_template")
    .eq("coach_id", coachId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const ids = (plans ?? []).map((plan) => plan.id);
  const { data: assignments, error: assignmentError } = ids.length
    ? await supabase
        .from("client_meal_plan_assignments")
        .select("meal_plan_id,client_id")
        .in("meal_plan_id", ids)
        .eq("status", "active")
    : { data: [], error: null };
  if (assignmentError) throw assignmentError;
  return (plans ?? []).map((plan) => {
    const assignment = (assignments ?? []).find(
      (entry) => entry.meal_plan_id === plan.id,
    );
    return {
      ...plan,
      client_id: assignment?.client_id ?? null,
      status: assignment ? "active" : plan.status,
    };
  });
}

async function readDatabaseFoods() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("foods")
    .select("id,name,brand,category,calories,protein,carbs,fat,serving_label,package_unit,unit_weight_grams,calories_per_unit,units_per_package")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// The food catalogue is the same rows for every authenticated user - its policy
// is `for select to authenticated using (true)` - and it only changes when an
// import runs. Caching it per request removes a round trip from every screen
// that needs the picker; the tag lets an import drop it immediately.
export const FOOD_CATALOGUE_TAG = "food-catalogue";

export const listDatabaseFoods = unstable_cache(readDatabaseFoods, ["database-foods"], {
  tags: [FOOD_CATALOGUE_TAG],
  revalidate: 300,
});

export async function listCoachFoodUsage(coachId:string){
  const supabase=await createSupabaseServerClient();
  const {data,error}=await supabase.from("coach_food_usage").select("food_id,selection_count,last_used_at,manual_favorite").eq("coach_id",coachId).order("last_used_at",{ascending:false});
  if(error) throw error;
  return data??[];
}

export async function getCoachMenu(coachId: string, menuId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("id", menuId)
    .eq("coach_id", coachId)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const [
    { data: assignment, error: assignmentError },
    { data: meals, error: mealsError },
  ] = await Promise.all([
    supabase
      .from("client_meal_plan_assignments")
      .select("client_id,assigned_from,assigned_until")
      .eq("meal_plan_id", menuId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("meals")
      .select("*")
      .eq("meal_plan_id", menuId)
      .order("day_index")
      .order("sort_order"),
  ]);
  if (assignmentError) throw assignmentError;
  if (mealsError) throw mealsError;
  const mealIds = (meals ?? []).map((meal) => meal.id);
  // Items and groups are both keyed by the same meal ids and neither depends on
  // the other, so they go out together rather than one after the next.
  const [
    { data: items, error: itemsError },
    { data: groups, error: groupsError },
  ] = mealIds.length
    ? await Promise.all([
        supabase.from("meal_items").select("*").in("meal_id", mealIds).order("sort_order"),
        supabase.from("meal_food_groups").select("*").in("meal_id", mealIds).order("sort_order"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (itemsError) throw itemsError;
  if (groupsError) throw groupsError;
  const dayIndexes = [...new Set((meals ?? []).map((meal) => meal.day_index))];
  return {
    ...plan,
    client_id: assignment?.client_id ?? null,
    active_from: assignment?.assigned_from ?? null,
    active_until: assignment?.assigned_until ?? null,
    status: assignment ? "active" : plan.status,
    days: dayIndexes.map((dayIndex) => ({
      id: `${plan.id}:${dayIndex}`,
      day_index: dayIndex,
      title: `יום ${dayIndex + 1}`,
      sort_order: dayIndex,
      meals: (meals ?? [])
        .filter((meal) => meal.day_index === dayIndex)
        .map((meal) => ({
          ...meal,
          items: (items ?? []).filter((item) => item.meal_id === meal.id),
          groups:(groups??[]).filter(group=>group.meal_id===meal.id).map(group=>({
            ...group,
            items:(items??[]).filter(item=>item.group_id===group.id),
          })),
        })),
    })),
  };
}
