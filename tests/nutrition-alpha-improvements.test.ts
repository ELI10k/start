import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateMacroTargets } from "../lib/nutrition/macro-targets.ts";
import { validateMealPlanPayload } from "../lib/nutrition/menu-validation.ts";
import foodData from "../data/foods.json" with { type: "json" };
import { foodSearchRelevance,normalizeFoodText,queryFoods } from "../lib/foods/repository.ts";
import { calculateAlternativePortion,defaultPortionQuantity,foodUnit,portionFor,unitLabel } from "../lib/nutrition/meal-alternatives.ts";

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

test("combobox exposes keyboard controls and favorite-first 30-item recent limits",()=>{
  const source=readFileSync(new URL("../components/coach/menus/FoodCombobox.tsx",import.meta.url),"utf8");
  for(const key of ["ArrowDown","ArrowUp","Enter","Escape"])assert.ok(source.includes(key));
  assert.match(source,/slice\(0,30\)/);
  assert.match(source,/⭐ מאכלים מועדפים/);
  assert.match(source,/מזונות אחרונים/);
  assert.match(source,/foodSearchRelevance/);
});

test("menu editor preserves manual targets until explicit recalculation",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  // The guarantee, not the wording: a figure the coach typed is marked as
  // theirs, is only recomputed when they ask, and asking puts everything back
  // under the system's control. The calculation moved to lib/nutrition/macro-plan
  // and is covered directly in tests/nutrition-engine.test.ts.
  assert.match(source,/planMacros\(/);
  assert.match(source,/הוזן ידנית/);
  assert.match(source,/מחושב אוטומטית/);
  assert.match(source,/חשב מחדש/);
  assert.match(source,/force\?\{protein:"auto" as const,carbohydrates:"auto" as const,fat:"auto" as const\}/);
  assert.doesNotMatch(source,/queueMicrotask/);
  for(const label of ["מאקרו אבות מזון","חלבון \\(גרם\\)","פחמימה \\(גרם\\)","שומן \\(גרם\\)"])assert.match(source,new RegExp(label));
  // Short of the target reads red, target met reads green.
  assert.match(source,/short\?" text-\[#DC2626\]":" text-\[#16A34A\]"/);
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
  assert.match(source,/מועדפים תמיד ראשונים/);
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

test("a single portion reads as a singular unit",()=>{
  assert.equal(unitLabel("פיתות",1),"פיתה");
  assert.equal(unitLabel("פיתות",2),"פיתות");
  assert.equal(unitLabel("פרוסות",1),"פרוסה");
  assert.equal(unitLabel("פרוסות",3),"פרוסות");
  assert.equal(unitLabel("יחידות",1),"יחידה");
  assert.equal(unitLabel("קופסאות",1),"קופסה");
  assert.equal(unitLabel("גרם",1),"גרם");
  assert.equal(unitLabel("פרוסות",2.5),"פרוסות");
});

test("a new menu opens with the full six-meal skeleton",()=>{
  const source=readFileSync(new URL("../app/coach/menus/new/page.tsx",import.meta.url),"utf8");
  assert.match(source,/FIXED_MEAL_TITLES\.map/);
  assert.match(source,/קלוריות חופשיות/);
  assert.doesNotMatch(source,/meals:\[\{title:"ארוחת בוקר"/);
  for(const group of ["protein","carbohydrate","fat","vegetables"])assert.match(source,new RegExp(`type:\"${group}\"`));
});

test("the editor offers one-click suggested alternatives from favorite foods",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  assert.match(source,/suggestAlternatives/);
  assert.match(source,/הוסף 3 חלופות מומלצות/);
  assert.match(source,/foodsForGroup\(foods,group\.type\)/);
  assert.match(source,/isFavorite\(food\)/);
  assert.match(source,/amountSource:"auto" as const/);
  assert.match(source,/Math\.abs\(a\.portion\.calories-target\.calories\)/);
});

test("meals can be collapsed to a one-line summary",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  assert.match(source,/toggleCollapsed/);
  assert.match(source,/aria-expanded=\{!collapsed\.has\(index\)\}/);
  assert.match(source,/function mealSummary/);
  assert.match(source,/עדיין ריקה/);
});

test("untouched meals from the skeleton do not block saving",()=>{
  const source=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  assert.match(source,/const savedMeals=\(\)=>menu\.meals/);
  assert.match(source,/group\.items\.some\(item=>item\.foodId\)/);
  assert.match(source,/יש למלא לפחות ארוחה אחת לפני שמירה/);
  assert.match(source,/sticky top-0/);
});

test("the empty-group message names a food, not an alternative",()=>{
  const source=readFileSync(new URL("../lib/nutrition/menu-validation.ts",import.meta.url),"utf8");
  assert.match(source,/יש לבחור לפחות מאכל אחד בכל קבוצת מזון/);
  assert.doesNotMatch(source,/לפחות חלופה אחת לכל קבוצת מזון/);
});

test("a duplicated plan is unassigned and recalculates for the next client",()=>{
  const source=readFileSync(new URL("../app/actions/product.ts",import.meta.url),"utf8");
  const start=source.indexOf("export async function duplicateCoachMealPlan");
  const body=source.slice(start,start+4000);
  assert.match(body,/clientId: ""/);
  assert.match(body,/status: "draft"/);
  for(const key of ["proteinTargetSource","carbohydrateTargetSource","fatTargetSource"])
    assert.match(body,new RegExp(`${key}:"auto"`));
});

test("selecting a client fills the calorie target from their profile",()=>{
  const editor=readFileSync(new URL("../components/coach/menus/PersistentMenuEditor.tsx",import.meta.url),"utf8");
  // The stored target is now the fallback rather than the first answer: the
  // builder computes from the client's own data when it can, and falls back to
  // whatever the intake recorded when an input is missing.
  assert.match(editor,/computed\?\.ok[\s\S]*client\?\.calorieTarget/);
  // The column is read once, in the repository, and both menu routes get it from
  // there. Asserting on the repository keeps the guarantee attached to the code
  // that actually reads client_profiles.calorie_target.
  const repository=readFileSync(new URL("../lib/data/product-repository.ts",import.meta.url),"utf8");
  assert.match(repository,/listCoachMenuClients/);
  assert.match(repository,/from\("client_profiles"\)\.select\("user_id,calorie_target,/);
  assert.match(repository,/calorieTarget:/);
  for(const page of ["../app/coach/menus/new/page.tsx","../app/coach/menus/[id]/page.tsx"])
    assert.match(readFileSync(new URL(page,import.meta.url),"utf8"),/listCoachMenuClients/);
});

test("a meal with only one filled group can be saved",()=>{
  const plan={title:"בדיקה",status:"draft",clientId:"",days:[{meals:[
    {title:"ארוחת בוקר",groups:[{type:"protein",items:[{foodId:"1",amount:100}]}]},
  ]}]};
  assert.deepEqual(validateMealPlanPayload(plan),{ok:true});
});

test("a meal with no filled group at all is still refused",()=>{
  const plan={title:"בדיקה",status:"draft",clientId:"",days:[{meals:[
    {title:"ארוחת בוקר",groups:[]},
  ]}]};
  const result=validateMealPlanPayload(plan);
  assert.equal(result.ok,false);
});
