import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the migration records three meal states and never lets a skip carry calories", async () => {
  const sql = await source("supabase/migrations/202608100001_meal_day_status.sql");

  assert.match(sql, /create table if not exists public\.meal_day_status/);
  assert.match(sql, /check \(status in \('eaten','not_eaten'\)\)/);
  assert.match(sql, /unique \(client_id, meal_id, status_date\)/);
  assert.match(sql, /alter table public\.meal_day_status enable row level security/);

  // A client owns their own marks; a coach may read them and never write them.
  assert.match(sql, /meal_day_status_client_all[\s\S]*client_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /meal_day_status_coach_read[\s\S]*for select[\s\S]*public\.is_coach_for\(client_id\)/);

  // Anything other than "eaten" deletes the recorded intake for that meal, so a
  // skipped meal cannot contribute to actual calories.
  assert.match(sql, /else[\s\S]*delete from public\.eaten_meal_items/);
  assert.match(sql, /if p_status = 'none' then[\s\S]*delete from public\.meal_day_status/);

  // The pre-existing rule is preserved verbatim.
  assert.match(sql, /select_one_alternative_per_group/);

  // The old entry point still exists so nothing that calls it has to change.
  assert.match(sql, /create or replace function public\.set_meal_eaten/);
  assert.match(sql, /return public\.set_meal_day_status\(p_meal_id, p_date, case when p_eaten then 'eaten' else 'none' end\)/);

  assert.match(sql, /grant execute on function public\.set_meal_day_status\(uuid,date,text\) to authenticated/);
  assert.doesNotMatch(sql, /to\s+anon\b(?![\s\S]*revoke)/);
});

test("the migration ships with a rollback", async () => {
  const rollback = await source("supabase/seeds/meal-day-status-rollback.sql");
  assert.match(rollback, /drop function if exists public\.set_meal_day_status/);
  assert.match(rollback, /drop table if exists public\.meal_day_status/);
  // The rollback restores the previous standalone definition rather than leaving
  // a wrapper pointing at a function it just dropped.
  assert.match(rollback, /create or replace function public\.set_meal_eaten/);
  assert.doesNotMatch(rollback, /return public\.set_meal_day_status/);
});

test("a meal with no groups can be marked eaten, which is what the free-calorie meal needs", async () => {
  const repository = await source("lib/data/product-repository.ts");

  // Completion used to require at least one group, which made the free-calorie
  // meal impossible to close. An explicit mark now wins outright.
  assert.match(repository, /completed: statusByMeal\.get\(meal\.id\) === "eaten"/);
  assert.match(repository, /skipped: statusByMeal\.get\(meal\.id\) === "not_eaten"/);

  // A skip suppresses the inferred completion too.
  assert.match(repository, /statusByMeal\.get\(meal\.id\) !== "not_eaten"/);

  // A missing relation degrades to "unmarked" so the screen survives the window
  // between deploying the code and applying the migration.
  assert.match(repository, /MISSING_RELATION/);
  assert.match(repository, /42P01/);
});

test("the action accepts exactly the three states", async () => {
  const actions = await source("app/actions/product.ts");
  assert.match(actions, /const MEAL_STATUSES = new Set\(\["eaten", "not_eaten", "none"\]\)/);
  assert.match(actions, /set_meal_day_status/);
  assert.match(actions, /invalid_meal_status/);
});

test("only the negative state is red, and the skip needs no dialog", async () => {
  const control = await source("components/client/MealStatusControl.tsx");
  assert.match(control, /pill pill--red[\s\S]*לא נאכל/);
  assert.match(control, /pill pill--green[\s\S]*נאכל/);
  // One form post per state: no confirmation step, no sheet, no free-text field.
  assert.doesNotMatch(control, /window\.confirm|BottomSheet|<textarea/);
  // Skipping is offered even when an alternative has not been chosen.
  assert.match(control, /status="not_eaten"/);
});

test("the coach can see which meals were skipped", async () => {
  const repository = await source("lib/data/product-repository.ts");
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(repository, /skippedMeals: \(menu\?\.meals \?\? \[\]\)\.filter\(\(meal\) => meal\.skipped\)/);
  assert.match(page, /skippedMeals/);
  assert.match(page, /סומנו כלא נאכלו/);
});
