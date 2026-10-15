import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("the invalid combined nuts and olives food is retired without breaking existing menus", () => {
  const migration = read("supabase/migrations/20261015163308_hide_invalid_combined_nuts_olives_food.sql");
  assert.match(migration, /catalogue_visible boolean not null default true/);
  assert.match(migration, /where id = 'master-f-001'/);
  assert.match(migration, /catalogue_visible = false/);
  assert.doesNotMatch(migration, /delete from public\.meal_items/);
});

test("every catalogue discovery path excludes retired foods", () => {
  assert.match(read("lib/data/product-repository.ts"), /\.eq\("catalogue_visible", true\)/);
  assert.match(read("lib/nutrition/assign-personalized.ts"), /\.eq\("catalogue_visible", true\)/);
  assert.match(read("app/api/nutrition/analyze-meal/route.ts"), /\.eq\("catalogue_visible", true\)/);
  assert.match(read("app/foods/[id]/page.tsx"), /\.eq\("catalogue_visible",true\)/);
  assert.match(read("app/actions/food-favorites.ts"), /\.eq\("catalogue_visible",true\)/);
});
