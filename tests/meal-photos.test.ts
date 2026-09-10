import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("a meal photo is independent from meal status and nutrition totals", async () => {
  const control = await source("components/client/MealStatusControl.tsx");
  const photo = await source("components/client/MealPhotoControl.tsx");
  const actions = await source("app/actions/product.ts");

  assert.match(control, /<MealPhotoControl/);
  assert.doesNotMatch(photo, /setMealStatus|logged_food|calories|protein|carbs|fat/);
  assert.match(photo, /capture="environment"/);
  assert.match(photo, /גלריה/);
  assert.match(photo, /מחיקת התמונה/);
  assert.match(actions, /export async function saveMealPhoto/);
  assert.match(actions, /from\("meal_photos"\)\.upsert/);
  assert.match(actions, /export async function deleteMealPhoto/);
});

test("meal photos are stored once per meal and date with client and coach access", async () => {
  const sql = await source("supabase/migrations/202609070001_meal_photos.sql");
  const page = await source("app/nutrition/page.tsx");

  assert.match(sql, /unique \(client_id, meal_id, photo_date\)/);
  assert.match(sql, /alter table public\.meal_photos enable row level security/);
  assert.match(sql, /meal_photos_client_all/);
  assert.match(sql, /meal_photos_coach_read[\s\S]*public\.is_coach_for\(client_id\)/);
  assert.match(page, /from\("meal_photos"\)/);
  assert.match(page, /createSignedUrls/);
  assert.match(page, /mealPhotoUrl=\{mealPhotoUrls\.get\(meal\.id\)/);
});
