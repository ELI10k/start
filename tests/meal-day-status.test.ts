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
  assert.match(repository, /completed: statusByMeal\.get\(meal\.id\)\?\.status === "eaten"/);
  assert.match(repository, /skipped: statusByMeal\.get\(meal\.id\)\?\.status === "not_eaten"/);

  // Any explicit mark suppresses the inferred completion - not only a skip.
  // "Ate something else" must not read as a completed meal either.
  assert.match(repository, /!statusByMeal\.get\(meal\.id\) &&/);

  // A missing relation degrades to "unmarked" so the screen survives the window
  // between deploying the code and applying the migration.
  assert.match(repository, /MISSING_RELATION/);
  assert.match(repository, /42P01/);
});

test("the action accepts exactly the four states, and only 'other' carries a note", async () => {
  const actions = await source("app/actions/product.ts");
  assert.match(actions, /const MEAL_STATUSES = new Set\(\["eaten", "not_eaten", "other", "none"\]\)/);
  assert.match(actions, /set_meal_day_status/);
  assert.match(actions, /invalid_meal_status/);
  // A substitution without a description is the old "not eaten" in disguise: it
  // records that the plan was missed and nothing about what replaced it.
  assert.match(actions, /substitution_requires_note/);
  assert.match(actions, /p_note: status === "other" \? note : null/);
});

