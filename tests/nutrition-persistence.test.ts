import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import foods from "../data/foods.json" with { type: "json" };
import { calculatePlanTotals } from "../lib/meal-plans/calculations.ts";
import type { MealPlan } from "../lib/meal-plans/types.ts";
import { validateMealPlanPayload } from "../lib/nutrition/menu-validation.ts";

const file = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("nutrition catalog has exactly 336 distinct products", () => {
  assert.equal(foods.length, 336);
  assert.equal(new Set(foods.map((food) => food.id)).size, 336);
  assert.equal(
    new Set(
      foods.map(
        (food) =>
          `${food.name.trim().toLocaleLowerCase("he")}|${(food.brand ?? "")
            .trim()
            .toLocaleLowerCase("he")}`,
      ),
    ).size,
    336,
  );
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
  const [repository, actions, page, provider] = await Promise.all([
    file("lib/data/product-repository.ts"),
    file("app/actions/product.ts"),
    file("app/nutrition/page.tsx"),
    file("components/client/ClientAppProvider.tsx"),
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
  assert.match(actions, /rpc\("set_meal_item_eaten"/);
  assert.match(actions, /rpc\("set_meal_eaten"/);
  assert.match(page, /selectMealGroupAlternative/);
  assert.match(provider, /createMemoryAdapter/);
  assert.doesNotMatch(provider, /localStorage|createBrowserDemoAdapter/);
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

test("client nutrition screen exposes full daily macro totals and targets", async () => {
  const page = await file("app/nutrition/page.tsx");
  assert.match(page, /סיכום התפריט היומי/);
  assert.match(page, /menuTotals\.protein/);
  assert.match(page, /menuTotals\.carbs/);
  assert.match(page, /menuTotals\.fat/);
  assert.match(page, /menu\.calorieTarget/);
});
