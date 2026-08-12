"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, ChevronDown, ChevronUp, Copy, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import {
  recordCoachFoodSelection,
  saveMenuTree,
} from "@/app/actions/product";
import BottomSheet from "@/components/client/BottomSheet";
import FoodCombobox from "@/components/coach/menus/FoodCombobox";
import { calculateEnergy, GOAL_LABELS, isNutritionGoal, MISSING_LABELS, type NutritionGoal } from "@/lib/nutrition/energy";
import { foodsForGroup } from "@/lib/nutrition/food-groups";
import { planMacros, type MacroSources as PlanSources } from "@/lib/nutrition/macro-plan";
import { FIXED_MEAL_TITLES } from "@/lib/nutrition/menu-validation";
import { calculateAlternativePortion,defaultPortionQuantity,foodUnit,portionFor,unitLabel } from "@/lib/nutrition/meal-alternatives";
import type { Portion } from "@/lib/nutrition/meal-alternatives";

type FoodOption={id:string;name:string;brand:string|null;category?:string;calories:number;protein:number|null;carbs:number|null;fat:number|null;packageUnit:string|null;unitWeightGrams:number|null;isMaster?:boolean;masterGroup?:GroupType|null};
type FoodUsage={foodId:string;count:number;lastUsedAt:string;favorite:boolean};
type ClientOption=Readonly<{id:string;full_name:string;weight:number|null;calorieTarget:number|null;ageYears:number|null;sex:"male"|"female"|null;heightCm:number|null;dailySteps:number|null;weeklyWorkouts:number|null;nutritionGoal:string|null}>;
type Item={foodId:string;amount:number;amountSource?:"auto"|"manual"};
type GroupType="protein"|"carbohydrate"|"fat"|"vegetables";
type Group={type:GroupType;items:Item[]};
type Meal={title:typeof FIXED_MEAL_TITLES[number];notes:string;freeCalorieTarget:string;groups:Group[]};
type MacroSource="auto"|"manual";
type MacroSources={protein:MacroSource;carbohydrates:MacroSource;fat:MacroSource};
export type EditableMenu={id?:string;title:string;description:string;clientId:string;status:"draft"|"published"|"active";calorieTarget:string;proteinTarget:string;carbohydrateTarget:string;fatTarget:string;macroSources:MacroSources;meals:Meal[]};
const emptyMeal=():Meal=>({title:"ארוחת בוקר",notes:"",freeCalorieTarget:"",groups:[{type:"protein",items:[]},{type:"carbohydrate",items:[]}]});
const groupLabels:Record<GroupType,string>={protein:"קבוצת חלבון",carbohydrate:"קבוצת פחמימה",fat:"קבוצת שומן",vegetables:"קבוצת ירקות"};