test("only the negative state is red, and eating and skipping need no dialog", async () => {
  const control = await source("components/client/MealStatusControl.tsx");
  assert.match(control, /pill pill--red[\s\S]*לא נאכל/);
  assert.match(control, /pill pill--green[\s\S]*נאכל/);
  assert.match(control, /pill pill--green">נאכל משהו אחר/);
  // "Eaten" and "not eaten" are still one post each - no confirmation step.
  assert.doesNotMatch(control, /window\.confirm/);
  // Skipping is offered even when an alternative has not been chosen.
  assert.match(control, /status="not_eaten"/);
  // The substitution is the one state that asks a question, because it is the
  // one state that carries an answer. It now asks it in three ways - a
  // sentence, a barcode or a photograph - so the sheet lives in its own
  // component and the control opens it.
  assert.match(control, /<AteSomethingElse/);
  assert.match(control, /setSubstituting\(true\)/);
});

test("a catalogued substitute turns the meal green and replaces only its meal group", async () => {
  const [page, groupSubstitution, sheet, action, migration] = await Promise.all([
    source("app/nutrition/page.tsx"),
    source("components/client/MealGroupSubstitution.tsx"),
    source("components/client/AteSomethingElse.tsx"),
    source("app/actions/food-log.ts"),
    source("supabase/migrations/202609240001_food_log_meal_group_scope.sql"),
  ]);
  assert.match(page, /loggedMealCalories \+ \(meal\.status === "other" \? retainedMealCalories : 0\)/);
  assert.match(page, /קלוריות לא נמדדו/);
  assert.match(page, /meal\.status === "other" \|\| meal\.status === "eaten"/);
  assert.match(page, /<LoggedFoodList entries=\{mealLogs\}/);
  assert.doesNotMatch(groupSubstitution, /preserveMealStatus/);
  assert.match(groupSubstitution, /mealGroupId=\{mealGroupId\}/);
  assert.match(sheet, /name="mealGroupId"/);
  assert.match(action, /log_client_food_scoped/);
  assert.match(action, /p_meal_group_id: uuid\(form\.get\("mealGroupId"\)\)/);
  assert.match(migration, /meal_group_id uuid references public\.meal_food_groups/);
  assert.match(migration, /g\.id = p_meal_group_id and g\.meal_id = p_meal_id/);
  assert.match(sheet, /שם המאכל שיופיע בארוחה/);
  assert.match(sheet, /defaultValue=\{grams\}/);
  assert.match(sheet, /const scheduleGrams=.*window\.setTimeout\(\(\)=>commitGrams\(value\),450\)/s);
  assert.match(sheet, /type="text" inputMode="decimal"/);
  assert.doesNotMatch(sheet, /\[50,100,150,200,250,300\]/);
  assert.match(sheet, /שינוי מוצר/);
});

test("a prescribed meal can be saved without tapping every default again", async () => {
  const page = await source("app/nutrition/page.tsx");
  const actions = await source("app/actions/product.ts");
  assert.match(page, /blocked=\{false\}/);
  assert.doesNotMatch(actions, /if \(!selected\.size\) throw/);
  assert.doesNotMatch(actions, /p_quantity: 0/);
  assert.match(actions, /Fill missing selections with the primary/);
});

test("menu food names can be changed without renaming the shared catalogue", async () => {
  const [migration, editor, repository] = await Promise.all([
    source("supabase/migrations/202609160001_menu_item_custom_names.sql"),
    source("components/coach/menus/PersistentMenuEditor.tsx"),
    source("lib/data/product-repository.ts"),
  ]);
  assert.match(migration, /add column if not exists custom_name text/);
  assert.match(migration, /meal_plan_not_owned/);
  assert.match(editor, /customName:item\.customName\?\.trim\(\)/);
  assert.match(editor, /שם שיוצג במקום/);
  assert.match(repository, /item\.custom_name\.trim\(\)/);
});

test("tapping the selected meal item again clears it", async () => {
  const page = await source("app/nutrition/page.tsx");
  const actions = await source("app/actions/product.ts");
  assert.match(page, /name="selected" value=\{group\.selectedItemId===item\.id\?"true":"false"\}/);
  assert.match(page, /לחיצה נוספת מבטלת בחירה/);
  assert.match(actions, /meal_group_selections"\)\.delete\(\)/);
  assert.match(actions, /refresh_meal_intake/);
});

test("saying what was eaten instead offers all three ways", async () => {
  const sheet = await source("components/client/AteSomethingElse.tsx");
  // Text and photos are estimated by AI; catalogue and barcode values stay
  // deterministic. All four entry paths therefore count in today's totals.
  assert.match(sheet, /source="text"|setTab\("text"\)/);
  assert.match(sheet, /setTab\("scan"\)/);
  assert.match(sheet, /setTab\("photo"\)/);
  assert.match(sheet, /\/api\/foods\/barcode\//);
  // Scans explain their deterministic count; text/photo explain their estimate.
  assert.match(sheet, /הערכים האלה כן ייספרו ביום שלך/);
  assert.match(sheet, /ה־AI יעריך קלוריות ואבות מזון/);
  assert.match(sheet, /name="photo"/);
  assert.match(sheet, /name="cameraPhoto"/);
  assert.match(sheet, /בחירה מהגלריה/);
  assert.match(sheet, /פתיחת מצלמה/);
  assert.match(sheet, /formRef\.current\?\.reset\(\)/);
  assert.match(sheet, /setCode\(""\)/);
  // A catalogue product opens at its known unit/package weight, so a 200 g
  // yoghurt cup is not silently logged as the generic 100 g fallback.
  assert.match(sheet, /selected\?\.unitWeightGrams/);
  assert.match(sheet, /String\(Math\.round\(selected\.unitWeightGrams\)\)/);
  // The selected catalogue item is easy to replace and is transient: closing
  // the sheet must not restore the previous product on the next opening.
  assert.match(sheet, /שינוי מוצר/);
  assert.match(sheet, /setPickedId\(""\)/);
  assert.match(sheet, /setGrams\("100"\)/);
});

test("the coach can see which meals were skipped", async () => {
  const repository = await source("lib/data/product-repository.ts");
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(repository, /skippedMeals: \(menu\?\.meals \?\? \[\]\)\.filter\(\(meal\) => meal\.skipped\)/);
  assert.match(page, /skippedMeals/);
  assert.match(page, /סומנו כלא נאכלו/);
});
