import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const migrations = new URL("../supabase/migrations/", import.meta.url);

const productionHistory = [
  "202608310002_remote_history_placeholder.sql",
  "202608310008_test_content_never_reaches_clients.sql",
  "202608310009_client_food_log_rename.sql",
  "202609010001_repair_coffee_drink_category.sql",
  "202609010002_subscription_plans_and_entitlements.sql",
  "202609010003_egg_servings_follow_size.sql",
  "202609020001_cardcom_landing_webhook.sql",
  "202609070001_meal_photos.sql",
  "202609080001_save_meal_draft.sql",
  "202609160004_iherb_barbecue_protein_snack.sql",
  "202609160005_repair_danone_342_after_iherb_collision.sql",
  "202609230006_coach_activity_reviews.sql",
  "202609230007_fix_workout_review_policy.sql",
  "202609240001_food_log_meal_group_scope.sql",
] as const;

test("migration files retain every version already recorded in production", async () => {
  const files = await readdir(migrations);
  const versions = files.map((file) => file.split("_")[0]);
  assert.equal(new Set(versions).size, versions.length, "migration versions must be unique");

  for (const file of productionHistory) {
    assert.ok(files.includes(file), `${file} is recorded in production and must remain in Git`);
    assert.ok((await readFile(new URL(file, migrations), "utf8")).trim().length > 0, `${file} must not be empty`);
  }
});
