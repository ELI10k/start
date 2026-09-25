import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const supabase = createClient(
  required("NEXT_PUBLIC_SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const clientEmail = required("E2E_CLIENT_EMAIL").toLowerCase();

const stableUuid = (label) => {
  const hex = createHash("sha256").update(`start-life-fit-review:${label}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const isoDate = (daysAgo = 0) => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

async function findUser(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 100) break;
  }
  throw new Error("The dedicated review client was not found.");
}

const must = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

const client = await findUser(clientEmail);
const clientProfile = must(
  await supabase.from("profiles").select("id,role,status,is_test_account").eq("id", client.id).single(),
  "client profile",
);
if (clientProfile.role !== "client" || clientProfile.status !== "active" || !clientProfile.is_test_account) {
  throw new Error("Refusing to seed an account that is not an active isolated test client.");
}

const relationship = must(
  await supabase
    .from("coach_client_relationships")
    .select("coach_id")
    .eq("client_id", client.id)
    .eq("status", "active")
    .single(),
  "active test relationship",
);
const coachProfile = must(
  await supabase.from("profiles").select("role,status,is_test_account").eq("id", relationship.coach_id).single(),
  "coach profile",
);
if (coachProfile.role !== "coach" || coachProfile.status !== "active" || !coachProfile.is_test_account) {
  throw new Error("Refusing to seed across the test/real account boundary.");
}

must(
  await supabase.from("client_profiles").update({
    goal: "שיפור כושר והרכב גוף",
    target_weight: 78,
    height: 178,
    activity_level: "moderate",
    calorie_target: 2200,
    protein_target: 160,
    notes: "חשבון הדגמה ייעודי לבדיקת App Review בלבד",
  }).eq("user_id", client.id),
  "client profile update",
);

const assignment = must(
  await supabase
    .from("client_meal_plan_assignments")
    .select("id,meal_plan_id")
    .eq("client_id", client.id)
    .eq("status", "active")
    .single(),
  "active meal plan assignment",
);

must(
  await supabase.from("meal_plans").update({
    title: "תפריט אישי — חשבון הדגמה",
    description: "תפריט לדוגמה עבור צוות App Review",
    calorie_target: 2200,
    protein_target: 160,
    carbohydrate_target: 230,
    fat_target: 70,
  }).eq("id", assignment.meal_plan_id),
  "meal plan update",
);

const today = new Date();
const dayIndex = today.getDay();
const meals = [
  { title: "ארוחת בוקר", amount: 200, foodOffset: 0 },
  { title: "ארוחת צהריים", amount: 180, foodOffset: 1 },
  { title: "ארוחת ערב", amount: 150, foodOffset: 2 },
];
const foods = must(
  await supabase.from("foods").select("id,calories,protein,carbs,fat").order("id").limit(3),
  "sample foods",
);
if (foods.length < meals.length) throw new Error("Not enough approved foods to seed the review menu.");

for (const [index, meal] of meals.entries()) {
  const mealId = stableUuid(`meal:${client.id}:${index}`);
  must(
    await supabase.from("meals").upsert({
      id: mealId,
      menu_day_id: null,
      meal_plan_id: assignment.meal_plan_id,
      day_index: dayIndex,
      title: meal.title,
      notes: "דוגמה לצוות הבדיקה",
      sort_order: index,
    }, { onConflict: "id" }),
    `meal ${index + 1}`,
  );
  const food = foods[meal.foodOffset];
  const factor = meal.amount / 100;
  must(
    await supabase.from("meal_items").upsert({
      id: stableUuid(`meal-item:${client.id}:${index}`),
      meal_id: mealId,
      food_id: food.id,
      amount: meal.amount,
      measurement_unit: "g",
      calculated_calories: Number((Number(food.calories) * factor).toFixed(2)),
      calculated_protein: Number((Number(food.protein ?? 0) * factor).toFixed(2)),
      calculated_carbohydrates: Number((Number(food.carbs ?? 0) * factor).toFixed(2)),
      calculated_fat: Number((Number(food.fat ?? 0) * factor).toFixed(2)),
      sort_order: 0,
    }, { onConflict: "id" }),
    `meal item ${index + 1}`,
  );
}

const progressEntries = Array.from({ length: 30 }, (_, index) => ({
  client_id: client.id,
  date: isoDate(29 - index),
  weight: Number((82.4 - index * 0.11).toFixed(2)),
  waist: Number((90.5 - index * 0.08).toFixed(2)),
  chest: Number((104.2 - index * 0.03).toFixed(2)),
  hips: Number((101.4 - index * 0.04).toFixed(2)),
  notes: "נתון הדגמה",
}));
must(
  await supabase.from("progress_entries").upsert(progressEntries, { onConflict: "client_id,date" }),
  "progress history",
);

const checkIns = [28, 21, 14, 7].map((daysAgo, index) => ({
  id: stableUuid(`check-in:${client.id}:${index}`),
  client_id: client.id,
  submitted_at: `${isoDate(daysAgo)}T08:00:00.000Z`,
  adherence: index < 2 ? 4 : 5,
  hunger: 3,
  energy: index < 2 ? 3 : 4,
  sleep: 4,
  training: true,
  notes: "צ׳ק־אין שבועי לדוגמה",
  coach_response: "התקדמות יפה ועקבית. ממשיכים לפי התוכנית.",
  status: "reviewed",
}));
must(await supabase.from("check_ins").upsert(checkIns, { onConflict: "id" }), "check-in history");

must(
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", client.id),
  "archive old test notifications",
);
const notifications = [
  ["nutrition", "meal_plan_assigned", "התפריט האישי שלך מוכן", "התפריט המעודכן זמין לצפייה.", "/nutrition", "app-review-menu"],
  ["workouts", "workout_assigned", "תוכנית האימונים פעילה", "האימון הבא שלך מחכה בעמוד האימונים.", "/workouts", "app-review-workout"],
  ["check_ins", "check_in_reviewed", "הצ׳ק־אין נבדק", "המאמן השאיר לך משוב חדש.", "/check-in/history", "app-review-checkin"],
].map(([category, type, title, body, href, dedupe_key]) => ({
  recipient_id: client.id,
  actor_id: relationship.coach_id,
  category,
  type,
  title,
  body,
  href,
  dedupe_key,
  read_at: null,
  created_at: new Date().toISOString(),
}));
for (const notification of notifications) {
  const existing = must(
    await supabase
      .from("notifications")
      .select("id")
      .eq("recipient_id", client.id)
      .eq("dedupe_key", notification.dedupe_key)
      .maybeSingle(),
    `find ${notification.dedupe_key}`,
  );
  const write = existing
    ? supabase.from("notifications").update(notification).eq("id", existing.id)
    : supabase.from("notifications").insert(notification);
  must(await write, `review notification ${notification.dedupe_key}`);
}

console.log(JSON.stringify({
  isolatedTestAccount: true,
  activeMealPlanPrepared: true,
  mealsPrepared: meals.length,
  progressEntriesPrepared: progressEntries.length,
  checkInsPrepared: checkIns.length,
  unreadNotificationsPrepared: notifications.length,
  secretsPrinted: false,
}, null, 2));
