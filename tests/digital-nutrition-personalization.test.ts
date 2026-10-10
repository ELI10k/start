import test from "node:test";
import assert from "node:assert/strict";
import { buildPersonalizedMenu, calculateDietMacros, dietaryReviewReason, foodAllowed, type DietaryIntake, type TaggedFood } from "../lib/nutrition/personalization.ts";

const intake=(overrides:Partial<DietaryIntake>={}):DietaryIntake=>({dietType:"mediterranean",restrictions:["none"],allergies:"אין",avoidances:"אין",mealCount:3,...overrides});
const food=(id:string,tags:string[],overrides:Partial<TaggedFood>={}):TaggedFood=>({id,name:id,calories:200,protein:15,carbs:20,fat:8,vegan:true,vegetarian:true,pescatarian:true,containsGluten:false,containsLactose:false,allergens:[],dietaryTags:tags,metadataVerified:true,...overrides});
const catalogue=[food("p1",["protein"]),food("p2",["protein"]),food("c1",["carbohydrate"]),food("c2",["carbohydrate"]),food("f1",["fat"]),food("f2",["fat"])];

test("free-text allergies and avoided foods stop automatic generation",()=>{
  assert.match(dietaryReviewReason(intake({allergies:"אגוזים"}))??"",/בדיקה/);
  assert.match(dietaryReviewReason(intake({avoidances:"טופו"}))??"",/מיפוי/);
});

test("dietary filters are hard constraints",()=>{
  const animal=food("animal",["protein"],{vegan:false,vegetarian:false,pescatarian:false});
  const gluten=food("gluten",["carbohydrate"],{containsGluten:true});
  const dairy=food("dairy",["protein"],{containsLactose:true});
  assert.equal(foodAllowed(animal,intake({dietType:"vegan"})),false);
  assert.equal(foodAllowed(animal,intake({dietType:"vegetarian"})),false);
  assert.equal(foodAllowed(animal,intake({dietType:"pescatarian"})),false);
  assert.equal(foodAllowed(gluten,intake({restrictions:["gluten_free"]})),false);
  assert.equal(foodAllowed(dairy,intake({restrictions:["lactose_free"]})),false);
  assert.equal(foodAllowed(food("unknown",["protein"],{metadataVerified:false}),intake()),false);
});

for(const mealCount of [3,4,5])test(`creates seven days with ${mealCount} meals`,()=>{
  const macros=calculateDietMacros(80,2200,"mediterranean");assert.ok(macros);
  const plan=buildPersonalizedMenu(intake({mealCount}),catalogue,2200,macros);
  assert.ok(plan);assert.equal(plan.days.length,7);
  assert.ok(plan.days.every(day=>day.meals.length===mealCount));
});

test("keto and low-carb use dedicated macro splits",()=>{
  const keto=calculateDietMacros(80,2200,"keto"),low=calculateDietMacros(80,2200,"low_carb"),regular=calculateDietMacros(80,2200,"mediterranean");
  assert.ok(keto&&low&&regular);
  assert.ok(keto.carbohydrates<low.carbohydrates&&low.carbohydrates<regular.carbohydrates);
  assert.ok(keto.fat>low.fat&&low.fat>regular.fat);
});

test("combined restrictions never leak forbidden foods into meals or alternatives",()=>{
  const forbidden=[food("gluten",["carbohydrate"],{containsGluten:true}),food("milk",["protein"],{containsLactose:true}),food("meat",["protein"],{vegan:false,vegetarian:false,pescatarian:false})];
  const macros=calculateDietMacros(65,1900,"vegan");assert.ok(macros);
  const plan=buildPersonalizedMenu(intake({dietType:"vegan",restrictions:["gluten_free","lactose_free"]}),[...catalogue,...forbidden],1900,macros);
  assert.ok(plan);
  const ids=plan.days.flatMap(day=>day.meals.flatMap(meal=>meal.groups.flatMap(group=>group.items.map(item=>item.foodId))));
  assert.ok(!ids.some(id=>["gluten","milk","meat"].includes(id)));
});

test("a day's primary choices stay reasonably close to calorie and macro targets",()=>{
  const lean=[food("p1",["protein"],{calories:400,protein:100,carbs:0,fat:0}),food("p2",["protein"],{calories:400,protein:100,carbs:0,fat:0}),food("c1",["carbohydrate"],{calories:400,protein:0,carbs:100,fat:0}),food("c2",["carbohydrate"],{calories:400,protein:0,carbs:100,fat:0}),food("f1",["fat"],{calories:900,protein:0,carbs:0,fat:100}),food("f2",["fat"],{calories:900,protein:0,carbs:0,fat:100})];
  const macros=calculateDietMacros(80,2200,"mediterranean");assert.ok(macros);
  const plan=buildPersonalizedMenu(intake({mealCount:4}),lean,2200,macros);assert.ok(plan);
  const primary=plan.days[0].meals.flatMap(meal=>meal.groups.map(group=>group.items[0])).map(item=>({item,food:lean.find(entry=>entry.id===item.foodId)!}));
  const total=(field:"calories"|"protein"|"carbs"|"fat")=>primary.reduce((sum,{item,food})=>sum+food[field]*item.amount/100,0);
  assert.ok(Math.abs(total("calories")-2200)<=100);
  assert.ok(Math.abs(total("protein")-macros.protein)<=5);
  assert.ok(Math.abs(total("carbs")-macros.carbohydrates)<=12);
  assert.ok(Math.abs(total("fat")-macros.fat)<=5);
});
