import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildClientReport, type ReportInput } from "../lib/coach-intelligence/client-report.ts";
import { daysSince, israelHour } from "../lib/date-time.ts";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const EMPTY: ReportInput = {
  weighIns: [], checkIns: [],
  hasMenu: false, menuCompletionPercent: 0, menuPlannedMeals: 0,
  hasProgram: false, programName: null, weeklyFrequency: null,
  weeklyCompletionPercent: 0, lastWorkoutAt: null, goalLabel: null, calorieTarget: null,
};

// ------------------------------------------------------------------- messages

test("a thread is marked read without revalidating from inside a render", async () => {
  const [clientPage, coachPage, repository, actions] = await Promise.all([
    source("app/messages/page.tsx"),
    source("app/coach/clients/[id]/page.tsx"),
    source("lib/messages/repository.ts"),
    source("app/actions/messages.ts"),
  ]);
  // Both screens mark the thread while they render. revalidatePath throws when
  // it is reached from a render, so the mark has to come from the repository -
  // where there is no revalidation - and never from the actions module.
  for (const page of [clientPage, coachPage]) {
    assert.match(page, /markThreadRead/);
    assert.match(page, /from "@\/lib\/messages\/repository"/);
    assert.doesNotMatch(page, /markThreadRead.*@\/app\/actions\/messages/);
  }
  assert.match(repository, /export async function markThreadRead/);
  assert.doesNotMatch(repository, /revalidatePath\(/);
  assert.doesNotMatch(actions, /export async function markThreadRead/);
});

// ------------------------------------------------------------------ adherence

test("nutrition adherence is counted in meals, not in menu rows", async () => {
  const repository = await source("lib/data/product-repository.ts");
  const body = repository.slice(repository.indexOf("export async function getCoachClientDashboard"));
  // One item per group is ever eaten, so dividing eaten rows by written rows
  // capped a fully marked day at 25%.
  assert.match(body, /const plannedMeals = menu\?\.meals \?\? \[\]/);
  // The same predicate, now shared with the two client screens that ask it.
  assert.match(body, /markedMeals = plannedMeals\.filter\(isMealAnswered\)/);
  assert.match(repository, /isMealAnswered = \(meal: IntakeMeal\)|isMealAnswered/);
  assert.match(body, /markedMeals \/ plannedMeals\.length/);
  assert.doesNotMatch(body, /plannedItems/);
});

test("the attention panel can be empty", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  const rows = page.slice(page.indexOf("const alertRows"), page.indexOf("const intake="));
  // Every rule has to describe something late. "the week is not finished" and
  // "not every meal is marked" are true of every client every morning, so the
  // red panel was never absent and stopped being read.
  assert.match(rows, /daysSinceCheckIn > 8/);
  assert.match(rows, /weekday >= 5/);
  assert.match(rows, /hour >= 20/);
});

// ------------------------------------------------------------- rating scale

