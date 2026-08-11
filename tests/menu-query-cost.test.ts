import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The saved-menu screen died with 57014 under concurrency. The cause was two
// generations of permissive RLS policy stacked on the same tables, which
// Postgres ORs together - so every read paid for a dead three-table join as well
// as the live one. These tests keep the fix from being undone.

test("the legacy menus/menu_days policies are retired from the hot tables", async () => {
  const migration = await source("supabase/migrations/202608110006_retire_legacy_menu_policies.sql");
  for (const policy of ["meals_visible", "meals_coach_write", "meal_items_visible", "meal_items_coach_write"]) {
    assert.match(migration, new RegExp(`drop policy if exists ${policy} on public\\.`), `${policy} is not retired`);
  }
  // Access is unchanged: the plan-based policies still grant the owning coach
  // and the actively assigned client.
  const nutrition = await source("supabase/migrations/202607200007_nutrition_persistence.sql");
  assert.match(nutrition, /create policy meals_plan_visible on public\.meals for select to authenticated/);
  assert.match(nutrition, /create policy meal_items_plan_visible on public\.meal_items for select to authenticated/);
  assert.match(nutrition, /create policy meal_items_plan_coach_write on public\.meal_items for all to authenticated/);
});

test("every surviving nutrition policy wraps auth.uid() so it is not re-run per row", async () => {
  const nutrition = await source("supabase/migrations/202607200007_nutrition_persistence.sql");
  const groups = await source("supabase/migrations/202607290003_meal_food_groups.sql");
  for (const [name, text] of [["nutrition", nutrition], ["meal groups", groups]] as const) {
    // Only the policy predicates matter. A bare auth.uid() inside a `using` or
    // `with check` is re-evaluated for every row; the wrapped form is a stable
    // initplan, evaluated once. Inside a function body - which this file also
    // has plenty of - bare is correct and is left alone.
    const predicates = text.split("\n").filter((line) => /\b(using|with check)\s*\(/.test(line));
    const bare = predicates.filter((line) => /(?<!select )auth\.uid\(\)/.test(line));
    assert.deepEqual(bare, [], `${name} migration has policy predicates calling auth.uid() per row`);
  }
});

test("nothing in the app reads the retired menus schema", async () => {
  // If it did, dropping those policies would have taken access with it.
  for (const path of [
    "lib/data/product-repository.ts",
    "app/coach/menus/new/page.tsx",
    "app/coach/menus/[id]/page.tsx",
  ]) {
    const text = await source(path);
    // Word-bounded: free_menu_day_id is a different, live table.
    assert.doesNotMatch(text, /\bmenu_day_id\b|from\("menu_days"\)|from\("menus"\)/, `${path} still reads the retired schema`);
  }
});

test("the groups read is indexed the way the screen queries it", async () => {
  const migration = await source("supabase/migrations/202608110006_retire_legacy_menu_policies.sql");
  // The screen selects by meal_id and orders by sort_order.
  assert.match(migration, /create index if not exists meal_food_groups_meal_order_idx\s+on public\.meal_food_groups\(meal_id, sort_order\)/);
});

test("the policy verifier is service-role only", async () => {
  const migration = await source("supabase/migrations/202608110006_retire_legacy_menu_policies.sql");
  assert.match(migration, /create or replace function public\.start_list_policies/);
  // The list of policies describes the security model; it is not for clients.
  assert.match(migration, /revoke all on function public\.start_list_policies\(text\[\]\) from public, anon, authenticated/);
});

test("the menu screen still loads only what it renders", async () => {
  const repository = await source("lib/data/product-repository.ts");
  // Items and groups go out together rather than one after the other.
  assert.match(repository, /await Promise\.all\(\[\s*supabase\.from\("meal_items"\)/);
  // And a menu with no meals skips both round trips entirely.
  assert.match(repository, /: \[\{ data: \[\], error: null \}, \{ data: \[\], error: null \}\]/);
});
