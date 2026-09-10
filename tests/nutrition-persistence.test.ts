import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import foods from "../data/foods.json" with { type: "json" };
import { calculatePlanTotals } from "../lib/meal-plans/calculations.ts";
import type { MealPlan } from "../lib/meal-plans/types.ts";
import { validateMealPlanPayload } from "../lib/nutrition/menu-validation.ts";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

// The 336 branded products from the imported workbook keep their numeric ids and
// must all still be there; produce and the coach's own portions were added on top
// and carry "coach-" ids, so the catalogue grows without the import being lost.
test("nutrition catalog keeps every imported product and stays distinct", () => {
  assert.equal(foods.filter((food) => /^\d+$/.test(food.id)).length, 336);
  assert.ok(foods.length > 336);
  assert.equal(new Set(foods.map((food) => food.id)).size, foods.length);
  assert.equal(
    new Set(
      foods.map(
        (food) =>
          `${food.name.trim().toLocaleLowerCase("he")}|${(food.brand ?? "")
            .trim()
            .toLocaleLowerCase("he")}`,
      ),
    ).size,
    foods.length,
  );
  // The gap this closed: one vegetable in the whole catalogue.
  assert.ok(foods.filter((food) => food.category === "ירקות").length > 20);
});

test("nutrition schema includes canonical relations, constraints, RLS and RPCs", async () => {
  const sql = await file(
    "supabase/migrations/202607200007_nutrition_persistence.sql",
  );
  for (const table of [
    "meal_plans",
    "client_meal_plan_assignments",
    "nutrition_logs",
    "eaten_meal_items",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
  }
  assert.match(sql, /assignments_one_active_per_client_idx/);
  assert.match(sql, /meals_have_parent/);
  assert.match(sql, /save_meal_plan_tree/);
  assert.match(sql, /set_meal_item_eaten/);
  assert.match(sql, /set_meal_eaten/);
  assert.match(sql, /v_food\.calories/);
});

test("nutrition RLS avoids recursive meal plan and assignment policies", async () => {
  const sql = await file(
    "supabase/migrations/202607270001_fix_nutrition_rls_recursion.sql",
  );
  assert.match(sql, /security definer/);
  assert.match(sql, /has_active_meal_plan_assignment/);
  assert.match(sql, /is_meal_plan_coach/);
  assert.match(sql, /drop policy if exists meal_plans_client_select/);
  assert.match(sql, /drop policy if exists assignments_participant_select/);
  assert.doesNotMatch(sql, /a\.meal_plan_id = a\.id/);
});

test("production nutrition repository reads Supabase canonical tables", async () => {
  // ClientAppProvider used to be asserted here too - it held the demo nutrition
  // state in memory. It has been deleted along with the rest of the pre-Supabase
  // client screens, so there is no longer a second store to keep honest.
  const [repository, actions, page] = await Promise.all([
    file("lib/data/product-repository.ts"),
    file("app/actions/product.ts"),
    file("app/nutrition/page.tsx"),
  ]);
  for (const table of [
    "meal_plans",
    "client_meal_plan_assignments",
    "nutrition_logs",
    "eaten_meal_items",
  ])
    assert.match(repository, new RegExp(`from\\(\"${table}\"\\)`));
  assert.doesNotMatch(repository, /from\("menus"\)|meal_completion_logs/);
  assert.match(actions, /rpc\("save_meal_plan_tree"/);
  // Marking is one entry point now. set_meal_eaten and set_meal_item_eaten are
  // still in the database for anything already calling them, but no screen does,
  // and the wrappers that reached them from here have been removed - they were
  // the only callers of the ambiguous three-argument overload.
  assert.match(actions, /rpc\("set_meal_day_status"/);
  assert.match(actions, /rpc\("select_meal_group_alternative"/);
  assert.doesNotMatch(actions, /rpc\("set_meal_eaten"/);
  assert.match(page, /selectMealGroupAlternative/);
});

test("client menu shows only the coach note saved on the menu item", async () => {
  const repository = await file("lib/data/product-repository.ts");

  assert.match(repository, /typeof item\.note === "string"/);
  assert.match(repository, /item\.note\.trim\(\) \|\| null/);
  assert.doesNotMatch(repository, /foodRelationNotes/);
  assert.doesNotMatch(repository, /foods\(name,notes\)/);
});

test("nutrition totals still use the approved calculation engine", () => {
  const plan: MealPlan = {
    id: "nutrition-db",
    name: "Supabase",
    status: "active",
    updatedAt: "2026-07-20",
    targets: {},
    meals: [
      {
        id: "meal",
        name: "ארוחה",
        order: 0,
        items: [{ id: "item", foodId: foods[0].id, quantityGrams: 150 }],
      },
    ],
  };
  const totals = calculatePlanTotals(plan, new Map(foods.map((food) => [food.id, food])));
  assert.deepEqual(totals, {
    calories: 93,
    protein: 17.3,
    carbs: 2.7,
    fat: 1.5,
  });
});

test("meal-plan mutations reject incomplete or unsafe payloads before the RPC", () => {
  const valid = {
    title: "תפריט בדיקה",
    status: "active",
    clientId: "client-id",
    days: [
      {
        meals: [
          {
            title: "ארוחת בוקר",
            groups: [
              { type: "protein", items: [{ foodId: "1", amount: 125.5 }] },
              { type: "carbohydrate", items: [{ foodId: "61", amount: 100 }] },
            ],
          },
        ],
      },
    ],
  };
  assert.deepEqual(validateMealPlanPayload(valid), { ok: true });
  assert.equal(validateMealPlanPayload({ ...valid, clientId: "" }).ok, false);
  assert.equal(
    validateMealPlanPayload({
      ...valid,
      days: [{ meals: [{ title: "ארוחה", groups: [] }] }],
    }).ok,
    false,
  );
  assert.equal(
    validateMealPlanPayload({
      ...valid,
      days: [
        {
          meals: [
            {
              title: "ארוחת בוקר",
              groups: [{type:"protein",items: [{ foodId: "1", amount: Number.NaN }]}],
            },
          ],
        },
      ],
    }).ok,
    false,
  );
});

test("the client sees the day's totals, and no targets beside them", async () => {
  const page = await file("app/nutrition/page.tsx");
  // The card is named for what it answers now - what has been eaten - and each
  // macro carries both halves, because "1688/2014" was read as often for what
  // is left as for what was eaten, and the two are opposite instructions.
  assert.match(page, /מה נאכל היום/);
  assert.match(page, /eatenTotals\.protein/);
  assert.match(page, /remainingTotals\.protein/);
  assert.match(page, /eatenTotals\.fat/);
  // The target is now printed beside what was eaten, and this is a reversal.
  // It was withheld while the only thing a client could do was mark meals from
  // a menu the coach had balanced: the gap was the coach's trade-off, not the
  // client's mistake. Since the client can log food outside the menu, the menu
  // is no longer the whole day, and "נותרו בתפריט" says nothing about eating
  // 800 calories that were never in it. Overrun is what the figure is for, and
  // it is the only one shown in red.
  assert.match(page, /target=\{menu\.calorieTarget\}/);
  assert.match(page, /חריגה של/);
  assert.match(page, /נותרו \$\{Math\.round\(target - value\)\}/);
});

// The database runs in UTC and the product runs in Asia/Jerusalem. Every write
// in the nutrition engine is already dated by the app, but the four SELECT
// policies that decide whether a client may read their plan compared the
// assignment against bare current_date - so between midnight and 03:00 Israel
// time a menu activated for "today" was one day in the future as far as the
// database was concerned, and the client's screen said "עדיין אין תפריט פעיל".
test("the client's menu is read on the Israeli calendar day", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202608250010_the_menu_is_read_on_the_israeli_day.sql", import.meta.url), "utf8");
  assert.match(sql, /create or replace function public\.israel_today\(\)/);
  assert.match(sql, /now\(\) at time zone 'Asia\/Jerusalem'/);
  // Evaluated once per query, not once per row.
  assert.match(sql, /returns date\s*\nlanguage sql\s*\nstable/);
  for (const policy of ["meal_plans_client_select", "meals_plan_visible", "meal_items_plan_visible", "meal_food_groups_visible"])
    assert.match(sql, new RegExp(`create policy ${policy} on`), policy);
  // Not one bare current_date is left in what this migration installs.
  assert.doesNotMatch(sql.split("begin;")[1] ?? "", /[^_]current_date/);
});

// The policy on meal_plans has to reach the assignment through a security
// definer function, not inline. Inline, it reads client_meal_plan_assignments
// while the policy on that table reads meal_plans back - a cycle Postgres
// refuses - and its unqualified `id` binds to the assignment's own primary key.
// 202608250010 rewrote it from the pre-fix source and every client lost their
// menu until 202608250011 put the function back.
test("the meal_plans policy reaches the assignment through the definer function", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202608250011_restore_the_plan_policy_to_its_function.sql", import.meta.url), "utf8");
  assert.match(sql, /using \(public\.has_active_meal_plan_assignment\(id\)\)/);
  // Nothing inline: no second reading of the assignments table from this policy.
  assert.doesNotMatch(sql.split("begin;")[1] ?? "", /client_meal_plan_assignments/);
});

// The day's nutrition_log pins the menu the client was reading, so a coach who
// reassigns does not rewrite a day that already happened. But the plan it points
// at stops being readable the moment its assignment is ended - which is exactly
// what activating a replacement does - and the reader returned null on that,
// with a live active menu sitting in the assignments table. A coach replacing a
// menu during the day left the client on "עדיין אין תפריט פעיל" until midnight.
test("an unreadable pinned menu falls through to the one assigned now", async () => {
  const repository = await file("lib/data/product-repository.ts");
  const body = repository.slice(repository.indexOf("export async function getActiveClientMenu"));
  // The current assignment is a function, so it can be asked for a second time.
  assert.match(body, /const currentAssignment = async \(\) => \{/);
  assert.match(body, /const readPlan = async \(mealPlanId: string\) => \{/);
  // The fallback fires only where a pinned plan was named and could not be read.
  assert.match(body, /if \(!plan && existingLog\?\.meal_plan_id\) \{\s*\n\s*assignment = await currentAssignment\(\);\s*\n\s*plan = assignment \? await readPlan\(assignment\.meal_plan_id\) : null;/);
  // And nothing is returned without both halves.
  assert.match(body, /if \(!assignment \|\| !plan\) return null;/);
});

// A loading skeleton is a status, not the document's main content. The root
// boundary stands above every segment, so while a page streams it sits beside
// that page's own <main> - and /coach/workouts carried two main landmarks.
test("the root loading fallback does not claim the main landmark", async () => {
  // Comments stripped: this file explains itself by naming the tag it no longer uses.
  const loading = (await file("components/client/ClientLoading.tsx")).replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(loading, /<main/);
  assert.match(loading, /role="status"/);
});
