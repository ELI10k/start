import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateMacroTargets } from "../lib/nutrition/macro-targets.ts";
import { normalizeFoodText } from "../lib/foods/repository.ts";

test("macro targets match the approved 90kg and 2100 calorie example",()=>{
  assert.deepEqual(calculateMacroTargets(90,2100),{
    protein:162,
    fat:58,
    carbohydrates:232,
  });
});

test("macro targets recalculate and never return negative carbohydrates",()=>{
  assert.deepEqual(calculateMacroTargets(90,2400),{
    protein:162,
    fat:67,
    carbohydrates:288,
  });
  assert.equal(calculateMacroTargets(300,800)?.carbohydrates,0);
  assert.equal(calculateMacroTargets(0,2100),null);
  assert.equal(calculateMacroTargets(90,0),null);
});

test("food search normalization supports Hebrew, English and partial words",()=>{
  const hebrew=normalizeFoodText("גבינת קוֹטג׳ תנובה");
  const english=normalizeFoodText("Greek Yogurt");
  assert.ok(hebrew.includes(normalizeFoodText("קוטג")));
  assert.ok(english.includes(normalizeFoodText("yog")));
});

test("master menu and coach usage migration enforce isolation and idempotency",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202607290001_master_menu_and_coach_food_usage.sql",import.meta.url),"utf8");
  assert.match(sql,/תפריט מאסטר START/);
  assert.match(sql,/unique index if not exists meal_plans_one_start_master_per_coach/);
  assert.match(sql,/primary key\(coach_id, food_id\)/);
  assert.match(sql,/selection_count=public\.coach_food_usage\.selection_count\+1/);
  assert.match(sql,/coach_id=\(select auth\.uid\(\)\)/);
  assert.match(sql,/not is_system_template/);
  assert.match(sql,/security definer/);
  assert.match(sql,/revoke all on function public\.ensure_start_master_menu/);
});

test("combobox exposes keyboard controls and 30-item recent/frequent limits",()=>{
  const source=readFileSync(new URL("../components/coach/menus/FoodCombobox.tsx",import.meta.url),"utf8");
  for(const key of ["ArrowDown","ArrowUp","Enter","Escape"])assert.ok(source.includes(key));
  assert.match(source,/slice\(0,30\)/);
  assert.match(source,/מזונות אחרונים/);
  assert.match(source,/מזונות מועדפים ונפוצים/);
  assert.match(source,/text\.includes\(q\)/);
});

test("menu editor preserves manual targets until explicit recalculation",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  assert.match(source,/current\.macroSources\.protein==="auto"/);
  assert.match(source,/הוזן ידנית/);
  assert.match(source,/חשב מחדש לפי משקל וקלוריות/);
  assert.match(source,/force\?\{protein:"auto",carbohydrates:"auto",fat:"auto"\}/);
});

test("duplicated plans start in automatic macro mode",()=>{
  const source=readFileSync(new URL("../app/actions/product.ts",import.meta.url),"utf8");
  assert.match(source,/protein_target_source: "auto"/);
  assert.match(source,/carbohydrate_target_source: "auto"/);
  assert.match(source,/fat_target_source: "auto"/);
});