export default function PersistentMenuEditor({initial,foods,clients,initialUsage}:{initial:EditableMenu;foods:FoodOption[];clients:readonly ClientOption[];initialUsage:FoodUsage[]}){
  const[menu,setMenu]=useState<EditableMenu>(()=>{
    const client=clients.find(item=>item.id===initial.clientId);
    const plan=planMacros({calories:Number(initial.calorieTarget),weightKg:client?.weight??Number.NaN,sources:planSources(initial.macroSources),current:{}});
    if(!plan.ok)return initial;
    return{...initial,
      proteinTarget:initial.macroSources.protein==="auto"&&!initial.proteinTarget?String(plan.plan.protein):initial.proteinTarget,
      carbohydrateTarget:initial.macroSources.carbohydrates==="auto"&&!initial.carbohydrateTarget?String(plan.plan.carbohydrates):initial.carbohydrateTarget,
      fatTarget:initial.macroSources.fat==="auto"&&!initial.fatTarget?String(plan.plan.fat):initial.fatTarget,
    };
  });
  // The goal drives the calorie target. It starts from whatever the client's
  // intake recorded and can be changed for this menu without editing the client.
  const[goal,setGoal]=useState<NutritionGoal|"">(()=>{
    const client=clients.find(item=>item.id===initial.clientId);
    return isNutritionGoal(client?.nutritionGoal)?client.nutritionGoal:"";
  });
  const[usage,setUsage]=useState(initialUsage);
  const[collapsed,setCollapsed]=useState<ReadonlySet<number>>(new Set());
  const toggleCollapsed=(index:number)=>setCollapsed(current=>{const next=new Set(current);if(next.has(index))next.delete(index);else next.add(index);return next});
  const[message,setMessage]=useState("");
  const[macroMessage,setMacroMessage]=useState("");
  // Which food slot the picker sheet is currently editing, if any.
  const[picker,setPicker]=useState<{mealIndex:number;groupIndex:number;itemIndex:number}|null>(null);
  const[pending,startTransition]=useTransition();
  const router=useRouter();
  const foodMap=useMemo(()=>new Map(foods.map(food=>[food.id,food])),[foods]);
  const selectedClient=clients.find(client=>client.id===menu.clientId);
  const totals=menu.meals.flatMap(meal=>meal.groups.flatMap(group=>group.items.slice(0,1))).reduce((sum,item)=>{
    const food=foodMap.get(item.foodId);
    const portion=food?portionFor(food,Number(item.amount||0)):null;
    return{
      calories:sum.calories+(portion?.calories??0),
      protein:sum.protein+(portion?.protein??0),
      carbs:sum.carbs+(portion?.carbs??0),
      fat:sum.fat+(portion?.fat??0),
    };
  },{calories:0,protein:0,carbs:0,fat:0});
  const updateMeal=(index:number,next:Meal)=>setMenu(current=>({...current,meals:current.meals.map((meal,i)=>i===index?next:meal)}));
  // What the client's own data says their day costs. Recomputed whenever the
  // client or the goal changes, and shown so the coach can see where a target
  // came from rather than being handed a number.
  const energyFor=(clientId:string,chosenGoal:NutritionGoal|"")=>{
    const client=clients.find(item=>item.id===clientId);
    if(!client)return null;
    return calculateEnergy({
      ageYears:client.ageYears??undefined,
      weightKg:client.weight??undefined,
      heightCm:client.heightCm??undefined,
      sex:client.sex??undefined,
      weeklyWorkouts:client.weeklyWorkouts??undefined,
      dailySteps:client.dailySteps??undefined,
      goal:chosenGoal||undefined,
    });
  };
  const energy=energyFor(menu.clientId,goal);

  // Recomputes every macro that is still automatic. A figure the coach typed is
  // left exactly as it was until they press "חשב מחדש".
  const applyPlan=(clientId:string,calorieTarget:string,force=false)=>{
    setMenu(current=>{
      const client=clients.find(item=>item.id===clientId);
      const sources=force?{protein:"auto" as const,carbohydrates:"auto" as const,fat:"auto" as const}:current.macroSources;
      const plan=planMacros({
        calories:Number(calorieTarget),
        weightKg:client?.weight??Number.NaN,
        sources:planSources(sources),
        current:{protein:Number(current.proteinTarget),fat:Number(current.fatTarget)},
      });
      if(!plan.ok){
        // Name the field that is actually missing. Blaming the weight when the
        // calorie target is the empty one sends the coach after the wrong thing.
        setMacroMessage(plan.reason==="negative_carbohydrates"
          ?"החלבון והשומן לבדם עוברים את יעד הקלוריות, ולכן הפחמימות יוצאות שליליות."
          :!clientId?"יש לבחור לקוח כדי לחשב יעדים אוטומטית."
            :!client?.weight?"ללקוח אין שקילה אחרונה, ולכן אין משקל לחישוב. אפשר להזין את היעדים ידנית."
              :"יש להזין יעד קלוריות כדי לחשב מאקרו אוטומטית.");
        return{...current,clientId,calorieTarget};
      }
      setMacroMessage(plan.warning??(force?"כל היעדים חושבו מחדש והם אוטומטיים.":"יעדי המאקרו עודכנו."));
      return{...current,clientId,calorieTarget,
        proteinTarget:String(plan.plan.protein),
        carbohydrateTarget:String(plan.plan.carbohydrates),
        fatTarget:String(plan.plan.fat),
        macroSources:{protein:sources.protein,carbohydrates:"auto",fat:sources.fat},
      };
    });
  };

  // Choosing a client computes their target from their own data. The coach's own
  // number is never overwritten - that is what the manual marker is for.
  const selectClient=(clientId:string)=>{
    const client=clients.find(candidate=>candidate.id===clientId);
    const nextGoal=isNutritionGoal(client?.nutritionGoal)?client.nutritionGoal:goal;
    setGoal(nextGoal);
    const computed=energyFor(clientId,nextGoal);
    const calorieTarget=computed?.ok
      ?String(computed.calorieTarget)
      :menu.calorieTarget||(client?.calorieTarget?String(Math.round(client.calorieTarget)):"");
    applyPlan(clientId,calorieTarget,true);
    if(computed&&!computed.ok)setMacroMessage(`לא ניתן לחשב יעד קלורי. חסר: ${computed.missing.map(field=>MISSING_LABELS[field]).join(", ")}.`);
  };

  // Changing the goal is an explicit instruction to recompute both the calories
  // and the macros.
  const changeGoal=(next:NutritionGoal|"")=>{
    setGoal(next);
    const computed=energyFor(menu.clientId,next);
    if(computed?.ok)applyPlan(menu.clientId,String(computed.calorieTarget),true);
    else if(computed)setMacroMessage(`לא ניתן לחשב יעד קלורי. חסר: ${computed.missing.map(field=>MISSING_LABELS[field]).join(", ")}.`);
  };

  // A calorie target the coach types is theirs; the macros follow it.
  const changeCalories=(calorieTarget:string)=>applyPlan(menu.clientId,calorieTarget);
  const recalculate=()=>{
    const computed=energyFor(menu.clientId,goal);
    applyPlan(menu.clientId,computed?.ok?String(computed.calorieTarget):menu.calorieTarget,true);
  };
  const selectFood=(mealIndex:number,groupIndex:number,itemIndex:number,foodId:string)=>{
    const meal=menu.meals[mealIndex];
    const group=meal.groups[groupIndex];
    const selectedFood=foodMap.get(foodId);
    const primary=group.items[0];
    const primaryFood=foodMap.get(primary?.foodId);
    const current=group.items[itemIndex];
    const currentFood=foodMap.get(current?.foodId);
    const referenceFood=itemIndex===0?currentFood:primaryFood;
    const referenceAmount=itemIndex===0?current?.amount:primary?.amount;
    const calculated=selectedFood&&referenceFood&&referenceAmount
      ?calculateAlternativePortion(referenceFood,referenceAmount,selectedFood,group.type==="carbohydrate"?"carbohydrate":"protein")
      :null;
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((item,index)=>index===itemIndex?{...item,foodId,amount:calculated?.quantity??(selectedFood&&!item.foodId?defaultPortionQuantity(selectedFood):item.amount),amountSource:calculated?"auto":item.amountSource}:item)}:value)});
    if(!foodId)return;
    const now=new Date().toISOString();
    setUsage(current=>{const previous=current.find(item=>item.foodId===foodId);return[{foodId,count:(previous?.count??0)+1,lastUsedAt:now,favorite:previous?.favorite??false},...current.filter(item=>item.foodId!==foodId)]});
    void recordCoachFoodSelection(foodId);
  };
  // One click fills a group with the master foods closest in calories to the
  // primary, each already scaled to an equivalent portion. Choosing three
  // alternatives by hand is the slowest part of building a menu.
  const suggestAlternatives=(mealIndex:number,groupIndex:number,count=3)=>{
    const meal=menu.meals[mealIndex];
    const group=meal.groups[groupIndex];
    const primary=group.items[0];
    const primaryFood=foodMap.get(primary?.foodId??"");
    if(!primaryFood||!primary?.amount)return;
    const target=portionFor(primaryFood,primary.amount);
    if(!target)return;
    const taken=new Set(group.items.map(item=>item.foodId));
    const suggestions=foods
      .filter(food=>food.masterGroup===group.type&&!taken.has(food.id)&&food.calories>0)
      .map(food=>({food,portion:calculateAlternativePortion(primaryFood,primary.amount,food,group.type==="carbohydrate"?"carbohydrate":"protein")}))
      .filter((entry):entry is{food:FoodOption;portion:Portion}=>Boolean(entry.portion))
      .sort((a,b)=>Math.abs(a.portion.calories-target.calories)-Math.abs(b.portion.calories-target.calories))
      .slice(0,count)
      .map(entry=>({foodId:entry.food.id,amount:entry.portion.quantity,amountSource:"auto" as const}));
    if(!suggestions.length){setMessage("אין מאכלי מאסטר מתאימים להצעה בקבוצה הזו.");return}
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:[...value.items,...suggestions]}:value)});
    for(const suggestion of suggestions)void recordCoachFoodSelection(suggestion.foodId);
  };
  const toggleFavorite=(...args:[string,boolean])=>void args;
  // The six-meal skeleton is a starting point. Meals the coach left untouched are
  // dropped on save rather than blocking it, and groups without a food go with them.
  const savedMeals=()=>menu.meals
    .map(meal=>meal.title==="קלוריות חופשיות"?meal:{...meal,groups:meal.groups.filter(group=>group.items.some(item=>item.foodId))})
    .filter(meal=>meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget)>0:meal.groups.length>0);
  const submit=()=>startTransition(async()=>{
    setMessage("");
    if(!savedMeals().length){setMessage("יש למלא לפחות ארוחה אחת לפני שמירה.");return}
    const result=await saveMenuTree({id:menu.id,title:menu.title,description:menu.description,clientId:menu.clientId,status:menu.status,calorieTarget:menu.calorieTarget,proteinTarget:menu.proteinTarget,carbohydrateTarget:menu.carbohydrateTarget,fatTarget:menu.fatTarget,proteinTargetSource:menu.macroSources.protein,carbohydrateTargetSource:menu.macroSources.carbohydrates,fatTargetSource:menu.macroSources.fat,activeFrom:menu.status==="active"?new Date().toISOString().slice(0,10):"",days:[{dayIndex:0,title:"יום רגיל",sortOrder:0,meals:savedMeals().map((meal,mealIndex)=>({...meal,sortOrder:mealIndex,groups:meal.groups.map((group,groupIndex)=>({...group,sortOrder:groupIndex,items:group.items.map((item,itemIndex)=>{const food=foodMap.get(item.foodId);const portion=food?portionFor(food,item.amount):null;return{...item,amount:portion?.grams??item.amount,displayQuantity:item.amount,measurementUnit:portion?.unit??"גרם",amountSource:item.amountSource??"manual",itemRole:itemIndex===0?"primary":"alternative",sortOrder:itemIndex}})}))}))}]});
    setMessage(result.message??"");
    if(result.ok&&result.id){router.replace(`/coach/menus/${result.id}`);router.refresh()}
  });
  return <main className="px-4 pb-20 pt-7 sm:px-6"><div className="mx-auto max-w-6xl">
    {/* The running calorie total lives in the sticky bar: on a phone the summary
        sits below six meals, which is exactly where it is no use. */}
    <div className="sticky top-0 z-30 -mx-4 mb-1 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7E5] bg-[#FFFFFF]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-black tracking-widest text-[#16A34A]">תפריט שמור</p>
        <h1 className="mt-1 truncate text-2xl font-black">{menu.id?"עריכת תפריט":"תפריט חדש"}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="pill">{Math.round(totals.calories+menu.meals.reduce((sum,meal)=>sum+(meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget||0):0),0))}{menu.calorieTarget?` / ${menu.calorieTarget}`:""} קל׳</span>
        <button type="button" onClick={submit} disabled={pending||!menu.title.trim()} className="premium-primary-button"><Save aria-hidden="true" size={18}/>{pending?"שומרים…":"שמירה"}</button>
      </div>
    </div>
    {message&&<p role="status" className="mt-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-sm">{message}</p>}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_300px]"><div className="space-y-4">
      <section className="grid gap-4 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
        <Field label="שם התפריט" value={menu.title} onChange={title=>setMenu({...menu,title})}/><Field label="תיאור" value={menu.description} onChange={description=>setMenu({...menu,description})}/>
        {/* Each select carries its own aria-label. A select wrapped in a <label>
            takes the label text concatenated with every option as its accessible
            name, so this one would announce as "מטרה לא נבחרה שימור חיטוב עדין…"
            and nothing looking it up by name could find it. */}
        <label className="text-sm font-bold">לקוח<select aria-label="לקוח" className="nutrition-input mt-2" value={menu.clientId} onChange={event=>selectClient(event.target.value)}><option value="">ללא שיוך</option>{clients.map(client=><option key={client.id} value={client.id}>{client.full_name}</option>)}</select>{selectedClient&&<span className="mt-1 block text-xs text-[#5B5F5B]">{selectedClient.weight?`משקל עדכני: ${selectedClient.weight} ק״ג`:"לא נמצא משקל עדכני"}</span>}</label>
        <label className="text-sm font-bold">סטטוס<select aria-label="סטטוס" className="nutrition-input mt-2" value={menu.status} onChange={event=>setMenu({...menu,status:event.target.value as EditableMenu["status"]})}><option value="draft">טיוטה</option><option value="published">פורסם</option><option value="active">פעיל</option></select></label>
        <label className="text-sm font-bold">מטרה
          <select aria-label="מטרה" className="nutrition-input mt-2" value={goal} onChange={event=>changeGoal(event.target.value as NutritionGoal|"")}>
            <option value="">לא נבחרה</option>
            {(Object.keys(GOAL_LABELS) as NutritionGoal[]).map(item=><option key={item} value={item}>{GOAL_LABELS[item]}</option>)}
          </select>
        </label>
        <MacroField label="יעד קלוריות" value={menu.calorieTarget} source={energy?.ok&&String(energy.calorieTarget)===menu.calorieTarget?"auto":"manual"} onChange={changeCalories}/>
        <MacroField label="יעד חלבון" value={menu.proteinTarget} source={menu.macroSources.protein} onChange={value=>setMenu({...menu,proteinTarget:value,macroSources:{...menu.macroSources,protein:"manual"}})}/>
        <MacroField label="יעד פחמימות" value={menu.carbohydrateTarget} source={menu.macroSources.carbohydrates} onChange={value=>setMenu({...menu,carbohydrateTarget:value,macroSources:{...menu.macroSources,carbohydrates:"manual"}})}/>
        <MacroField label="יעד שומן" value={menu.fatTarget} source={menu.macroSources.fat} onChange={value=>setMenu({...menu,fatTarget:value,macroSources:{...menu.macroSources,fat:"manual"}})}/>
        <div className="sm:col-span-2">
          {energy?.ok?<dl className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F8F7] p-3 text-xs sm:grid-cols-4">
            <div><dt className="text-[#5B5F5B]">BMR</dt><dd className="mt-0.5 font-black">{energy.bmr} קל׳</dd></div>
            <div><dt className="text-[#5B5F5B]">מקדם פעילות</dt><dd className="mt-0.5 font-black">×{energy.activityFactor}</dd></div>
            <div><dt className="text-[#5B5F5B]">הוצאה יומית</dt><dd className="mt-0.5 font-black">{energy.tdee} קל׳</dd></div>
            <div><dt className="text-[#5B5F5B]">יעד לפי המטרה</dt><dd className="mt-0.5 font-black text-[#16A34A]">{energy.calorieTarget} קל׳</dd></div>
          </dl>:energy&&!energy.ok?<p className="mb-3 rounded-2xl border border-dashed border-[#E5E7E5] p-3 text-xs text-[#5B5F5B]">לא ניתן לחשב יעד קלורי אוטומטי. חסר בכרטיס הלקוח: {energy.missing.map(field=>MISSING_LABELS[field]).join(", ")}.</p>:null}
          <button type="button" onClick={recalculate} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#16A34A]/40 px-4 text-sm font-bold text-[#16A34A]"><Calculator size={17}/>חשב מחדש</button>
          {macroMessage&&<p role="status" className="mt-2 text-xs text-[#5B5F5B]">{macroMessage}</p>}
        </div>
      </section>
      {menu.meals.map((meal,index)=><section key={index} className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5"><div className="flex gap-3"><button type="button" aria-expanded={!collapsed.has(index)} aria-label={collapsed.has(index)?"פתיחת הארוחה":"קיפול הארוחה"} onClick={()=>toggleCollapsed(index)} className="min-h-12 rounded-xl border border-[#E5E7E5] px-3 text-[#5B5F5B]">{collapsed.has(index)?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button><select aria-label={`סוג ארוחה ${index+1}`} className="nutrition-input" value={meal.title} onChange={event=>updateMeal(index,{...meal,title:event.target.value as Meal["title"]})}>{FIXED_MEAL_TITLES.map(title=><option key={title}>{title}</option>)}</select><button type="button" aria-label="שכפול ארוחה" onClick={()=>setMenu({...menu,meals:[...menu.meals.slice(0,index+1),structuredClone(meal),...menu.meals.slice(index+1)]})} className="min-h-12 rounded-xl border border-[#16A34A]/30 px-3 text-[#16A34A]"><Copy size={18}/></button><button type="button" aria-label="מחיקת ארוחה" onClick={()=>setMenu({...menu,meals:menu.meals.filter((_,i)=>i!==index)})} className="min-h-12 rounded-xl border border-[#DC2626]/30 px-3 text-[#DC2626]"><Trash2 size={18}/></button></div>
      {collapsed.has(index)?<p className="mt-3 text-xs text-[#5B5F5B]">{mealSummary(meal,foodMap)}</p>:<>
      {meal.title==="קלוריות חופשיות"?<div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="יעד קלורי" value={meal.freeCalorieTarget} type="number" onChange={freeCalorieTarget=>updateMeal(index,{...meal,freeCalorieTarget})}/><Field label="הערת מאמן" value={meal.notes} onChange={notes=>updateMeal(index,{...meal,notes})}/></div>:<>
      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">{meal.groups.filter(group=>group.type==="protein"||group.type==="carbohydrate").map((group,groupIndex)=>
        <div key={group.type} className="rounded-2xl border border-[#E5E7E5] p-4">
          <h3 className="font-black">{groupLabels[group.type]}</h3>
          <p className="mt-1 text-xs text-[#5B5F5B]">מאכל ראשי אחד, ומתחתיו חלופות בכמות מחושבת.</p>
          <div className="mt-3">{group.items.map((item,itemIndex)=>{
            const selectedFood=foodMap.get(item.foodId);
            const portion=selectedFood?portionFor(selectedFood,item.amount):null;
            const isPrimary=itemIndex===0;
            // Two lines rather than one. The name had been sharing a row with the
            // amount, the unit, the macros and two buttons, so it was the thing
            // that got truncated - and the name is the one part a coach cannot
            // work out from the others.
            return <div key={itemIndex} className="food-row" data-primary={isPrimary||undefined}>
              <div className="food-row__head">
                <span className={`pill${isPrimary?" pill--green":""}`}>{isPrimary?"ראשי":item.amountSource==="auto"?"אוטו׳":"ידני"}</span>
                <button type="button" className="food-row__pick" data-empty={selectedFood?undefined:true} onClick={()=>setPicker({mealIndex:index,groupIndex,itemIndex})}>
                  {selectedFood?`${selectedFood.name}${selectedFood.brand?` — ${selectedFood.brand}`:""}`:isPrimary?"בחירת מאכל ראשי":"בחירת מזון"}
                </button>
                {/* The primary is deletable too. It could not be removed before,
                    so a wrong choice meant rebuilding the group. Removing it
                    takes the alternatives with it: they were each scaled to this
                    food's portion, so on their own they are arbitrary numbers. */}
                <button
                  type="button"
                  aria-label={isPrimary?"מחיקת המאכל הראשי":"הסרת חלופה"}
                  onClick={()=>{
                    if(isPrimary&&group.items.length>1&&!window.confirm("מחיקת המאכל הראשי תאפס גם את החלופות שחושבו לפיו. להמשיך?"))return;
                    updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:isPrimary?[]:value.items.filter((_,i)=>i!==itemIndex)}:value)});
                  }}
                  className="rounded-xl border border-[#E5E7E5] p-2 text-[#DC2626]"
                ><Trash2 size={16}/></button>
              </div>
              <div className="food-row__body">
                <label className="food-row__amount"><span className="sr-only">כמות</span>
                  <input aria-label="כמות" className="nutrition-input" type="number" min="0.1" step="0.1" value={item.amount} onChange={event=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((food,i)=>i===itemIndex?{...food,amount:Number(event.target.value),amountSource:"manual"}:food)}:value)})}/>
                  <span>{selectedFood?unitLabel(foodUnit(selectedFood).unit,item.amount):"גרם"}</span>
                </label>
                {portion?<span className="food-row__meta">{portion.calories} קל׳ · ח {portion.protein} · פ {portion.carbs} · ש {portion.fat}</span>:null}
              </div>
            </div>})}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={()=>{updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:[...value.items,{foodId:"",amount:100,amountSource:"auto"}]}:value)});setPicker({mealIndex:index,groupIndex,itemIndex:group.items.length})}} className="chip"><Plus aria-hidden="true" size={15}/>{group.items.length?"הוספת חלופה":"בחירת מאכל ראשי"}</button>
            {group.items[0]?.foodId?<button type="button" onClick={()=>suggestAlternatives(index,groupIndex)} className="chip"><Sparkles aria-hidden="true" size={15}/>הוסף 3 חלופות מומלצות</button>:null}
          </div>
        </div>)}
      </div>
      </>}</>}</section>)}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-[#16A34A]/30 p-3">{FIXED_MEAL_TITLES.filter(title=>!menu.meals.some(meal=>meal.title===title)).map(title=><button key={title} type="button" onClick={()=>setMenu({...menu,meals:[...menu.meals,title==="קלוריות חופשיות"?{title,notes:"",freeCalorieTarget:"",groups:[]}:{...emptyMeal(),title}]})} className="min-h-11 rounded-xl border border-[#E5E7E5] px-4 text-sm font-bold text-[#16A34A]"><Plus size={15} className="inline"/> {title}</button>)}</div>
    </div><aside className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 lg:sticky lg:top-5"><h2 className="font-black">סיכום המזונות</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Total label="קלוריות" value={totals.calories+menu.meals.reduce((sum,meal)=>sum+(meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget||0):0),0)}/><Total label="חלבון (גרם)" value={totals.protein}/><Total label="פחמימה (גרם)" value={totals.carbs}/><Total label="שומן (גרם)" value={totals.fat}/></dl><h2 className="mt-6 border-t border-[#E5E7E5] pt-5 font-black">יעדי המאקרו</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><MacroTotal label="חלבון" value={menu.proteinTarget} calories={Number(menu.proteinTarget||0)*4} target={Number(menu.calorieTarget)}/><MacroTotal label="פחמימה" value={menu.carbohydrateTarget} calories={Number(menu.carbohydrateTarget||0)*4} target={Number(menu.calorieTarget)}/><MacroTotal label="שומן" value={menu.fatTarget} calories={Number(menu.fatTarget||0)*9} target={Number(menu.calorieTarget)}/></dl><p className="mt-4 text-xs leading-5 text-[#5B5F5B]">בעת השמירה השרת מחשב שוב את הערכים מהמאגר המאושר; ערכי הדפדפן אינם מקור סמכות.</p></aside></div>

    {/* One picker for the whole editor. It fills a sheet rather than hanging off
        the row it belongs to, so the search and the results have room. */}
    <BottomSheet
      open={Boolean(picker)}
      title={picker?groupLabels[menu.meals[picker.mealIndex]?.groups[picker.groupIndex]?.type??"protein"]:"בחירת מזון"}
      onClose={()=>setPicker(null)}
    >
      {picker&&<FoodCombobox
        foods={foodsForGroup(foods,menu.meals[picker.mealIndex]?.groups[picker.groupIndex]?.type??"protein")}
        value={menu.meals[picker.mealIndex]?.groups[picker.groupIndex]?.items[picker.itemIndex]?.foodId??""}
        usage={usage}
        onSelect={foodId=>{selectFood(picker.mealIndex,picker.groupIndex,picker.itemIndex,foodId);setPicker(null)}}
        onToggleFavorite={toggleFavorite}
        onClose={()=>setPicker(null)}
      />}
    </BottomSheet>
  </div></main>
}

// The saved menu tracks three sources; the plan engine also tracks the calorie
// target's. Calories are always the coach's decision here, so they map to manual.
function planSources(sources:MacroSources):PlanSources{return{calories:"manual",protein:sources.protein,carbohydrates:sources.carbohydrates,fat:sources.fat}}
function Field({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:string}){return <label className="text-sm font-bold">{label}<input className="nutrition-input mt-2" type={type} min={type==="number"?"1":undefined} value={value} onChange={event=>onChange(event.target.value)}/></label>}
function MacroField({label,value,source,onChange}:{label:string;value:string;source:MacroSource;onChange:(value:string)=>void}){return <label className="text-sm font-bold"><span className="flex items-center justify-between gap-2"><span>{label}</span><span className={`text-[10px] ${source==="auto"?"text-[#16A34A]":"text-[#0B0B0B]"}`}>{source==="auto"?"מחושב אוטומטית":"הוזן ידנית"}</span></span><input className="nutrition-input mt-2" type="number" min="0" value={value} onChange={event=>onChange(event.target.value)}/></label>}
function Total({label,value}:{label:string;value:number}){return <div><dt className="text-[#5B5F5B]">{label}</dt><dd className="mt-1 font-black">{value.toFixed(1)}</dd></div>}
function MacroTotal({label,value,calories,target}:{label:string;value:string;calories:number;target:number}){return <div><dt className="text-[#5B5F5B]">{label}</dt><dd className="mt-1 font-black">{value||"—"} גרם</dd><p className="text-[10px] text-[#5B5F5B]">{target>0?`${Math.round(calories/target*100)}%`:"—"}</p></div>}

function mealSummary(meal:Meal,foodMap:Map<string,FoodOption>):string{
  if(meal.title==="קלוריות חופשיות")return meal.freeCalorieTarget?`${meal.freeCalorieTarget} קל׳ חופשיות`:"ללא יעד קלורי";
  const primaries=meal.groups.map(group=>group.items[0]).filter(Boolean);
  const calories=primaries.reduce((sum,item)=>{
    const food=foodMap.get(item.foodId);
    const portion=food?portionFor(food,Number(item.amount||0)):null;
    return sum+(portion?.calories??0);
  },0);
  const options=meal.groups.map(group=>`${group.type==="protein"?"חלבון":"פחמימה"} ${group.items.length}`).join(" · ");
  return primaries.length?`${Math.round(calories)} קל׳ · ${options}`:"עדיין ריקה";
}
