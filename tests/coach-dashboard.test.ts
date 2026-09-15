import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("coach dashboard uses persisted client data with pagination and no demo adapters", async () => {
  const [repository, listPage, detailPage] = await Promise.all([
    source("lib/data/product-repository.ts"),
    source("app/coach/clients/page.tsx"),
    source("app/coach/clients/[id]/page.tsx"),
  ]);
  assert.match(repository, /listCoachDashboardClients/);
  assert.match(repository, /getCoachClientDashboard/);
  assert.match(repository, /device_sessions/);
  assert.match(repository, /nutrition_logs|eaten_meal_items/);
  assert.match(repository, /workout_sessions/);
  assert.match(listPage, /pageSize/);
  assert.match(listPage, /חיפוש/);
  assert.match(detailPage, /ארוחות שסומנו היום/);
  assert.match(detailPage, /השלמת השבוע/);
  assert.match(detailPage, /צ׳ק־אין/);
  assert.doesNotMatch(`${repository}\n${listPage}\n${detailPage}`, /mockCheckIns|mockWeighIns|createMemoryAdapter/);
});

test("coach dashboard migration grants session visibility only to direct coaches", async () => {
  const sql = await source("supabase/migrations/202607270002_coach_dashboard_read_model.sql");
  assert.match(sql, /devices_coach_assigned_select/);
  assert.match(sql, /public\.is_coach_for\(user_id\)/);
  assert.match(sql, /where revoked_at is null/);
});

test("handled check-ins and workouts leave the coach dashboard queue", async () => {
  const [repository, dashboard, activity, action, migration, nav] = await Promise.all([
    source("lib/data/product-repository.ts"),
    source("app/coach/page.tsx"),
    source("components/workouts/coach/DashboardWorkoutActivity.tsx"),
    source("app/actions/workout-reviews.ts"),
    source("supabase/migrations/202609150001_coach_workout_reviews.sql"),
    source("components/coach/CoachNav.tsx"),
  ]);
  assert.match(repository, /rows\.filter\(\(item\) => !item\.handled_at\)\.slice\(0, 5\)/);
  assert.match(dashboard, /openCheckIns/);
  assert.match(activity, /markWorkoutHandled/);
  assert.match(activity, /if \(result\.ok\) onHandled\(\)/);
  assert.match(activity, /new Set\(\[\.\.\.current, item\.id\]\)/);
  assert.match(activity, /אין אימונים שממתינים לטיפול/);
  assert.match(action, /coach_workout_reviews/);
  assert.match(migration, /public\.is_coach_for\(s\.client_id\)/);
  assert.match(nav, /label: "מעקב לקוחות"/);
});
