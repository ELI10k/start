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

async function findUserId(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user.id;
    if (data.users.length < 100) break;
  }
  throw new Error("The dedicated review client was not found.");
}

const clientId = await findUserId(clientEmail);
const one = async (table, configure = (query) => query) => {
  const { count, error } = await configure(
    supabase.from(table).select("id", { count: "exact", head: true }),
  );
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
};

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("role,status,is_test_account")
  .eq("id", clientId)
  .single();
if (profileError) throw profileError;

const { data: assignments, error: assignmentError } = await supabase
  .from("client_meal_plan_assignments")
  .select("meal_plan_id")
  .eq("client_id", clientId)
  .eq("status", "active");
if (assignmentError) throw assignmentError;

const activeMealPlanIds = assignments.map((assignment) => assignment.meal_plan_id);
const result = {
  activeTestClient:
    profile.role === "client" && profile.status === "active" && profile.is_test_account === true,
  activeWorkoutAssignments: await one("workout_assignments", (query) =>
    query.eq("client_id", clientId).eq("status", "active"),
  ),
  completedWorkouts: await one("workout_sessions", (query) =>
    query.eq("client_id", clientId).eq("status", "completed"),
  ),
  progressEntries: await one("progress_entries", (query) => query.eq("client_id", clientId)),
  checkIns: await one("check_ins", (query) => query.eq("client_id", clientId)),
  activeMealPlans: activeMealPlanIds.length,
  mealsInActivePlans: activeMealPlanIds.length
    ? await one("meals", (query) => query.in("meal_plan_id", activeMealPlanIds))
    : 0,
  unreadNotifications: await one("notifications", (query) =>
    query.eq("recipient_id", clientId).is("read_at", null),
  ),
};

console.log(JSON.stringify(result, null, 2));
