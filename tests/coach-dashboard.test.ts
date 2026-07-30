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
  assert.match(detailPage, /השלמת היום/);
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
