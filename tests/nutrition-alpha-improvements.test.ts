import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateMacroTargets } from "../lib/nutrition/macro-targets.ts";
import foodData from "../data/foods.json" with { type: "json" };
import { foodSearchRelevance,normalizeFoodText,queryFoods } from "../lib/foods/repository.ts";
import { calculateAlternativePortion,defaultPortionQuantity,foodUnit,portionFor } from "../lib/nutrition/meal-alternatives.ts";

test("macro targets match the approved 90kg and 2100 calorie example",()=>{
  assert.deepEqual(calculateMacroTargets(90,2100),{
    protein:162,
    fat:58,
    carbohydrates:232,
  });
});

test("macro targets recalculate and reject negative carbohydrates",()=>{
  assert.deepEqual(calculateMacroTargets(90,2400),{
    protein:162,
    fat:67,
    carbohydrates:288,
  });
  assert.equal(calculateMacroTargets(300,800),null);
  assert.equal(calculateMacroTargets(0,2100),null);
  assert.equal(calculateMacroTargets(90,0),null);
});

test("macro targets match 88.5kg and 2250 calories",()=>{
  assert.deepEqual(calculateMacroTargets(88.5,2250),{
    protein:159,
    fat:63,
    carbohydrates:263,
  });
});

test("food search normalization supports Hebrew, English and partial words",()=>{
  const hebrew=normalizeFoodText("גבינת קוֹטג׳ תנובה");
  const english=normalizeFoodText("Greek Yogurt");
  assert.ok(hebrew.includes(normalizeFoodText("קוטג")));
  assert.ok(english.includes(normalizeFoodText("yog")));
  assert.ok(foodSearchRelevance("גבינה",["גבינת כנען 5%","תנובה","גבינות לבנות"])>=0);
  assert.ok(queryFoods(foodData,{search:"גבינה"}).length>=10);
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

test("combobox exposes keyboard controls and master-first 30-item recent limits",()=>{
  const source=readFileSync(new URL("../components/coach/menus/FoodCombobox.tsx",import.meta.url),"utf8");
  for(const key of ["ArrowDown","ArrowUp","Enter","Escape"])assert.ok(source.includes(key));
  assert.match(source,/slice\(0,30\)/);
  assert.match(source,/⭐ מאכלי מאסטר/);
  assert.match(source,/מזונות אחרונים/);
  assert.match(source,/foodSearchRelevance/);
});

test("menu editor preserves manual targets until explicit recalculation",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  assert.match(source,/current\.macroSources\.protein==="auto"/);
  assert.match(source,/הוזן ידנית/);
  assert.match(source,/חשב מחדש לפי משקל וקלוריות/);
  assert.match(source,/force\?\{protein:"auto" as const,carbohydrates:"auto" as const,fat:"auto" as const\}/);
  assert.doesNotMatch(source,/queueMicrotask/);
  for(const label of ["סיכום המזונות","חלבון \\(גרם\\)","פחמימה \\(גרם\\)","שומן \\(גרם\\)"])assert.match(source,new RegExp(label));
});

test("duplicated plans start in automatic macro mode",()=>{
  const source=readFileSync(new URL("../app/actions/product.ts",import.meta.url),"utf8");
  assert.match(source,/proteinTargetSource:"auto"/);
  assert.match(source,/carbohydrateTargetSource:"auto"/);
  assert.match(source,/fatTargetSource:"auto"/);
});

test("meal groups migration enforces alternatives, fixed meal types and client isolation",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202607290003_meal_food_groups.sql",import.meta.url),"utf8");
  assert.match(sql,/create table if not exists public\.meal_food_groups/);
  assert.match(sql,/unique\(meal_id,group_type\)/);
  assert.match(sql,/create table if not exists public\.meal_group_selections/);
  assert.match(sql,/unique\(client_id,group_id,selection_date\)/);
  assert.match(sql,/client_id=\(select auth\.uid\(\)\)/);
  assert.match(sql,/select_meal_group_alternative/);
  assert.match(sql,/alternative_not_assigned/);
  assert.match(sql,/קלוריות חופשיות/);
});