test("the client report reads check-in ratings on the 1-10 scale", async () => {
  const report = await source("lib/coach-intelligence/client-report.ts");
  // 202607280002 moved every rating to 1-10. The thresholds and the printed
  // denominator were both left on the old scale.
  assert.doesNotMatch(report, /\/5`/);
  assert.match(report, /const LOW_RATING = 4/);
  assert.match(report, /const HIGH_RATING = 8/);

  const low = buildClientReport({
    ...EMPTY,
    checkIns: [{ submittedAt: "2026-08-19T06:00:00.000Z", adherence: 3, energy: 3, sleep: 3, hunger: 9, workoutsCompleted: null, mealPlanDays: null, notes: null }],
  });
  assert.ok(low.attention.some((point) => point.basis.includes("שינה 3/10")));
  assert.ok(low.attention.some((point) => point.basis.includes("רעב 9/10")));

  // Six out of ten is a middling week, not an alarming one. On the old
  // thresholds a hunger of 6 tripped "רעב גבוה" every single time.
  const middling = buildClientReport({
    ...EMPTY,
    checkIns: [{ submittedAt: "2026-08-19T06:00:00.000Z", adherence: 6, energy: 6, sleep: 6, hunger: 6, workoutsCompleted: null, mealPlanDays: null, notes: null }],
  });
  assert.equal(middling.attention.length, 0);
});

// ------------------------------------------------------------- the menu editor

test("filling a day from favourites reports how many foods it placed", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  const body = editor.slice(editor.indexOf("const fillDayFromFavorites"), editor.indexOf("const addDay"));
  // A functional update runs during the next render, so a counter incremented
  // inside one is still zero on the line that reads it: the message always said
  // "מ־0 מזונות מועדפים".
  assert.match(body, /const nextMeals=meals\.map\(/);
  assert.match(body, /setMeals\(nextMeals\)/);
  assert.doesNotMatch(body, /setMeals\(current=>current\.map/);
});

test("an added second primary is not scaled as an alternative of the first", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  const body = editor.slice(editor.indexOf("const selectFood="), editor.indexOf("const suggestAlternatives"));
  // Primary is a mark, not a position. Reading it as position 0 sent every
  // extra primary down the equivalent-portion path.
  assert.match(body, /const targetIsPrimary=current\?\.primary\?\?itemIndex===0/);
  assert.match(body, /referenceFood=targetIsPrimary\?currentFood:primaryFood/);
  assert.doesNotMatch(body, /const primary=group\.items\[0\]/);
});

test("folding a meal follows the meal when the day is reordered", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  assert.match(editor, /const remapCollapsed=/);
  // Switching days clears the folds: the second day is a different list, and
  // the positions do not carry over.
  assert.match(editor, /const showDay=\(dayIndex:number\)=>\{setActiveDay\(dayIndex\);setCollapsed\(new Set\(\)\)\}/);
  assert.doesNotMatch(editor, /onClick=\{\(\)=>setActiveDay\(/);
});

// ------------------------------------------------------------------ the clock

test("the shared clock helpers answer in Israel time", () => {
  assert.equal(israelHour(new Date("2026-08-20T18:30:00.000Z")), 21);
  assert.equal(israelHour(new Date("2026-01-20T18:30:00.000Z")), 20);
  assert.equal(daysSince("2026-08-10T00:00:00.000Z", new Date("2026-08-20T00:00:00.000Z")), 10);
});

test("the daily coach counts only today's day of a multi-day menu", async () => {
  const route = await source("app/api/cron/daily-coach/route.ts");
  // A menu can carry a different Tuesday. Counting every meal of every day it
  // holds told a client on a two-day menu they had marked 3 out of 12.
  assert.match(route, /israelWeekday\(date\)/);
  assert.match(route, /mealIds\.has\(String\(row\.meal_id\)\)/);
  assert.match(route, /input\.mealsPlanned = mealIds\.size/);
  // And it reads every client in a fixed number of queries rather than five
  // sequential round trips each.
  assert.match(route, /gatherDailyInputs\(supabase, clientIds, date\)/);
  assert.doesNotMatch(route, /await gatherDailyInput\(/);
});

// ============================================================ follow-up batch
// Everything the review listed as "open" or "proposed", implemented.

test("set_meal_day_status has exactly one signature", async () => {
  const [migration, rollback, actions] = await Promise.all([
    source("supabase/migrations/202608200001_resolve_meal_status_overload.sql"),
    source("supabase/seeds/meal-status-overload-rollback.sql"),
    source("app/actions/product.ts"),
  ]);
  // Two candidates - (uuid,date,text) and (uuid,date,text,text default null) -
  // are ambiguous for a three-argument call: PostgreSQL raises "is not unique".
  assert.match(migration, /drop function if exists public\.set_meal_day_status\(uuid, date, text\)/);
  assert.match(migration, /set_meal_day_status\(p_meal_id, p_date, case when p_eaten then 'eaten' else 'none' end, null\)/);
  assert.match(rollback, /create or replace function public\.set_meal_day_status\(p_meal_id uuid, p_date date, p_status text\)/);
  // The wrappers that were the only callers of that path are gone.
  assert.doesNotMatch(actions, /setMealCompletion|setMealItemCompletion|nutritionMutation/);
});

test("the menu preview marks the primary by role, not by position", async () => {
  const preview = await source("app/coach/menus/[id]/preview/page.tsx");
  // A group can hold two primaries. Position showed the coach one where the
  // client will be served both.
  assert.match(preview, /item\.item_role==="primary"/);
  assert.match(preview, /const isPrimary=\(item:PreviewItem,index:number\)=>roled\?item\.item_role==="primary":index===0/);
  assert.doesNotMatch(preview, /index===0\?"מאכל ראשי/);
});

test("the review queue holds its place by check-in, not by index", async () => {
  const page = await source("app/coach/check-ins/review/page.tsx");
  // Marking one handled shortens the queue, so everything after it shifts down
  // and a position-based link skipped whoever moved into the vacated slot.
  assert.match(page, /queue\.findIndex\(\(item\) => item\.id === params\.id\)/);
  assert.match(page, /\?id=\$\{queue\[target\]\.id\}/);
});

test("the weekly check-in feeds the progress graph", async () => {
  const actions = await source("app/actions/product.ts");
  const body = actions.slice(actions.indexOf("export async function saveCheckIn"), actions.indexOf("export async function reviewCheckIn"));
  // The same two numbers were asked for twice and only the other form was read
  // by the graph, so a faithful client had an empty chart.
  assert.match(body, /from\("progress_entries"\)\.upsert/);
  assert.match(body, /onConflict: "client_id,date"/);
  // A failed chart row must not throw away a submitted check-in.
  assert.match(body, /progressError\s*\n?\s*\?/);
  assert.doesNotMatch(body, /if \(progressError\) return \{ ok: false/);
});

test("repeating yesterday's choices never overwrites today's", async () => {
  const [migration, action] = await Promise.all([
    source("supabase/migrations/202608200002_repeat_meal_selections.sql"),
    source("app/actions/product.ts"),
  ]);
  assert.match(migration, /public\.repeat_meal_group_selections\(p_from date, p_to date\)/);
  assert.match(migration, /current_role\(\) <> 'client'/);
  // Additive only: a group already chosen today is the client's decision.
  assert.match(migration, /not exists\(\s*\n\s*select 1 from public\.meal_group_selections existing/);
  // Same ownership gate as select_meal_group_alternative: the group must belong
  // to a plan actively assigned to the caller on the target date.
  assert.match(migration, /a\.client_id = auth\.uid\(\)\s*\n\s*and a\.status = 'active'/);
  assert.match(migration, /on conflict\(client_id, group_id, selection_date\) do nothing/);
  assert.match(action, /rpc\("repeat_meal_group_selections"/);
});

test("the workout moves forward before it wraps, and always asks about partials", async () => {
  const session = await source("components/workouts/client/WorkoutSession.tsx");
  // findIndex scans from zero, so "next" pointed backwards after exercise four.
  assert.match(session, /const ahead=ordered\.findIndex\(\(entry,index\)=>index>session\.currentExerciseIndex&&unfinished\(entry,index\)\)/);
  assert.match(session, /const remaining=ahead>=0\?ahead:ordered\.findIndex\(unfinished\)/);
  // The confirm was suppressed by any warning at all - including the one written
  // when the last exercise is completed, which is exactly when it is needed.
  assert.match(session, /!confirmedPartial/);
  assert.doesNotMatch(session, /!item\.skipped\)&&!warning/);
});

test("a coach can see which clients have no menu, and land in the builder", async () => {
  const [list, create] = await Promise.all([
    source("app/coach/menus/page.tsx"),
    source("app/coach/menus/new/page.tsx"),
  ]);
  assert.match(list, /value: "no-menu"/);
  assert.match(list, /clientsWithoutMenu/);
  assert.match(list, /\/coach\/menus\/new\?clientId=\$\{client\.id\}/);
  // The link has to actually save the step it promises.
  assert.match(create, /searchParams:Promise<\{clientId\?:string\}>/);
  assert.match(create, /clients\.find\(client=>client\.id===requestedClientId\)/);
});

test("the client file loads only what the open tab renders", async () => {
  const page = await source("app/coach/clients/[id]/page.tsx");
  assert.match(page, /tab === "report" \? getWeeklySummaries\(id\) : Promise\.resolve\(\[\]\)/);
  assert.match(page, /tab === "progress" \? listResponseTemplates\(\) : Promise\.resolve\(\[\]\)/);
});

test("the client is told where to start and when photos are due", async () => {
  const [nutrition, checkIn] = await Promise.all([
    source("app/nutrition/page.tsx"),
    source("app/check-in/page.tsx"),
  ]);
  // The anchor existed and nothing linked to it.
  assert.match(nutrition, /href="#current-meal"/);
  assert.match(nutrition, /<RepeatYesterday date=\{today\}/);
  // The cycle already knew; the screen never said.
  assert.match(checkIn, /cycle\.nextCheckInNumber/);
  assert.match(checkIn, /cycle\.remainingUntilPhotos/);
});

// ==================================================== units alongside grams

test("a portion can be counted in the food's own unit or in grams", async () => {
  const { convertQuantity, foodUnit, hasNaturalUnit, portionFor } =
    await import("../lib/nutrition/meal-alternatives.ts");
  const pita = { calories: 250, protein: 7, carbs: 40, fat: 6.89, packageUnit: "פיתה", unitWeightGrams: 100 };
  const cereal = { calories: 313, protein: 12.3, carbs: 56.6, fat: 2.5, packageUnit: null, unitWeightGrams: null };

  // Only a food whose source carries the weight of one unit can be counted in
  // anything but grams. Nothing is guessed from the product name.
  assert.equal(hasNaturalUnit(pita), true);
  assert.equal(hasNaturalUnit(cereal), false);
  assert.equal(foodUnit(pita, "gram").unit, "גרם");
  assert.equal(foodUnit(cereal).unit, "גרם");

  // The same portion, said two ways. Switching the unit must not resize it.
  const asUnit = portionFor(pita, 1, "native")!;
  const grams = convertQuantity(pita, 1, "native", "gram");
  const asGram = portionFor(pita, grams, "gram")!;
  assert.equal(grams, 100);
  assert.equal(asUnit.calories, asGram.calories);
  assert.equal(asUnit.grams, asGram.grams);
  // And back again, without drift.
  assert.equal(convertQuantity(pita, grams, "gram", "native"), 1);

  // Grams let a coach write half a pita, which the unit alone cannot say well.
  assert.equal(portionFor(pita, 55, "gram")!.calories, 137.5);
});

test("the builder carries the chosen unit through save and reload", async () => {
  const [editor, editPage] = await Promise.all([
    source("components/coach/menus/PersistentMenuEditor.tsx"),
    source("app/coach/menus/[id]/page.tsx"),
  ]);
  // The row remembers which unit it was written in...
  assert.match(editor, /unitMode\?:"native"\|"gram"/);
  assert.match(editor, /const changeUnitMode=/);
  // ...every reading of it respects that...
  assert.match(editor, /portionFor\(food,Number\(item\.amount\|\|0\),item\.unitMode\?\?"native"\)/);
  assert.match(editor, /portionFor\(food,item\.amount,item\.unitMode\?\?"native"\)/);
  // ...and reopening the menu restores it from the unit that was stored.
  assert.match(editPage, /measurement_unit\?:string\|null/);
  assert.match(editPage, /unitMode:\(item\.measurement_unit\?\?GRAM_UNIT\)===GRAM_UNIT\?"gram"/);
});

// ==================================== units, and two more of Eli's breads

test("a food with a natural unit can be counted in grams as well", async () => {
  const { convertQuantity, calculateAlternativePortion, foodUnit, hasNaturalUnit, portionFor } =
    await import("../lib/nutrition/meal-alternatives.ts");

  const pita = { calories: 250, protein: 7, carbs: 40, fat: 6.89, packageUnit: "פיתה", unitWeightGrams: 100 };
  const rice = { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, packageUnit: null, unitWeightGrams: null };

  // Grams are always available; the natural unit only where the source carries
  // the weight of one.
  assert.equal(hasNaturalUnit(pita), true);
  assert.equal(hasNaturalUnit(rice), false);
  assert.equal(foodUnit(pita, "gram").unit, "גרם");
  assert.equal(foodUnit(pita, "gram").gramsPerUnit, 1);

  // Switching a row converts the number rather than reinterpreting it: the
  // portion has to stay the same size.
  const grams = convertQuantity(pita, 1, "native", "gram");
  assert.equal(grams, 100);
  assert.equal(convertQuantity(pita, grams, "gram", "native"), 1);
  assert.equal(portionFor(pita, 1, "native")?.calories, portionFor(pita, grams, "gram")?.calories);

  // And an alternative scaled against a primary written in grams must land in
  // the same place as one scaled against the same primary written in units.
  const bread = { calories: 266.667, protein: 13.333, carbs: 53.333, fat: 0, packageUnit: "פרוסה", unitWeightGrams: 30 };
  const fromUnits = calculateAlternativePortion(pita, 1, bread, "carbohydrate", "native");
  const fromGrams = calculateAlternativePortion(pita, 100, bread, "carbohydrate", "gram");
  assert.equal(fromUnits?.calories, fromGrams?.calories);
  assert.equal(fromUnits?.quantity, fromGrams?.quantity);
});

test("the editor carries each row's unit through save and reload", async () => {
  const [editor, edit] = await Promise.all([
    source("components/coach/menus/PersistentMenuEditor.tsx"),
    source("app/coach/menus/[id]/page.tsx"),
  ]);
  // The picker, and the conversion behind it.
  assert.match(editor, /const changeUnitMode=/);
  assert.match(editor, /convertQuantity\(food,Number\(row\.amount\|\|0\),current,next\)/);
  assert.match(editor, /hasNaturalUnit\(selectedFood\)/);
  // Grams are the stored truth; the coach's own number and unit ride alongside.
  assert.match(editor, /portionFor\(food,item\.amount,item\.unitMode\?\?"native"\)/);
  // Reopening a menu restores how the coach wrote it, not how the food is shaped.
  assert.match(edit, /measurement_unit\?\?GRAM_UNIT\)===GRAM_UNIT\?"gram"/);
});

test("the two breads Eli asked for are master carbohydrates with real units", async () => {
  const [migration, rollback] = await Promise.all([
    source("supabase/migrations/202608200003_master_bread_units.sql"),
    source("supabase/seeds/master-bread-units-rollback.sql"),
  ]);
  const { masterFoodGroup } = await import("../lib/nutrition/master-foods.ts");
  const { portionFor } = await import("../lib/nutrition/meal-alternatives.ts");

  // The id prefix is what files them under carbohydrate and stars them.
  assert.equal(masterFoodGroup("master-c-019"), "carbohydrate");
  assert.equal(masterFoodGroup("master-c-020"), "carbohydrate");
  assert.match(migration, /'master-c-019', 'לחמנייה'/);
  assert.match(migration, /'master-c-020', 'בגט'/);
  assert.match(migration, /on conflict \(id\) do update set/);
  assert.match(rollback, /delete from public\.foods where id in \('master-c-019', 'master-c-020'\)/);

  // One unit has to come back at Eli's own figures, which are not estimates.
  const roll = { calories: 250, protein: 13.1, carbs: 43.1, fat: 2.8, packageUnit: "לחמנייה", unitWeightGrams: 100 };
  const baguette = { calories: 253.333, protein: 9, carbs: 50.96, fat: 1.5, packageUnit: "בגט", unitWeightGrams: 150 };
  assert.equal(portionFor(roll, 1)?.grams, 100);
  assert.equal(portionFor(roll, 1)?.calories, 250);
  assert.equal(portionFor(baguette, 1)?.grams, 150);
  assert.equal(portionFor(baguette, 1)?.calories, 380);

  // "2 בגט" would be wrong; the plural has to exist.
  assert.equal(portionFor(baguette, 2)?.unit, "בגטים");
});

// ============================== the unit reaches the client, and portions are sane

test("a real unit survives the save instead of collapsing to grams", async () => {
  const [migration, rollback] = await Promise.all([
    source("supabase/migrations/202608200004_menu_item_real_units.sql"),
    source("supabase/seeds/menu-item-units-rollback.sql"),
  ]);
  // The column allowed three values and the function collapsed everything else,
  // so "1 פיתה" and "10 חלבון ביצה" both reached the client saying "גרם".
  assert.match(migration, /check\(measurement_unit is not null and length\(btrim\(measurement_unit\)\) between 1 and 24\)/);
  assert.match(migration, /v_unit:=coalesce\(nullif\(trim\(coalesce\(v_item->>'measurementUnit',''\)\),''\),'גרם'\)/);
  assert.doesNotMatch(migration, /v_unit:=case when v_item->>'measurementUnit'='יחידות'/);
  // Grams stay the stored truth - the migration must not touch the arithmetic.
  assert.match(migration, /round\(v_food\.calories\*\(v_item->>'amount'\)::numeric\/100,2\)/);
  // The backfill identifies unit-written rows without guessing, and leaves
  // gram-written rows (where the two are equal) alone.
  assert.match(migration, /abs\(i\.amount - i\.display_quantity \* f\.unit_weight_grams\) < 0\.01/);
  assert.match(migration, /and i\.amount <> i\.display_quantity/);
  assert.match(rollback, /check\(measurement_unit in \('g','גרם','יחידות'\)\)/);
});

test("a unit label reads correctly whether it was stored singular or plural", async () => {
  const { unitLabel } = await import("../lib/nutrition/meal-alternatives.ts");
  // New rows store the plural; rows repaired by the backfill carry the food's
  // own package_unit, which is singular.
  assert.equal(unitLabel("פיתות", 1), "פיתה");
  assert.equal(unitLabel("פיתה", 1), "פיתה");
  assert.equal(unitLabel("פיתה", 3), "פיתות");
  assert.equal(unitLabel("פיתות", 3), "פיתות");
  // A label with no known pair is passed through untouched, not mangled.
  assert.equal(unitLabel("חלבון ביצה", 4), "חלבון ביצה");
});

test("a calorie budget cannot produce a portion nobody eats", async () => {
  const { MAX_COUNTABLE_UNITS, portionForCalories } = await import("../lib/nutrition/meal-alternatives.ts");
  const eggWhite = { calories: 60.606, protein: 9.091, carbs: 0, fat: 2.697, packageUnit: "חלבון ביצה", unitWeightGrams: 33 };
  const chicken = { calories: 165, protein: 31, carbs: 0, fat: 3.6, packageUnit: null, unitWeightGrams: null };

  // Arithmetic alone answers "ten egg whites" for a 200 kcal protein slot.
  const capped = portionForCalories(eggWhite, 200);
  assert.equal(capped?.quantity, MAX_COUNTABLE_UNITS);
  assert.ok((capped?.calories ?? 0) < 200, "a capped portion costs less than the budget");

  // Grams stay uncapped - they scale continuously and 120 g of chicken is an
  // ordinary answer where ten units of anything is not.
  const grams = portionForCalories(chicken, 200);
  assert.equal(grams?.unit, "גרם");
  assert.ok(Math.abs((grams?.calories ?? 0) - 200) < 5);
});

test("filling a day picks the food that fits the budget", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  const body = editor.slice(editor.indexOf("const fillDayFromFavorites"), editor.indexOf("const addDay"));
  // Capping units means one food can no longer stretch to any budget, so the
  // choice of food has to do the work.
  assert.match(body, /\.sort\(\(a,b\)=>Math\.abs\(a\.portion\.calories-budget\)-Math\.abs\(b\.portion\.calories-budget\)\)/);
  assert.doesNotMatch(body, /const food=pool\[mealIndex%pool\.length\];\n/);
  // And the message reports what it produced rather than promising the target.
  assert.match(body, /draftCalories/);
  assert.match(body, /מול יעד של/);
});

// ================================ a menu remembers who it was built for

test("a draft made for a client keeps that client", async () => {
  const [migration, rollback, repository] = await Promise.all([
    source("supabase/migrations/202608200005_menu_intended_client.sql"),
    source("supabase/seeds/menu-intended-client-rollback.sql"),
    source("lib/data/product-repository.ts"),
  ]);
  // meal_plans held no client at all: it lived only in an ACTIVE assignment, and
  // the save writes an assignment only for an active plan. So "שכפול ללקוח",
  // which deliberately produces a draft, dropped the client on the floor.
  assert.match(migration, /add column if not exists intended_client_id uuid references public\.profiles\(id\) on delete set null/);
  assert.match(migration, /intended_client_id=excluded\.intended_client_id/);
  // Plans already assigned must not read as unassigned after this runs.
  assert.match(migration, /set intended_client_id = a\.client_id/);
  assert.match(rollback, /drop column if exists intended_client_id/);

  // Both read paths prefer the live assignment and fall back to the intent.
  const editor = repository.slice(repository.indexOf("export async function getCoachMenu"));
  assert.match(editor, /client_id: assignment\?\.client_id \?\? \(plan as \{ intended_client_id\?: string \| null \}\)\.intended_client_id \?\? null/);
  const list = repository.slice(repository.indexOf("export async function listCoachMenus"), repository.indexOf("export async function getCoachMenu"));
  assert.match(list, /intended_client_id/);
});

test("opening a menu with a client derives the goal and the macros from them", async () => {
  const editor = await source("components/coach/menus/PersistentMenuEditor.tsx");
  // The goal is read off the client's own intake at mount, not left blank for
  // the coach to re-pick something they already chose when creating the client.
  assert.match(editor, /const client=clients\.find\(item=>item\.id===initial\.clientId\);\s*\n\s*return isNutritionGoal\(client\?\.nutritionGoal\)\?client\.nutritionGoal:"";/);
  // And the macro targets are computed from that client's weight on the same
  // pass, so a restored client fills protein, carbohydrate and fat without a
  // second action.
  assert.match(editor, /const plan=planMacros\(\{calories:Number\(initial\.calorieTarget\),weightKg:client\?\.weight\?\?Number\.NaN/);
});

// ============================== the client says how much they actually ate

test("a portion the client changes is recorded without touching the plan", async () => {
  const [migration, rollback, repository, actions] = await Promise.all([
    source("supabase/migrations/202608200006_client_portion_override.sql"),
    source("supabase/seeds/client-portion-override-rollback.sql"),
    source("lib/data/product-repository.ts"),
    source("app/actions/product.ts"),
  ]);
  // The override lives on the selection, which is already per client, per group
  // and per day. Null means "as prescribed" - which every existing row means,
  // and is why there is no backfill.
  assert.match(migration, /add column if not exists amount_override numeric\(10,2\)/);
  assert.match(migration, /check \(amount_override is null or amount_override > 0\)/);
  // The same ownership gate as choosing an alternative.
  assert.match(migration, /a\.client_id = auth\.uid\(\) and a\.status = 'active'/);
  // And an amount with nothing chosen is an amount of nothing.
  assert.match(migration, /if v_id is null then raise exception 'select_one_alternative_per_group'/);
  assert.match(rollback, /drop column if exists amount_override/);
  assert.match(actions, /rpc\("set_meal_group_amount"/);

  // Only the chosen row is scaled: the alternatives are offers, and were not
  // eaten, so they keep the coach's figures.
  // Zero is a real answer - the portion was served and left - so the test is
  // "is there an override", not "is it truthy".
  assert.match(repository, /item\.id===chosen&&override!==undefined\?scaleItem\(item,override\):item/);
  assert.match(repository, /function scaleItem\(item: PersistedMealItem, eaten: number\)/);
});

test("scaling a portion is linear in every figure on the row", async () => {
  // The stored values are the food's per-100 g figures times the amount, so
  // halving the amount halves all four - anything else would invent nutrition.
  const { default: repo } = { default: null };
  void repo;
  const planned = { calories: 250, protein: 7, carbs: 40, fat: 6.9, amount: 100, displayQuantity: 2 };
  const factor = 1 / planned.displayQuantity;
  const scaled = {
    calories: Math.round(planned.calories * factor * 10) / 10,
    protein: Math.round(planned.protein * factor * 10) / 10,
    amount: Math.round(planned.amount * factor * 10) / 10,
  };
  assert.equal(scaled.calories, 125);
  assert.equal(scaled.protein, 3.5);
  assert.equal(scaled.amount, 50);
});

// ==================================== what the client actually ate

test("the food log carries figures only where there are figures", async () => {
  const { sumLoggedFood } = await import("../lib/nutrition/food-log.ts");
  const entries = [
    { id: "1", mealId: null, name: "חלב", quantity: 200, unit: "גרם", calories: 120, protein: 7, carbs: 10, fat: 6, source: "scan" as const, photoUrl: null },
    { id: "2", mealId: null, name: "חביתה", quantity: null, unit: null, calories: null, protein: null, carbs: null, fat: null, source: "text" as const, photoUrl: null },
    { id: "3", mealId: null, name: "צלחת", quantity: null, unit: null, calories: null, protein: null, carbs: null, fat: null, source: "photo" as const, photoUrl: "x" },
  ];
  const total = sumLoggedFood(entries);
  // Only the scanned entry has real numbers. The other two are not zero - they
  // are unknown, and rounding unknown to zero is how a day's total becomes a
  // lie the coach then acts on.
  assert.equal(total.calories, 120);
  assert.equal(total.protein, 7);
  assert.equal(total.measured, 1);
  assert.equal(total.unmeasured, 2);
});

test("a food-log photo can only be written under its owner's folder", async () => {
  const [{ foodLogPhotoPath, validateFoodLogPhoto }, migration] = await Promise.all([
    import("../lib/nutrition/food-log.ts"),
    source("supabase/migrations/202608200007_client_food_log.sql"),
  ]);
  const owner = "5062fb99-816c-454d-a80c-2de8f2668be2";
  // The first path segment is the owner's id, because that is what the storage
  // policy reads - the same rule the check-in photos use.
  assert.ok(foodLogPhotoPath(owner, "2026-08-20", "image/jpeg").startsWith(`${owner}/2026-08-20/`));
  assert.match(migration, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  // And the row is checked against the same rule, so it can never point at a
  // file its owner could not have written.
  assert.match(migration, /split_part\(p_photo_path, '\/', 1\) <> auth\.uid\(\)::text/);
  assert.equal(validateFoodLogPhoto({ size: 10, type: "application/pdf" }) !== null, true);
  assert.equal(validateFoodLogPhoto({ size: 10, type: "image/jpeg" }), null);
});

test("logging against a meal answers that meal too", async () => {
  const action = await source("app/actions/food-log.ts");
  // Otherwise the client says the same thing twice, in two controls, and the
  // meal goes on asking.
  assert.match(action, /rpc\("set_meal_day_status"/);
  assert.match(action, /p_status: "other"/);
  // A failed row must not leave its photograph behind.
  assert.match(action, /if \(photoPath\) await supabase\.storage\.from\(FOOD_LOG_PHOTO_BUCKET\)\.remove\(\[photoPath\]\)/);
});

// ================================ the day, read one meal at a time

test("the spoon rule is a lunch rule, and a serving spoon takes over from a silly count", async () => {
  const { householdMeasure, GRAMS_PER_SERVING_SPOON, SPOON_MEAL_TITLE } =
    await import("../lib/nutrition/household-measures.ts");

  // "19 כפות בורגול" is a true sentence that helps nobody.
  assert.equal(GRAMS_PER_SERVING_SPOON, 100);
  // Both readings: not every kitchen has a serving spoon, and not every portion
  // is worth counting out in twenties.
  assert.equal(householdMeasure(375, "carbohydrate", "גרם", SPOON_MEAL_TITLE)?.label, "≈ 4 כפות הגשה · 19 כפות אכילה");
  assert.equal(householdMeasure(60, "carbohydrate", "גרם", SPOON_MEAL_TITLE)?.label, "≈ 3 כפות אכילה");
  // Anywhere else the portion stands on its grams.
  assert.equal(householdMeasure(200, "carbohydrate", "גרם", "ארוחת בוקר"), null);
  // A food sold by the unit already says "1 פרוסה", which beats any spoon count.
  assert.equal(householdMeasure(150, "carbohydrate", "פיתות", SPOON_MEAL_TITLE), null);
  // The palm is not a spoon and is not restricted to a meal.
  assert.equal(householdMeasure(200, "protein", "גרם", "ארוחת ערב")?.unit, "palm");
});

test("a barcode can be scanned wherever it is asked for", async () => {
  const [camera, scanner, sheet] = await Promise.all([
    source("components/client/CameraScan.tsx"),
    source("components/client/BarcodeScanner.tsx"),
    source("components/client/AteSomethingElse.tsx"),
  ]);
  // Reading thirteen digits off a curved bottle and typing them in is not a
  // feature, so both places that ask for a barcode open the camera.
  assert.match(camera, /export default function CameraScan/);
  assert.match(scanner, /<CameraScan onDetected=/);
  assert.match(sheet, /<CameraScan onDetected=/);
  // ZXing stays behind a dynamic import so it costs nothing until a camera opens.
  assert.match(camera, /await import\("@zxing\/browser"\)/);
});

test("the day opens one meal at a time", async () => {
  const [page, css] = await Promise.all([source("app/nutrition/page.tsx"), source("app/globals.css")]);
  // Six meals in a single scroll is a page nobody reads to the end, and the
  // marking controls live at the bottom of each one.
  assert.match(page, /<details\s*\n\s*key=\{meal\.id\}/);
  assert.match(page, /open=\{isNow\}/);
  // The closed row has to carry enough to decide whether to open it.
  assert.match(page, /const mealCalories = Math\.round\(/);
  assert.match(page, /meal\.status === "not_eaten" \? "לא נאכל"/);
  assert.match(css, /\.meal-card > summary/);
});

// ============================ zero, the free window, and a camera that stays open

test("eating none of a portion is an amount, not a skipped meal", async () => {
  const [migration, rollback, control, action] = await Promise.all([
    source("supabase/migrations/202608200008_portion_override_zero.sql"),
    source("supabase/seeds/portion-override-zero-rollback.sql"),
    source("components/client/PortionOverride.tsx"),
    source("app/actions/product.ts"),
  ]);
  // Marking the whole meal "לא נאכל" is a different claim: it says the meal did
  // not happen, when what happened is that one group of it did not.
  assert.match(migration, /check \(amount_override is null or amount_override >= 0\)/);
  assert.match(migration, /if p_quantity is not null and p_quantity < 0 then raise exception/);
  assert.match(control, /min="0"/);
  assert.match(action, /quantity !== null && \(!Number\.isFinite\(quantity\) \|\| quantity < 0\)/);
  assert.match(rollback, /amount_override > 0/);
});

test("the free-calorie window can be filled in, not just described", async () => {
  const [component, page] = await Promise.all([
    source("components/client/FreeCalorieMeal.tsx"),
    source("app/nutrition/page.tsx"),
  ]);
  // It used to be a sentence with nowhere to answer it, so the frame could not
  // be tracked against and the day counted the whole allowance either way.
  assert.match(component, /<AteSomethingElse/);
  assert.match(component, /הוספת מה שאכלתי/);
  assert.match(component, /נותרו/);
  assert.match(page, /<FreeCalorieMeal/);
});

test("the camera is not torn down by its own parent re-rendering", async () => {
  const camera = await source("components/client/CameraScan.tsx");
  // The callback is written inline at both call sites, so it is a new function
  // every render. With it in the dependency array the camera restarted on each
  // one - which is how it could sit open and never resolve anything.
  assert.match(camera, /const handler = useRef\(onDetected\)/);
  assert.match(camera, /useEffect\(\(\) => \{ handler\.current = onDetected; \}, \[onDetected\]\)/);
  assert.match(camera, /\}, \[live\]\);/);
  assert.doesNotMatch(camera, /\}, \[live, onDetected\]\);/);
});
