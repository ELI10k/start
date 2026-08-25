import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildNutritionProposals,
  summarizeProposals,
  type MealAnswer,
  type NutritionGoal,
  type NutritionProposal,
  type PortionObservation,
} from "./adaptation.ts";

/**
 * Reads the fortnight, writes the drafts.
 *
 * Every read here is one query for the whole roster rather than one per client,
 * for the same reason the daily coach batches its writes: this runs inside a
 * serverless function with a wall clock, and a per-client loop over five tables
 * is how a job silently stops halfway through the alphabet.
 *
 * Nothing it writes is visible to a client. The table is coach-read-only and the
 * proposals change nothing until a coach approves one.
 */

type Row = Record<string, unknown>;
const rows = (value: unknown) => (Array.isArray(value) ? (value as Row[]) : []);
const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const number = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export const WINDOW_DAYS = 14;

const shiftDay = (day: string, delta: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

/**
 * The five words the onboarding offers, in the three directions the engine reads.
 *
 * `nutrition_goal` is the structured field and wins where it is set. `goal` is
 * the older free-text one and is only consulted for the two Hebrew words that
 * are unambiguous; anything else falls back to maintain, which proposes the
 * least.
 */
export function readGoal(nutritionGoal: string, freeText: string): NutritionGoal {
  if (nutritionGoal === "gentle_cut" || nutritionGoal === "fast_cut") return "lose";
  if (nutritionGoal === "lean_bulk" || nutritionGoal === "dirty_bulk") return "gain";
  if (nutritionGoal === "maintain") return "maintain";
  if (/הרזי|ירידה|חיטוב|לרדת/.test(freeText)) return "lose";
  if (/מסה|עלייה|לעלות/.test(freeText)) return "gain";
  return "maintain";
}

const groupTypes = new Set(["protein", "carbohydrate", "fat", "vegetables"]);
const asGroupType = (value: string): PortionObservation["groupType"] =>
  groupTypes.has(value) ? (value as PortionObservation["groupType"]) : "protein";

export async function generateNutritionProposals(supabase: SupabaseClient, today: string): Promise<number> {
  const windowStart = shiftDay(today, -(WINDOW_DAYS - 1));

  // Who is on a menu right now, and whose menu it is.
  const { data: assignments, error: assignmentError } = await supabase
    .from("client_meal_plan_assignments")
    .select("client_id,meal_plan_id")
    .eq("status", "active")
    .lte("assigned_from", today)
    .or(`assigned_until.is.null,assigned_until.gte.${today}`);
  if (assignmentError) throw assignmentError;
  const planByClient = new Map(rows(assignments).map((row) => [text(row.client_id), text(row.meal_plan_id)]));
  if (!planByClient.size) return 0;

  const clientIds = [...planByClient.keys()];
  const planIds = [...new Set(planByClient.values())];

  const [plans, profiles, meals, selections, statuses, weights] = await Promise.all([
    supabase.from("meal_plans").select("id,coach_id,calorie_target").in("id", planIds),
    supabase.from("client_profiles").select("user_id,goal,nutrition_goal,calorie_target").in("user_id", clientIds),
    supabase.from("meals").select("id,title,meal_plan_id").in("meal_plan_id", planIds),
    supabase.from("meal_group_selections")
      .select("client_id,group_id,meal_item_id,selection_date,amount_override")
      .in("client_id", clientIds).gte("selection_date", windowStart).lte("selection_date", today),
    supabase.from("meal_day_status")
      .select("client_id,meal_id,status_date,status")
      .in("client_id", clientIds).gte("status_date", windowStart).lte("status_date", today),
    supabase.from("progress_entries")
      .select("client_id,date,weight")
      .in("client_id", clientIds).gte("date", shiftDay(today, -56)).lte("date", today).order("date"),
  ]);
  for (const result of [plans, profiles, meals, selections, statuses, weights])
    if (result.error) throw result.error;

  const planById = new Map(rows(plans.data).map((row) => [text(row.id), row]));
  const profileByClient = new Map(rows(profiles.data).map((row) => [text(row.user_id), row]));
  const mealById = new Map(rows(meals.data).map((row) => [text(row.id), row]));

  // The rows the selections point at, and the groups they sit in. Fetched by id
  // rather than by plan so a selection against a meal the coach has since
  // replaced is simply skipped instead of being matched to the wrong row.
  const itemIds = [...new Set(rows(selections.data).map((row) => text(row.meal_item_id)))].filter(Boolean);
  const groupIds = [...new Set(rows(selections.data).map((row) => text(row.group_id)))].filter(Boolean);
  const [items, groups] = itemIds.length
    ? await Promise.all([
        supabase.from("meal_items")
          .select("id,meal_id,group_id,display_quantity,measurement_unit,foods(name)").in("id", itemIds),
        supabase.from("meal_food_groups").select("id,meal_id,group_type").in("id", groupIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (items.error) throw items.error;
  if (groups.error) throw groups.error;
  const itemById = new Map(rows(items.data).map((row) => [text(row.id), row]));
  const groupById = new Map(rows(groups.data).map((row) => [text(row.id), row]));

  const observationsByClient = new Map<string, PortionObservation[]>();
  for (const row of rows(selections.data)) {
    const clientId = text(row.client_id);
    const item = itemById.get(text(row.meal_item_id));
    const group = groupById.get(text(row.group_id));
    if (!item || !group) continue;
    const meal = mealById.get(text(group.meal_id));
    if (!meal) continue;
    const planned = number(item.display_quantity);
    if (!planned || planned <= 0) continue;
    const relation = item.foods;
    const food = Array.isArray(relation) ? relation[0] : relation;
    const list = observationsByClient.get(clientId) ?? [];
    list.push({
      date: text(row.selection_date),
      mealId: text(meal.id),
      mealTitle: text(meal.title),
      groupId: text(group.id),
      groupType: asGroupType(text(group.group_type)),
      foodName: food && typeof food === "object" && "name" in food ? String(food.name) : "מזון",
      unit: text(item.measurement_unit) || "גרם",
      planned,
      reported: number(row.amount_override),
    });
    observationsByClient.set(clientId, list);
  }

  const answersByClient = new Map<string, MealAnswer[]>();
  for (const row of rows(statuses.data)) {
    const meal = mealById.get(text(row.meal_id));
    if (!meal) continue;
    const clientId = text(row.client_id);
    const list = answersByClient.get(clientId) ?? [];
    const status = text(row.status);
    list.push({
      date: text(row.status_date),
      mealId: text(meal.id),
      mealTitle: text(meal.title),
      status: status === "eaten" || status === "not_eaten" || status === "other" ? status : null,
    });
    answersByClient.set(clientId, list);
  }

  const weightsByClient = new Map<string, { date: string; value: number }[]>();
  for (const row of rows(weights.data)) {
    const value = number(row.weight);
    if (!value || value <= 0) continue;
    const clientId = text(row.client_id);
    const list = weightsByClient.get(clientId) ?? [];
    list.push({ date: text(row.date), value });
    weightsByClient.set(clientId, list);
  }

  let created = 0;
  for (const [clientId, planId] of planByClient) {
    const plan = planById.get(planId);
    if (!plan) continue;
    const coachId = text(plan.coach_id);
    if (!coachId) continue;
    const profile = profileByClient.get(clientId);

    const proposals = buildNutritionProposals({
      observations: observationsByClient.get(clientId) ?? [],
      answers: answersByClient.get(clientId) ?? [],
      weights: weightsByClient.get(clientId) ?? [],
      goal: readGoal(text(profile?.nutrition_goal), text(profile?.goal)),
      // The plan's own target is the one being served; the profile's is the
      // fallback for a menu that never carried one.
      calorieTarget: number(plan.calorie_target) ?? number(profile?.calorie_target),
    });
    if (!proposals.length) continue;

    const written = await writeProposals(supabase, {
      coachId, clientId, planId, windowStart, windowEnd: today, proposals,
    });
    if (!written) continue;
    created += written;

    await supabase.rpc("create_in_app_notification", {
      p_recipient_id: coachId,
      p_actor_id: clientId,
      p_category: "nutrition",
      p_type: "coach_message",
      p_title: "התפריט מבקש עדכון",
      p_body: `לפי 14 הימים האחרונים: ${summarizeProposals(proposals)}. ההצעות ממתינות לאישור שלך.`,
      p_href: "/coach/nutrition/proposals",
      p_source_table: "nutrition_adaptation_proposals",
      p_source_id: `${clientId}:${windowStart}`,
      p_dedupe_key: `nutrition-proposals-${clientId}-${windowStart}`,
    });
  }
  return created;
}

/** The proposal as one row. Titles are built here so the screen renders text, not a switch. */
export function proposalRow(proposal: NutritionProposal) {
  if (proposal.kind === "portion")
    return {
      kind: "portion" as const,
      meal_id: proposal.mealId,
      group_id: proposal.groupId,
      title: `${proposal.mealTitle} · ${proposal.foodName}`,
      current_value: proposal.planned,
      proposed_value: proposal.proposed,
      unit: proposal.unit,
      evidence: proposal.evidence,
    };
  if (proposal.kind === "calorie_target")
    return {
      kind: "calorie_target" as const,
      meal_id: null,
      group_id: null,
      title: "יעד הקלוריות היומי",
      current_value: proposal.current,
      proposed_value: proposal.proposed,
      unit: "קל׳",
      evidence: proposal.evidence,
    };
  return {
    kind: "meal_missed" as const,
    meal_id: proposal.mealId,
    group_id: null,
    title: `${proposal.mealTitle} — לא נאכלת`,
    current_value: null,
    proposed_value: null,
    unit: null,
    evidence: proposal.evidence,
  };
}

async function writeProposals(
  supabase: SupabaseClient,
  input: Readonly<{
    coachId: string; clientId: string; planId: string;
    windowStart: string; windowEnd: string;
    proposals: readonly NutritionProposal[];
  }>,
): Promise<number> {
  const payload = input.proposals.map((proposal) => ({
    coach_id: input.coachId,
    client_id: input.clientId,
    meal_plan_id: input.planId,
    window_start: input.windowStart,
    window_end: input.windowEnd,
    ...proposalRow(proposal),
  }));
  // A proposal the coach has already answered is never revived: ignoreDuplicates
  // leaves the reviewed row exactly as it is rather than resetting it to pending.
  const { data, error } = await supabase
    .from("nutrition_adaptation_proposals")
    .upsert(payload, {
      onConflict: "client_id,window_start,kind,group_key",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) throw error;
  return rows(data).length;
}
