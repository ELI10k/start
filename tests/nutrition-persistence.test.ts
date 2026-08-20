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
  // A target is the coach's instrument. A menu does not always land on the
  // protein or the carbohydrate figure on purpose - the coach trades them off
  // knowingly - and printing the gap turns a deliberate decision into a number
  // the client appears to have missed. The coach still sees both sides in the
  // builder and on the client file.
  assert.doesNotMatch(page, /target=\{menu\./);
  assert.doesNotMatch(page, /יעד:/);
});
