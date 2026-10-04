import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20261004190000_breads_as_30g_slices.sql",
  import.meta.url,
);

test("all sliced breads use one 30 gram slice", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /where category = 'לחם'/);
  assert.match(migration, /package_unit = 'פרוסה'/);
  assert.match(migration, /unit_weight_grams = 30/);
  assert.match(migration, /serving_label = '1 פרוסה \(30 גרם\)'/);
  assert.match(migration, /calories_per_unit = round\(\(calories \* 0\.3\)::numeric, 0\)/);
});

test("master bread names no longer start with a quantity", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /'master-c-009' then 'פרוסה לחם מלא'/);
  assert.match(migration, /'master-c-010' then 'פרוסה לחם קל מחיטה מלאה'/);
  assert.doesNotMatch(migration, /then '1 פרוסה לחם/);
});
