import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("a client can rename any logged food without changing the shared catalogue", async () => {
  const [action, list, migration] = await Promise.all([
    source("app/actions/food-log.ts"),
    source("components/client/LoggedFoodList.tsx"),
    source("supabase/migrations/202608310009_client_food_log_rename.sql"),
  ]);
  assert.match(action, /export async function renameClientFoodLog/);
  assert.match(action, /rpc\("rename_client_food_log"/);
  assert.match(list, /action=\{renameClientFoodLog\}/);
  assert.match(list, /name="name"/);
  assert.match(migration, /where id = p_id and client_id = auth\.uid\(\)/);
  assert.doesNotMatch(migration, /update public\.foods/);
});