test("menu editor uses fixed meals and grouped alternatives",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  assert.match(source,/FIXED_MEAL_TITLES/);
  assert.match(source,/קבוצת חלבון/);
  assert.match(source,/מאכל ראשי אחד, ומתחתיו חלופות בכמות מחושבת/);
  assert.doesNotMatch(source,/title:"ארוחה חדשה"/);
});

test("alternative portions prioritize equal calories and adjust density",()=>{
  const primary={calories:150,protein:25,carbs:0,fat:5,packageUnit:"גרם",unitWeightGrams:null};
  const dense={calories:300,protein:22,carbs:5,fat:20,packageUnit:"גרם",unitWeightGrams:null};
  const light={calories:100,protein:20,carbs:2,fat:1,packageUnit:"גרם",unitWeightGrams:null};
  const densePortion=calculateAlternativePortion(primary,200,dense,"protein");
  const lightPortion=calculateAlternativePortion(primary,200,light,"protein");
  assert.ok(densePortion&&densePortion.quantity<200);
  assert.ok(lightPortion&&lightPortion.quantity>200);
  assert.ok(Math.abs((densePortion?.calories??0)-300)<80);
});

test("unit-based foods use workbook unit weight without treating units as grams",()=>{
  const egg={calories:150,protein:13,carbs:1,fat:10,packageUnit:"יחידה",unitWeightGrams:50};
  assert.deepEqual(portionFor(egg,2),{quantity:2,unit:"יחידות",grams:100,calories:150,protein:13,carbs:1,fat:10});
  assert.equal(defaultPortionQuantity(egg),2);
});

test("natural units come from the source unit and its weight",()=>{
  const slice={calories:240,protein:9.2,carbs:45.1,fat:1.7,packageUnit:"פרוסה",unitWeightGrams:30};
  assert.deepEqual(foodUnit(slice),{unit:"פרוסות",gramsPerUnit:30});
  const twoSlices=portionFor(slice,2);
  assert.equal(twoSlices?.unit,"פרוסות");
  assert.equal(twoSlices?.grams,60);
  assert.equal(twoSlices?.calories,144);
});

test("a source unit without a weight stays in grams",()=>{
  const noWeight={calories:240,protein:9.2,carbs:45.1,fat:1.7,packageUnit:"פרוסה",unitWeightGrams:null};
  assert.deepEqual(foodUnit(noWeight),{unit:"גרם",gramsPerUnit:1});
});

test("an alternative measured in slices is rounded to halves",()=>{
  const pita={calories:236,protein:9.3,carbs:45,fat:1.4,packageUnit:"פיתה",unitWeightGrams:70};
  const bread={calories:240,protein:9.2,carbs:45.1,fat:1.7,packageUnit:"פרוסה",unitWeightGrams:30};
  const portion=calculateAlternativePortion(pita,1,bread,"carbohydrate");
  assert.equal(portion?.unit,"פרוסות");
  assert.equal((portion?.quantity??0)*2%1,0);
});

test("a mass unit in the source never becomes a countable unit",()=>{
  // Regression: catalog rows carry package_unit "גרם" with a unit weight, and
  // treating that as countable multiplied every value by the weight - 100 g of
  // egg white came out as 1716 kcal instead of 52.
  const eggWhite={calories:52,protein:10.9,carbs:0.73,fat:0.17,packageUnit:"גרם",unitWeightGrams:33};
  assert.deepEqual(foodUnit(eggWhite),{unit:"גרם",gramsPerUnit:1});
  const portion=portionFor(eggWhite,100);
  assert.equal(portion?.grams,100);
  assert.equal(portion?.calories,52);
  for(const unit of ["מ\"ל","ML","kg","ליטר","gram"])
    assert.equal(foodUnit({...eggWhite,packageUnit:unit}).gramsPerUnit,1,unit);
});
