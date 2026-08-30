import { createClient } from "@supabase/supabase-js";

const raw = await new Promise((resolve, reject) => {
  let value = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { value += chunk; });
  process.stdin.on("end", () => resolve(value));
  process.stdin.on("error", reject);
});
const parsed = JSON.parse(raw);
const keys = Array.isArray(parsed) ? parsed : Array.isArray(parsed.keys) ? parsed.keys : Array.isArray(parsed.data) ? parsed.data : [];
const keyValue = (item) => item.api_key ?? item.apiKey ?? item.key ?? item.value;
const serviceKey = keyValue(keys.find((item) => item.name === "service_role" || item.type === "secret"));
if (!serviceKey) throw new Error("Supabase service key was not returned by the CLI.");

const admin = createClient("https://bacxfweisncnpjgiqxcp.supabase.co", serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const checked = async (promise, label) => {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
};

const clients = await checked(
  admin.from("profiles").select("id,full_name").eq("role", "client").ilike("full_name", "%אלי%כהן%"),
  "clients",
);
for (const client of clients) {
  const assignments = await checked(
    admin.from("client_meal_plan_assignments")
      .select("id,meal_plan_id,status,assigned_from,assigned_until,created_at,meal_plans(title)")
      .eq("client_id", client.id)
      .order("assigned_from", { ascending: true }),
    "assignments",
  );
  const logs = await checked(
    admin.from("nutrition_logs")
      .select("id,log_date,assignment_id,meal_plan_id")
      .eq("client_id", client.id)
      .gte("log_date", "2026-08-18")
      .lte("log_date", "2026-08-26")
      .order("log_date", { ascending: true }),
    "nutrition logs",
  );
  const food = await checked(
    admin.from("client_food_log")
      .select("id,log_date,name,source,calories,photo_path,created_at")
      .eq("client_id", client.id)
      .gte("log_date", "2026-08-24")
      .lte("log_date", "2026-08-26")
      .order("created_at", { ascending: true }),
    "food log",
  );
  console.log(JSON.stringify({
    client: client.full_name,
    assignments: assignments.map(({ id: _id, ...row }) => row),
    nutritionLogs: logs.map(({ id: _id, ...row }) => row),
    foodLog: food.map(({ id: _id, photo_path: _path, ...row }) => row),
  }, null, 2));
}
