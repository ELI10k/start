"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calculator, ChevronDown, ChevronUp, Copy, Eye, GripVertical, Plus, Save, Sparkles, Star, Trash2 } from "lucide-react";
import {
  recordCoachFoodSelection,
  saveMenuTree,
  setCoachFoodFavorite,
} from "@/app/actions/product";
import BottomSheet from "@/components/client/BottomSheet";
import FoodCombobox from "@/components/coach/menus/FoodCombobox";
import { calculateEnergy, GOAL_LABELS, isNutritionGoal, MISSING_LABELS, type NutritionGoal } from "@/lib/nutrition/energy";
import { foodsForGroup } from "@/lib/nutrition/food-groups";
import { isCompatibleProtein, proteinKind } from "@/lib/nutrition/protein-kind";
import { planMacros, type MacroSources as PlanSources } from "@/lib/nutrition/macro-plan";
import { FIXED_MEAL_TITLES } from "@/lib/nutrition/menu-validation";
import { calculateAlternativePortion,convertQuantity,defaultPortionQuantity,foodUnit,GROUP_CALORIE_SHARE,hasNaturalUnit,MEAL_CALORIE_SHARE,portionFor,portionForCalories,unitLabel } from "@/lib/nutrition/meal-alternatives";
import type { Portion } from "@/lib/nutrition/meal-alternatives";
import { israelDateKey } from "@/lib/date-time";

type FoodOption={id:string;name:string;brand:string|null;category?:string;calories:number;protein:number|null;carbs:number|null;fat:number|null;packageUnit:string|null;unitWeightGrams:number|null;isMaster?:boolean;masterGroup?:GroupType|null};
// favorite is null when the coach has said nothing either way.
type FoodUsage={foodId:string;count:number;lastUsedAt:string;favorite:boolean|null};
type ClientOption=Readonly<{id:string;full_name:string;weight:number|null;calorieTarget:number|null;ageYears:number|null;sex:"male"|"female"|null;heightCm:number|null;dailySteps:number|null;weeklyWorkouts:number|null;nutritionGoal:string|null}>;
// `unitMode` is which unit `amount` is counted in. "native" is the food's own -
// a pita, a slice, an egg - and "gram" is grams. A food without a natural unit
// is always grams and the picker is not offered for it.
type Item={foodId:string;amount:number;amountSource?:"auto"|"manual";note?:string;primary?:boolean;unitMode?:"native"|"gram"};
type GroupType="protein"|"carbohydrate"|"fat"|"vegetables";
type Group={type:GroupType;items:Item[]};
type Meal={title:typeof FIXED_MEAL_TITLES[number];notes:string;freeCalorieTarget:string;groups:Group[]};
type StoredDraft={menu:EditableMenu;goal:NutritionGoal|"";at:string};
type MacroSource="auto"|"manual";
type MacroSources={protein:MacroSource;carbohydrates:MacroSource;fat:MacroSource};
// A menu is one or more days. Day 0 is the default and is what a client is
// served on any weekday the menu does not name explicitly; adding day 2 gives
// that client a different Tuesday and leaves the rest of the week on day 0.
// The schema and the client-side reader have always supported this - meals carry
// a day_index and getActiveClientMenu already picks by weekday - and the editor
// was the only part that could not express it, always saving a single "יום רגיל".
export type EditableDay={dayIndex:number;meals:Meal[]};
export type EditableMenu={id?:string;title:string;description:string;clientId:string;status:"draft"|"published"|"active";calorieTarget:string;proteinTarget:string;carbohydrateTarget:string;fatTarget:string;macroSources:MacroSources;days:EditableDay[]};

// Sunday is 0, matching the reader's weekday index. Shared with the preview
// screen, which has to name the same day the same way.
export { WEEKDAY_LABELS } from "@/lib/nutrition/menu-days";
import { dayLabel, WEEKDAY_LABELS } from "@/lib/nutrition/menu-days";
const emptyGroups=():Group[]=>[{type:"protein",items:[]},{type:"carbohydrate",items:[]},{type:"fat",items:[]},{type:"vegetables",items:[]}];
const emptyMeal=():Meal=>({title:"ארוחת בוקר",notes:"",freeCalorieTarget:"",groups:emptyGroups()});
const groupLabels:Record<GroupType,string>={protein:"קבוצת חלבון",carbohydrate:"קבוצת פחמימה",fat:"קבוצת שומן",vegetables:"קבוצת ירקות"};

export default function PersistentMenuEditor({initial,foods,clients,initialUsage}:{initial:EditableMenu;foods:FoodOption[];clients:readonly ClientOption[];initialUsage:FoodUsage[]}){
  const[menu,setMenu]=useState<EditableMenu>(()=>{
    const client=clients.find(item=>item.id===initial.clientId);
    const plan=planMacros({calories:Number(initial.calorieTarget),weightKg:client?.weight??Number.NaN,sources:planSources(initial.macroSources),current:{}});
    const withGroups={...initial,days:initial.days.map(day=>({...day,meals:day.meals.map(meal=>meal.title==="קלוריות חופשיות"?meal:{...meal,groups:emptyGroups().map(empty=>meal.groups.find(group=>group.type===empty.type)??empty)})}))};
    if(!plan.ok)return withGroups;
    return{...withGroups,
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
  // Which meals are folded up, by position in the day on screen.
  //
  // Position is the only handle a meal has - they carry no id - so every edit
  // that shifts positions has to move this set with it. Without that, folding
  // breakfast and then dragging it down left the *new* first meal folded and
  // breakfast open, deleting a meal folded its neighbour, and switching to a
  // second day carried the first day's folds onto a different list entirely.
  // Which day is on screen. Everything below edits this day; the rest of the
  // menu - name, client, targets - is shared by all of them.
  const[activeDay,setActiveDay]=useState(0);
  const[collapsed,setCollapsed]=useState<ReadonlySet<number>>(new Set());
  const toggleCollapsed=(index:number)=>setCollapsed(current=>{const next=new Set(current);if(next.has(index))next.delete(index);else next.add(index);return next});
  // Applies the same index shift to the folds that the edit applied to the meals.
  const remapCollapsed=(move:(index:number)=>number|null)=>setCollapsed(current=>{
    const next=new Set<number>();
    for(const index of current){const moved=move(index);if(moved!==null)next.add(moved)}
    return next;
  });
  const showDay=(dayIndex:number)=>{setActiveDay(dayIndex);setCollapsed(new Set())};
  const[message,setMessage]=useState("");
  // Whether the last message was a refusal. A save that failed and a save that
  // worked used to look identical - the same grey box - which is no way to find
  // out that nothing was stored.
  const[messageTone,setMessageTone]=useState<"ok"|"error">("ok");
  const say=(text:string,tone:"ok"|"error"="ok")=>{setMessage(text);setMessageTone(tone)};
  const[macroMessage,setMacroMessage]=useState("");
  // Which food slot the picker sheet is currently editing, if any.
  const[picker,setPicker]=useState<{mealIndex:number;groupIndex:number;itemIndex:number}|null>(null);
  // Which row is being dragged. Held in state rather than in the drag payload
  // because Safari does not expose dataTransfer during dragover, and the drop
  // target has to know where the row came from to decide whether it is a no-op.
  const[dragRow,setDragRow]=useState<{mealIndex:number;groupIndex:number;itemIndex:number}|null>(null);
  const[pending,startTransition]=useTransition();
  // A menu is thirty minutes of work held in a browser tab. Until now nothing
  // guarded it: a closed tab, a stray refresh or a crash took the lot, and the
  // save-failure message could only say "it is still here until you reload".
  // Three things now stand between the coach and that: the tab asks before it
  // closes, a draft is mirrored to this device every second, and the header says
  // out loud whether the work is on the server or only here.
  const[dirty,setDirty]=useState(false);
  const[savedAt,setSavedAt]=useState("");
  const[draft,setDraft]=useState<StoredDraft|null>(null);
  const draftKey=`start:menu-draft:${initial.id||"new"}`;
  const mounted=useRef(false);
  const router=useRouter();
  const foodMap=useMemo(()=>new Map(foods.map(food=>[food.id,food])),[foods]);
  const usageMap=useMemo(()=>new Map(usage.map(item=>[item.foodId,item])),[usage]);

  const meals=menu.days.find(day=>day.dayIndex===activeDay)?.meals??menu.days[0]?.meals??[];
  const setMeals=(next:Meal[]|((current:Meal[])=>Meal[]))=>setMenu(current=>({...current,
    days:current.days.map(day=>day.dayIndex===activeDay?{...day,meals:typeof next==="function"?next(day.meals):next}:day)}));

  // Anything the coach touches marks the menu dirty and schedules a draft write.
  // The first pass is the mount, which is not an edit.
  useEffect(()=>{
    if(!mounted.current){mounted.current=true;return}
    setDirty(true);
    const timer=window.setTimeout(()=>{
      try{window.localStorage.setItem(draftKey,JSON.stringify({menu,goal,at:new Date().toISOString()}))}catch{/* a full or private store is not a reason to break the editor */}
    },1000);
    return()=>window.clearTimeout(timer);
  },[menu,goal,draftKey]);

  useEffect(()=>{
    const guard=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=""}};
    window.addEventListener("beforeunload",guard);
    return()=>window.removeEventListener("beforeunload",guard);
  },[dirty]);

  // Read once, on arrival: a draft left behind by a previous visit is offered
  // rather than applied, because the version on the server may be the newer one.
  //
  // The state has to be set from an effect rather than from a lazy initialiser.
  // localStorage does not exist during the server render, so an initialiser would
  // return nothing on the server and the draft on the client, and the two renders
  // would disagree. Reading after mount is the only version that hydrates.
  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(draftKey);
      if(!raw)return;
      const parsed=JSON.parse(raw) as StoredDraft;
      // A draft from before the day model has no days array; it is not offered
      // rather than restored into a shape the editor can no longer read.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, see above
      if(Array.isArray(parsed?.menu?.days))setDraft(parsed);
    }catch{/* an unreadable draft is simply not offered */}
  },[draftKey]);

  const discardDraft=()=>{
    setDraft(null);
    try{window.localStorage.removeItem(draftKey)}catch{/* nothing to clear */}
  };
  const restoreDraft=()=>{
    if(!draft)return;
    setMenu(draft.menu);
    setGoal(draft.goal);
    setDraft(null);
    say("הטיוטה שנשמרה במכשיר שוחזרה. יש ללחוץ שמירה כדי לשלוח אותה לשרת.");
  };
  // A manual coach choice overrides the curated default, and only a manual choice
  // does. This used to be "does a usage row exist?", but a usage row appears the
  // first time a food is *selected* - so choosing a curated master food demoted
  // it out of favourites for good, and the curated list emptied itself through
  // use. Null now means the coach has expressed no opinion and the curated status
  // stands; only the star writes true or false.
  const isFavorite=(food:FoodOption)=>usageMap.get(food.id)?.favorite??Boolean(food.isMaster);
  const selectedClient=clients.find(client=>client.id===menu.clientId);
  // A group can hold more than one primary now - "ביצה 1 + 2 לבני ביצה" is one
  // protein portion built from two foods - so the totals add every primary and
  // still ignore the alternatives, which are swaps rather than extras.
  const primariesOf=(group:Group)=>group.items.filter((item,index)=>item.foodId&&(item.primary??index===0));
  const macrosOf=(items:readonly Item[])=>items.reduce((sum,item)=>{
    const food=foodMap.get(item.foodId);
    const portion=food?portionFor(food,Number(item.amount||0),item.unitMode??"native"):null;
    return{calories:sum.calories+(portion?.calories??0),protein:sum.protein+(portion?.protein??0),carbs:sum.carbs+(portion?.carbs??0),fat:sum.fat+(portion?.fat??0)};
  },{calories:0,protein:0,carbs:0,fat:0});
  const mealMacros=(meal:Meal)=>meal.title==="קלוריות חופשיות"
    ?{calories:Number(meal.freeCalorieTarget||0),protein:0,carbs:0,fat:0}
    :macrosOf(meal.groups.flatMap(primariesOf));
  const totals=meals.flatMap(meal=>meal.groups.flatMap(primariesOf)).reduce((sum,item)=>{
    const food=foodMap.get(item.foodId);
    const portion=food?portionFor(food,Number(item.amount||0),item.unitMode??"native"):null;
    return{
      calories:sum.calories+(portion?.calories??0),
      protein:sum.protein+(portion?.protein??0),
      carbs:sum.carbs+(portion?.carbs??0),
      fat:sum.fat+(portion?.fat??0),
    };
  },{calories:0,protein:0,carbs:0,fat:0});
  const updateMeal=(index:number,next:Meal)=>setMeals(current=>current.map((meal,i)=>i===index?next:meal));
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
  // Order inside a group is the order the client reads, and until now it was
  // whatever order the foods were added in. Rows can be dragged; the arrows do
  // the same thing with a thumb, which drag-and-drop does not.
  const moveItem=(mealIndex:number,groupIndex:number,from:number,to:number)=>{
    const meal=meals[mealIndex];
    const group=meal?.groups[groupIndex];
    if(!group||to<0||to>=group.items.length||from===to)return;
    const items=[...group.items];
    const[moved]=items.splice(from,1);
    items.splice(to,0,moved);
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items}:value)});
  };
  // Changing a primary's quantity has to carry its alternatives with it.
  //
  // An alternative is an equivalent portion of the primary - that is the whole
  // idea - but it was only ever calculated at the moment it was chosen. Editing
  // the primary from 150 g to 200 g afterwards left every alternative sitting at
  // its old quantity, so the client was offered a swap that no longer matched
  // what it was a swap for. Only rows still marked auto are moved; a quantity the
  // coach typed themselves is theirs and is left exactly as it is.
  // Meals were fixed in the order they happened to be created, so a menu built
  // breakfast → dinner → lunch stayed that way, and the client read it that way.
  // Same two arrows the food rows already have.
  const moveMeal=(from:number,to:number)=>{
    if(to<0||to>=meals.length||from===to)return;
    setMeals(current=>{const next=[...current];const[moved]=next.splice(from,1);next.splice(to,0,moved);return next});
    remapCollapsed(index=>{
      if(index===from)return to;
      if(from<to)return index>from&&index<=to?index-1:index;
      return index>=to&&index<from?index+1:index;
    });
  };

  const changeAmount=(mealIndex:number,groupIndex:number,itemIndex:number,amount:number)=>{
    const meal=meals[mealIndex];
    const group=meal?.groups[groupIndex];
    if(!meal||!group)return;
    const edited=group.items[itemIndex];
    const editedIsPrimary=edited?.primary??itemIndex===0;
    const editedFood=foodMap.get(edited?.foodId??"");
    const items=group.items.map((item,i)=>{
      if(i===itemIndex)return{...item,amount,amountSource:"manual" as const};
      if(!editedIsPrimary||!editedFood||!amount)return item;
      const isPrimary=item.primary??i===0;
      if(isPrimary||item.amountSource!=="auto")return item;
      const alternativeFood=foodMap.get(item.foodId);
      if(!alternativeFood)return item;
      const portion=calculateAlternativePortion(editedFood,amount,alternativeFood,group.type,edited?.unitMode??"native");
      // The alternative comes back in its own natural unit, so its row is put
      // back into that unit alongside the number.
      return portion?{...item,amount:portion.quantity,unitMode:"native" as const}:item;
    });
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items}:value)});
  };

  // Switching a row between its own unit and grams keeps the portion the same
  // size: 1 פיתה becomes 100 גרם, not 1 גרם.
  const changeUnitMode=(mealIndex:number,groupIndex:number,itemIndex:number,next:"native"|"gram")=>{
    const meal=meals[mealIndex];
    const group=meal?.groups[groupIndex];
    const item=group?.items[itemIndex];
    const food=foodMap.get(item?.foodId??"");
    if(!meal||!group||!item||!food)return;
    const current=item.unitMode??"native";
    if(current===next)return;
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((row,i)=>
      i===itemIndex?{...row,unitMode:next,amount:convertQuantity(food,Number(row.amount||0),current,next)}:row)}:value)});
  };

  const dropRow=(mealIndex:number,groupIndex:number,itemIndex:number)=>{
    const origin=dragRow;
    setDragRow(null);
    // Reordering happens inside one group: a protein alternative dropped into the
    // carbohydrate group would be scaled against the wrong primary.
    if(!origin||origin.mealIndex!==mealIndex||origin.groupIndex!==groupIndex)return;
    moveItem(mealIndex,groupIndex,origin.itemIndex,itemIndex);
  };

  // What the open picker may offer. Inside a protein group an alternative is
  // restricted to the primary's kind, so a dairy portion never lists meat.
  const pickerGroup=picker?meals[picker.mealIndex]?.groups[picker.groupIndex]:undefined;
  const pickerPrimaryFood=pickerGroup?foodMap.get(pickerGroup.items.find((item,index)=>item.foodId&&(item.primary??index===0))?.foodId??""):undefined;
  const pickerIsAlternative=Boolean(picker&&pickerGroup&&!(pickerGroup.items[picker.itemIndex]?.primary??picker.itemIndex===0));
  const pickerFoods=useMemo(()=>{
    const list=foodsForGroup(foods,pickerGroup?.type??"protein");
    if(pickerGroup?.type!=="protein"||!pickerIsAlternative||!pickerPrimaryFood)return list;
    return list.filter(food=>isCompatibleProtein(pickerPrimaryFood,food));
  },[foods,pickerGroup?.type,pickerIsAlternative,pickerPrimaryFood]);
  const pickerTitle=(()=>{
    const label=groupLabels[pickerGroup?.type??"protein"];
    if(pickerGroup?.type!=="protein"||!pickerIsAlternative||!pickerPrimaryFood)return label;
    const kind=proteinKind(pickerPrimaryFood);
    return kind==="neutral"?`${label} · חלופה`:`${label} · חלופות ${kind==="dairy"?"חלביות":"בשריות"}`;
  })();
  const selectFood=(mealIndex:number,groupIndex:number,itemIndex:number,foodId:string)=>{
    const meal=meals[mealIndex];
    const group=meal.groups[groupIndex];
    const selectedFood=foodMap.get(foodId);
    // The primary is whichever row is marked one, not row zero. "מאכל ראשי נוסף"
    // appends a second primary, and treating position as the marker sent that
    // row down the alternative path - so "2 לבני ביצה" beside "ביצה 1" arrived
    // already scaled to cost the same calories as the whole egg, which is the
    // opposite of what a second primary is for.
    const primary=group.items.find((item,index)=>item.foodId&&(item.primary??index===0));
    const primaryFood=foodMap.get(primary?.foodId??"");
    const current=group.items[itemIndex];
    const currentFood=foodMap.get(current?.foodId);
    const targetIsPrimary=current?.primary??itemIndex===0;
    // Replacing an existing primary keeps its portion equivalent; a new primary
    // has no food to be equivalent to and gets its own default portion.
    const referenceFood=targetIsPrimary?currentFood:primaryFood;
    const referenceAmount=targetIsPrimary?current?.amount:primary?.amount;
    const referenceMode=(targetIsPrimary?current?.unitMode:primary?.unitMode)??"native";
    const calculated=selectedFood&&referenceFood&&referenceAmount
      ?calculateAlternativePortion(referenceFood,referenceAmount,selectedFood,group.type,referenceMode)
      :null;
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((item,index)=>index===itemIndex?{...item,foodId,amount:calculated?.quantity??(selectedFood&&!item.foodId?defaultPortionQuantity(selectedFood):item.amount),amountSource:calculated?"auto":item.amountSource,unitMode:"native" as const}:item)}:value)});
    if(!foodId)return;
    const now=new Date().toISOString();
    // Carry the existing opinion forward rather than inventing "not a favourite":
    // that invention was the browser-side half of the same bug.
    setUsage(current=>{const previous=current.find(item=>item.foodId===foodId);return[{foodId,count:(previous?.count??0)+1,lastUsedAt:now,favorite:previous?.favorite??null},...current.filter(item=>item.foodId!==foodId)]});
    void recordCoachFoodSelection(foodId);
  };
  // One click fills a group with the master foods closest in calories to the
  // primary, each already scaled to an equivalent portion. Choosing three
  // alternatives by hand is the slowest part of building a menu.
  const suggestAlternatives=(mealIndex:number,groupIndex:number,count=3)=>{
    const meal=meals[mealIndex];
    const group=meal.groups[groupIndex];
    const primary=group.items.find((item,index)=>item.foodId&&(item.primary??index===0));
    const primaryFood=foodMap.get(primary?.foodId??"");
    if(!primaryFood||!primary?.amount)return;
    const primaryMode=primary.unitMode??"native";
    const target=portionFor(primaryFood,primary.amount,primaryMode);
    if(!target)return;
    const taken=new Set(group.items.map(item=>item.foodId));
    // Inside a protein group a dairy primary is only ever swapped for dairy (or
    // for a pareve food), and a meat primary for meat. Ranking by calories alone
    // put chicken breast under cottage cheese.
    const suggestions=foodsForGroup(foods,group.type)
      .filter(food=>isFavorite(food)&&!taken.has(food.id)&&food.calories>0)
      .filter(food=>group.type!=="protein"||isCompatibleProtein(primaryFood,food))
      .map(food=>({food,portion:calculateAlternativePortion(primaryFood,primary.amount,food,group.type,primaryMode)}))
      .filter((entry):entry is{food:FoodOption;portion:Portion}=>Boolean(entry.portion))
      .sort((a,b)=>Math.abs(a.portion.calories-target.calories)-Math.abs(b.portion.calories-target.calories))
      .slice(0,count)
      .map(entry=>({foodId:entry.food.id,amount:entry.portion.quantity,amountSource:"auto" as const}));
    if(!suggestions.length){setMessage(group.type==="protein"?`אין חלופות ${proteinKind(primaryFood)==="dairy"?"חלביות":"בשריות"} מועדפות שמתאימות ל${primaryFood.name}.`:"אין מאכלים מועדפים מתאימים להצעה בקבוצה הזו.");return}
    updateMeal(mealIndex,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:[...value.items,...suggestions]}:value)});
    for(const suggestion of suggestions)void recordCoachFoodSelection(suggestion.foodId);
  };
  const toggleFavorite=(foodId:string,favorite:boolean)=>{
    setUsage(current=>{
      const previous=current.find(item=>item.foodId===foodId);
      return[{foodId,count:previous?.count??0,lastUsedAt:previous?.lastUsedAt??"",favorite},...current.filter(item=>item.foodId!==foodId)];
    });
    void setCoachFoodFavorite(foodId,favorite)
      .then(result=>{if(!result.ok){setMessage(result.message??"המועדף לא נשמר.");setUsage(current=>current.map(item=>item.foodId===foodId?{...item,favorite:!favorite}:item))}})
      // Same failure as the save above, and it used to pass silently: the star
      // stayed on until the next reload and then quietly came back off.
      .catch(()=>{setMessage("סימון המועדף לא הגיע לשרת. יש לרענן את העמוד ולנסות שוב.");setUsage(current=>current.map(item=>item.foodId===foodId?{...item,favorite:!favorite}:item))});
  };
  // A complete first draft in one click, sized to the calorie target rather than
  // handed every food its flat default portion. The day's calories are split
  // across the meals, each meal's across its groups, and each food is then given
  // the quantity that costs its share - so the draft lands near the target
  // instead of wherever 100 g of five foods happened to add up to. The strict
  // group classifier still guarantees a carbohydrate cannot reach a protein slot.
  const fillDayFromFavorites=()=>{
    const favoritesFor=(type:GroupType)=>foodsForGroup(foods,type).filter(isFavorite);
    const pools:Record<GroupType,FoodOption[]>={
      protein:favoritesFor("protein"),
      carbohydrate:favoritesFor("carbohydrate"),
      fat:favoritesFor("fat"),
      vegetables:favoritesFor("vegetables"),
    };
    if(!pools.protein.length||!pools.carbohydrate.length){setMessage("כדי למלא יום במהירות צריך לפחות מזון מועדף אחד בחלבון ואחד בפחמימה.");return}

    // The free-calorie meal has its own figure and is not part of the split.
    const freeCalories=meals.reduce((sum,meal)=>sum+(meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget||0):0),0);
    const dayCalories=Math.max(0,Number(menu.calorieTarget||0)-freeCalories);
    const structuredMeals=meals.filter(meal=>meal.title!=="קלוריות חופשיות");
    // Only the meals actually on the board share the day, so a four-meal menu
    // does not quietly plan for five.
    const shareTotal=structuredMeals.reduce((sum,meal)=>sum+(MEAL_CALORIE_SHARE[meal.title]??0),0)||1;

    // Counted here rather than inside the updater. React runs a functional
    // update during the next render, not on the line that schedules it, so the
    // counter was still zero when the message was built - every fill reported
    // "נוצרה טיוטת יום מ־0 מזונות מועדפים" no matter how many it had placed.
    let filled=0;
    const nextMeals=meals.map((meal,mealIndex)=>{
      if(meal.title==="קלוריות חופשיות")return meal;
      const mealCalories=dayCalories*((MEAL_CALORIE_SHARE[meal.title]??0)/shareTotal);
      // Groups the coach left empty are the ones to fill; anything already chosen
      // is their decision and is left exactly as it is.
      const emptyGroups=meal.groups.filter(group=>!group.items.some(item=>item.foodId)&&pools[group.type].length);
      const budgetTotal=emptyGroups.reduce((sum,group)=>sum+GROUP_CALORIE_SHARE[group.type],0);
      return{...meal,groups:meal.groups.map(group=>{
        if(group.items.some(item=>item.foodId))return group;
        const pool=pools[group.type];
        if(!pool.length)return group;
        const share=budgetTotal>0?GROUP_CALORIE_SHARE[group.type]/budgetTotal:0;
        const budget=mealCalories*share;
        // Which food, not just which quantity.
        //
        // This used to take pool[mealIndex] and force it to the budget, so a
        // 200-calorie protein slot filled with ten egg whites - arithmetically
        // right, and not a portion anybody eats. Countable units are capped
        // now, which means one food can no longer stretch to any budget, so the
        // choice of food is what has to do the work: rank the pool by how close
        // a sensible portion of each lands to the budget, then rotate among the
        // best few so the same food does not appear in all five meals.
        const ranked=budget>0
          ?pool
            .map(candidate=>({candidate,portion:portionForCalories(candidate,budget)}))
            .filter((entry):entry is{candidate:FoodOption;portion:Portion}=>Boolean(entry.portion))
            .sort((a,b)=>Math.abs(a.portion.calories-budget)-Math.abs(b.portion.calories-budget))
          :[];
        const choice=ranked.slice(0,3)[mealIndex%Math.max(1,Math.min(3,ranked.length))];
        const food=choice?.candidate??pool[mealIndex%pool.length];
        if(!food)return group;
        const portion=choice?.portion??(budget>0?portionForCalories(food,budget):null);
        filled+=1;
        return{...group,items:[{foodId:food.id,amount:portion?.quantity??defaultPortionQuantity(food),amountSource:"auto" as const}]};
      })};
    });
    setMeals(nextMeals);
    // What it produced, against what was asked for - not a promise that the two
    // match. Portions are capped at something a person eats, so a day can land
    // short of its target, and saying so is more use than implying it did not.
    const draftCalories=Math.round(nextMeals.reduce((sum,meal)=>meal.title==="קלוריות חופשיות"
      ?sum+Number(meal.freeCalorieTarget||0)
      :sum+macrosOf(meal.groups.flatMap(primariesOf)).calories,0));
    setMessage(dayCalories>0
      ?`נוצרה טיוטת יום מ־${filled} מזונות מועדפים: ${draftCalories} קלוריות מול יעד של ${Math.round(Number(menu.calorieTarget||0))}. המנות מוגבלות לגודל סביר, אז כדאי לעבור ולכוונן.`
      :"נוצרה טיוטת יום מהמזונות המועדפים. ללא יעד קלורי הכמויות הן מנות ברירת מחדל - כדאי להזין יעד ולמלא שוב.");
  };
  // The six-meal skeleton is a starting point. Meals the coach left untouched are
  // dropped on save rather than blocking it, and groups without a food go with them.
  // A new day starts as a copy of the day on screen. Building "training day" from
  // scratch when it differs from the default by one meal is the slow way, and it
  // is the way a blank day forces.
  const addDay=(dayIndex:number)=>{
    if(menu.days.some(day=>day.dayIndex===dayIndex))return;
    const source=menu.days.find(day=>day.dayIndex===activeDay)??menu.days[0];
    setMenu(current=>({...current,days:[...current.days,{dayIndex,meals:structuredClone(source?.meals??[])}].sort((a,b)=>a.dayIndex-b.dayIndex)}));
    showDay(dayIndex);
    setMessage(`נוסף ${dayLabel(dayIndex)} כעותק של ${dayLabel(activeDay)}. כל שינוי כאן חל רק על היום הזה.`);
  };
  // Day 0 is the fallback for every weekday that has no day of its own, so it is
  // the one day that cannot be removed.
  const removeDay=(dayIndex:number)=>{
    if(dayIndex===0)return;
    setMenu(current=>({...current,days:current.days.filter(day=>day.dayIndex!==dayIndex)}));
    showDay(0);
  };

  // Empty slots are dropped, not sent. "הוספת חלופה" creates a blank row and the
  // editor is the thing that created it, so a coach who added one and did not
  // fill it has not made a mistake - they have an unused slot. It used to travel
  // to the server anyway, where the validator refused the WHOLE menu with "יש
  // לבחור מזון בכל חלופה", and on a long menu that message was off-screen. One
  // stray blank row made everything unsavable.
  //
  // The three filters run in order: blank rows go, then groups left with nothing
  // in them, then meals left with no groups.
  const savedMealsOf=(dayMeals:readonly Meal[])=>dayMeals
    .map(meal=>meal.title==="קלוריות חופשיות"?meal:{...meal,groups:meal.groups
      .map(group=>({...group,items:group.items.filter(item=>item.foodId&&Number(item.amount)>0)}))
      .filter(group=>group.items.length)})
    .filter(meal=>meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget)>0:meal.groups.length>0);
  // A day the coach opened and left empty is dropped rather than saved as an
  // empty day, which the reader would serve as a menu with no meals in it.
  const savedDays=()=>menu.days
    .map(day=>({...day,meals:savedMealsOf(day.meals)}))
    .filter(day=>day.meals.length)
    .sort((a,b)=>a.dayIndex-b.dayIndex);
  // Turning a menu "active" is the moment it reaches a real person: it replaces
  // whatever that client is eating from today. A menu that misses its own calorie
  // target by more than a tenth is almost always unfinished rather than intended,
  // so that combination asks once instead of going out quietly.
  const plannedCalories=Math.round(totals.calories+meals.reduce((sum,meal)=>sum+(meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget||0):0),0));
  const calorieGap=Number(menu.calorieTarget)>0?Math.abs(plannedCalories-Number(menu.calorieTarget))/Number(menu.calorieTarget):0;
  const needsActivationConfirm=menu.status==="active"&&Boolean(menu.clientId)&&calorieGap>0.1;
  // The server refuses this combination outright. Finding that out from a failed
  // round trip - after building the whole menu - is the long way round.
  const activeWithoutClient=menu.status==="active"&&!menu.clientId;
  const[confirmActivation,setConfirmActivation]=useState(false);

  const submit=(confirmed=false)=>startTransition(async()=>{
    setMessage("");
    if(!savedDays().length){say("יש למלא לפחות ארוחה אחת לפני שמירה.","error");return}
    if(activeWithoutClient){say("„פעיל אצל לקוח” מגיש את התפריט ללקוח מסוים, ולכן דורש לקוח משויך. אם זה תפריט לבנק — יש לבחור „מוכן בבנק”.","error");return}
    if(needsActivationConfirm&&!confirmed){setConfirmActivation(true);return}
    setConfirmActivation(false);
    try{
    const result=await saveMenuTree({id:menu.id,title:menu.title,description:menu.description,clientId:menu.clientId,status:menu.status,calorieTarget:menu.calorieTarget,proteinTarget:menu.proteinTarget,carbohydrateTarget:menu.carbohydrateTarget,fatTarget:menu.fatTarget,proteinTargetSource:menu.macroSources.protein,carbohydrateTargetSource:menu.macroSources.carbohydrates,fatTargetSource:menu.macroSources.fat,activeFrom:menu.status==="active"?israelDateKey():"",days:savedDays().map((day,daySortOrder)=>({dayIndex:day.dayIndex,title:dayLabel(day.dayIndex),sortOrder:daySortOrder,meals:day.meals.map((meal,mealIndex)=>({...meal,sortOrder:mealIndex,groups:meal.groups.map((group,groupIndex)=>({...group,sortOrder:groupIndex,items:group.items.map((item,itemIndex)=>{const food=foodMap.get(item.foodId);const portion=food?portionFor(food,item.amount,item.unitMode??"native"):null;return{...item,amount:portion?.grams??item.amount,displayQuantity:item.amount,measurementUnit:portion?.unit??"גרם",amountSource:item.amountSource??"manual",note:item.note??"",itemRole:(item.primary??itemIndex===0)?"primary":"alternative",sortOrder:itemIndex}})}))}))}))});
    say(result.message??"",result.ok?"ok":"error");
    if(result.ok){
      // The server now holds it, so the local copy is no longer the only one.
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("he-IL",{timeZone:"Asia/Jerusalem",hour:"2-digit",minute:"2-digit"}));
      try{window.localStorage.removeItem(draftKey)}catch{/* nothing to clear */}
    }
    if(result.ok&&result.id){router.replace(`/coach/menus/${result.id}`);router.refresh()}
    }catch{
      // A save that fails without saying so loses the whole menu. The usual cause
      // is a page loaded before a deploy posting to the build that replaced it -
      // the action id no longer exists on the server - and a reload fixes it.
      say("השמירה לא הגיעה לשרת. יש לרענן את העמוד (Cmd/Ctrl+Shift+R) ולנסות שוב - התפריט עדיין כאן עד שתרעננו.","error");
    }
  });
  return <main className="menu-editor px-4 pt-7 sm:px-6"><div className="mx-auto max-w-[1600px]">
    {/* The running calorie total lives in the sticky bar: on a phone the summary
        sits below six meals, which is exactly where it is no use. */}
    {/* The header is now just the title. Everything a coach reaches for while
        building - the running totals and the save - moved to a fixed bar at the
        bottom of the screen, because that is where the thumb is and because the
        totals were previously in a sidebar that stacks under six meals on any
        screen narrower than 2xl. Checking "am I near the target?" meant
        scrolling to the top and back for every single change. */}
    <div className="-mx-4 mb-1 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7E5] px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="min-w-0">
        <p className="text-xs font-black tracking-widest text-[#16A34A]">תפריט שמור</p>
        <h1 className="mt-1 truncate text-2xl font-black">{menu.id?"עריכת תפריט":"תפריט חדש"}</h1>
      </div>
      <div className="flex items-center gap-3">
        {menu.id&&<Link href={`/coach/menus/${menu.id}/preview`} className="hidden min-h-11 items-center gap-2 rounded-xl border border-[#E5E7E5] px-3 text-sm font-bold sm:flex"><Eye aria-hidden="true" size={16}/>תצוגת לקוח</Link>}
        <button type="button" onClick={fillDayFromFavorites} className="hidden min-h-11 items-center gap-2 rounded-xl border border-[#16A34A]/40 px-3 text-sm font-bold text-[#16A34A] sm:flex"><Sparkles size={16}/>מלא יום מהמועדפים</button>
      </div>
    </div>

    {/* A draft found on this device is offered, never applied: the copy on the
        server may well be the newer of the two, and only the coach knows. */}
    {draft&&<div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#16A34A]/40 bg-[#F0FDF4] p-3 text-sm">
      <span className="font-bold">נמצאה טיוטה שלא נשמרה מ־{new Date(draft.at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem",dateStyle:"short",timeStyle:"short"})}.</span>
      <button type="button" onClick={restoreDraft} className="chip">שחזור הטיוטה</button>
      <button type="button" onClick={discardDraft} className="chip">התעלמות</button>
    </div>}
    <div className="mt-4 grid gap-2 sm:hidden">
      <button type="button" onClick={fillDayFromFavorites} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#16A34A]/40 bg-[#F0FDF4] px-4 font-black text-[#16A34A]"><Sparkles size={17}/>מלא יום מהמזונות המועדפים</button>
      {menu.id&&<Link href={`/coach/menus/${menu.id}/preview`} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7E5] px-4 font-bold"><Eye aria-hidden="true" size={17}/>תצוגה כפי שהלקוח רואה</Link>}
    </div>
    <div className="mt-6 grid items-start gap-8 2xl:grid-cols-[minmax(0,1fr)_300px]"><div className="min-w-0 space-y-4">
      <section className="grid gap-4 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
        <Field label="שם התפריט" value={menu.title} onChange={title=>setMenu({...menu,title})}/><Field label="תיאור" value={menu.description} onChange={description=>setMenu({...menu,description})}/>
        {/* Each select carries its own aria-label. A select wrapped in a <label>
            takes the label text concatenated with every option as its accessible
            name, so this one would announce as "מטרה לא נבחרה שימור חיטוב עדין…"
            and nothing looking it up by name could find it. */}
        <label className="text-sm font-bold">לקוח<select aria-label="לקוח" className="nutrition-input mt-2" value={menu.clientId} onChange={event=>selectClient(event.target.value)}><option value="">ללא שיוך</option>{clients.map(client=><option key={client.id} value={client.id}>{client.full_name}</option>)}</select>{selectedClient&&<span className="mt-1 block text-xs text-[#5B5F5B]">{selectedClient.weight?`משקל עדכני: ${selectedClient.weight} ק״ג`:"לא נמצא משקל עדכני"}</span>}</label>
        {/* The three words did not say what they do, and "פעיל" was read as "ready"
            rather than "someone is eating this today". A coach building a bank of
            menus therefore reached for it, and hit the rule that an active menu
            needs a client. The names now carry the meaning. */}
        <label className="text-sm font-bold">סטטוס
          <select aria-label="סטטוס" className="nutrition-input mt-2" value={menu.status} onChange={event=>setMenu({...menu,status:event.target.value as EditableMenu["status"]})}>
            <option value="draft">טיוטה — בעבודה</option>
            <option value="published">מוכן בבנק — ללא שיוך</option>
            <option value="active">פעיל אצל לקוח — מוגש היום</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-[#5B5F5B]">
            {menu.status==="active"
              ?"הלקוח המשויך יראה את התפריט הזה מהיום. מחליף את התפריט הפעיל הקודם שלו."
              :menu.status==="published"
                ?"נשמר בבנק התפריטים שלך. לא משויך לאף לקוח, ואפשר לשכפל ממנו בכל רגע."
                :"נשמר רק אצלך. לא מוצג לאף לקוח."}
          </span>
        </label>
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
      {/* Which day is being edited. With one day this is a single chip that says
          the menu applies to the whole week, which is the truth and is worth
          stating - the reader falls back to day 0 for any weekday without one. */}
      <section className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-black">ימי התפריט</h2>
          {menu.days.map(day=>
            <span key={day.dayIndex} className="inline-flex items-center gap-1">
              <button type="button" onClick={()=>showDay(day.dayIndex)} aria-pressed={day.dayIndex===activeDay} className={`chip${day.dayIndex===activeDay?" pill--green":""}`}>
                {dayLabel(day.dayIndex)}
              </button>
              {day.dayIndex!==0&&
                <button type="button" aria-label={`מחיקת ${dayLabel(day.dayIndex)}`} onClick={()=>removeDay(day.dayIndex)} className="chip border-[#DC2626] text-[#DC2626]"><Trash2 aria-hidden="true" size={13}/></button>}
            </span>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {WEEKDAY_LABELS.map((label,dayIndex)=>dayIndex===0||menu.days.some(day=>day.dayIndex===dayIndex)?null:
            <button key={label} type="button" onClick={()=>addDay(dayIndex)} className="chip"><Plus aria-hidden="true" size={14}/>{label}</button>)}
        </div>
        <p className="mt-2 text-xs text-[#5B5F5B]">
          {menu.days.length>1
            ?`נערך כעת: ${dayLabel(activeDay)}. כל יום שלא הוגדר בנפרד מקבל את תפריט ברירת המחדל.`
            :"התפריט הזה חל על כל ימות השבוע. הוספת יום נותנת ליום מסוים תפריט משלו - למשל יום אימון מול יום מנוחה."}
        </p>
      </section>

      {meals.map((meal,index)=><section key={index} className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">{/* Wraps on a phone. Five controls in one row - collapse, meal type, the
          reorder pair, duplicate and delete - fit a desktop and squeezed the meal
          type select down to 26px on a 390px screen, which is a control you
          cannot open. */}
      <div className="flex flex-wrap items-center gap-3"><button type="button" aria-expanded={!collapsed.has(index)} aria-label={collapsed.has(index)?"פתיחת הארוחה":"קיפול הארוחה"} onClick={()=>toggleCollapsed(index)} className="min-h-12 rounded-xl border border-[#E5E7E5] px-3 text-[#5B5F5B]">{collapsed.has(index)?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</button><select aria-label={`סוג ארוחה ${index+1}`} className="nutrition-input min-w-40 flex-1" value={meal.title} onChange={event=>updateMeal(index,{...meal,title:event.target.value as Meal["title"]})}>{FIXED_MEAL_TITLES.map(title=><option key={title}>{title}</option>)}</select><span className="food-row__nudges">
        <button type="button" aria-label={`הזזת ${meal.title} למעלה`} disabled={index===0} onClick={()=>moveMeal(index,index-1)} className="food-row__nudge"><ChevronUp aria-hidden="true" size={14}/></button>
        <button type="button" aria-label={`הזזת ${meal.title} למטה`} disabled={index===meals.length-1} onClick={()=>moveMeal(index,index+1)} className="food-row__nudge"><ChevronDown aria-hidden="true" size={14}/></button>
      </span>
      <button type="button" aria-label="שכפול ארוחה" onClick={()=>{setMeals(current=>[...current.slice(0,index+1),structuredClone(meal),...current.slice(index+1)]);remapCollapsed(folded=>folded>index?folded+1:folded)}} className="min-h-12 rounded-xl border border-[#16A34A]/30 px-3 text-[#16A34A]"><Copy size={18}/></button><button type="button" aria-label="מחיקת ארוחה" onClick={()=>{setMeals(current=>current.filter((_,i)=>i!==index));remapCollapsed(folded=>folded===index?null:folded>index?folded-1:folded)}} className="min-h-12 rounded-xl border border-[#DC2626]/30 px-3 text-[#DC2626]"><Trash2 size={18}/></button>
      {/* What this meal costs, on the row that names it. Otherwise the only way
          to know was to add the four group cards up by eye. */}
      <span className="mr-auto flex shrink-0 items-center gap-2 text-sm font-black">
        <span className="pill pill--green">{Math.round(mealMacros(meal).calories)} קל׳</span>
        <span className="pill">{Math.round(mealMacros(meal).protein)} ג׳ חלבון</span>
      </span></div>
      {collapsed.has(index)?<p className="mt-3 text-xs text-[#5B5F5B]">{mealSummary(meal,foodMap)}</p>:<>
      {meal.title==="קלוריות חופשיות"?<div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="יעד קלורי" value={meal.freeCalorieTarget} type="number" onChange={freeCalorieTarget=>updateMeal(index,{...meal,freeCalorieTarget})}/><Field label="הערת מאמן" value={meal.notes} onChange={notes=>updateMeal(index,{...meal,notes})}/></div>:<>
      <div className="mt-4 grid items-start gap-5">{meal.groups.map((group,groupIndex)=>
        <div key={group.type} className="rounded-2xl border border-[#E5E7E5] p-4">
          <h3 className="font-black">{groupLabels[group.type]}</h3>
          <p className="mt-1 text-xs text-[#5B5F5B]">מוצגים רק מזונות מתאימים לקבוצה. מזונות מועדפים תמיד ראשונים.</p>
          <div className="mt-3">{group.items.map((item,itemIndex)=>{
            const selectedFood=foodMap.get(item.foodId);
            const unitMode=item.unitMode??"native";
            const portion=selectedFood?portionFor(selectedFood,item.amount,unitMode):null;
            const isPrimary=item.primary??itemIndex===0;
            // Two lines rather than one. The name had been sharing a row with the
            // amount, the unit, the macros and two buttons, so it was the thing
            // that got truncated - and the name is the one part a coach cannot
            // work out from the others.
            return <div
              key={itemIndex}
              className="food-row"
              data-primary={isPrimary||undefined}
              data-dragging={dragRow?.mealIndex===index&&dragRow?.groupIndex===groupIndex&&dragRow?.itemIndex===itemIndex||undefined}
              onDragOver={event=>{if(dragRow)event.preventDefault()}}
              onDrop={()=>dropRow(index,groupIndex,itemIndex)}
            >
              <div className="food-row__head">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`שינוי מקום של ${selectedFood?.name??"השורה"}`}
                  draggable
                  onDragStart={()=>setDragRow({mealIndex:index,groupIndex,itemIndex})}
                  onDragEnd={()=>setDragRow(null)}
                  onKeyDown={event=>{
                    if(event.key==="ArrowUp"){event.preventDefault();moveItem(index,groupIndex,itemIndex,itemIndex-1)}
                    if(event.key==="ArrowDown"){event.preventDefault();moveItem(index,groupIndex,itemIndex,itemIndex+1)}
                  }}
                  className="food-row__grip"
                ><GripVertical aria-hidden="true" size={16}/></span>
                <span className="food-row__nudges">
                  <button type="button" aria-label="הזזה למעלה" disabled={itemIndex===0} onClick={()=>moveItem(index,groupIndex,itemIndex,itemIndex-1)} className="food-row__nudge"><ChevronUp aria-hidden="true" size={13}/></button>
                  <button type="button" aria-label="הזזה למטה" disabled={itemIndex===group.items.length-1} onClick={()=>moveItem(index,groupIndex,itemIndex,itemIndex+1)} className="food-row__nudge"><ChevronDown aria-hidden="true" size={13}/></button>
                </span>
                {/* Primary is a toggle, not a position. A protein portion is
                    sometimes two foods - one egg plus two egg whites - and the
                    first row being the only possible primary made that
                    unsayable. Everything not marked primary is an alternative. */}
                <button
                  type="button"
                  aria-pressed={isPrimary}
                  title={isPrimary?"מאכל ראשי - נספר בסיכום":"חלופה - לא נספרת בסיכום"}
                  onClick={()=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((food,i)=>i===itemIndex?{...food,primary:!isPrimary}:food)}:value)})}
                  className={`pill shrink-0${isPrimary?" pill--green":""}`}
                ><Star aria-hidden="true" size={13} fill={isPrimary?"currentColor":"none"}/>{isPrimary?"ראשי":"חלופה"}</button>
                <button type="button" className="food-row__pick" data-empty={selectedFood?undefined:true} onClick={()=>setPicker({mealIndex:index,groupIndex,itemIndex})}>
                  {selectedFood?`${selectedFood.name}${selectedFood.brand?` — ${selectedFood.brand}`:""}`:isPrimary?"בחירת מאכל ראשי":"בחירת מזון"}
                </button>
                {/* One row, one deletion. Removing the primary used to empty the
                    whole group on the theory that the alternatives were scaled to
                    it - but a group can hold several primaries now, and losing
                    five rows to one click is never what was meant. */}
                <button
                  type="button"
                  aria-label={`הסרת ${selectedFood?.name??"השורה"}`}
                  onClick={()=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.filter((_,i)=>i!==itemIndex)}:value)})}
                  className="rounded-xl border border-[#E5E7E5] p-2 text-[#DC2626]"
                ><Trash2 size={16}/></button>
              </div>
              <div className="food-row__body">
                <label className="food-row__amount"><span className="sr-only">כמות</span>
                  <input aria-label="כמות" className="nutrition-input" type="number" min="0.1" step="0.1" value={item.amount} onChange={event=>changeAmount(index,groupIndex,itemIndex,Number(event.target.value))}/>
                  {/* Units or grams, the coach's choice, per row. A pita is
                      sometimes "1 פיתה" and sometimes "55 גרם", and the same
                      menu carries both ways of saying it. Switching converts
                      the number rather than reinterpreting it. */}
                  {selectedFood&&hasNaturalUnit(selectedFood)
                    ?<select
                        aria-label={`יחידת מדידה של ${selectedFood.name}`}
                        className="food-row__unit"
                        value={unitMode}
                        onChange={event=>{
                          const next=event.target.value as "native"|"gram";
                          changeUnitMode(index,groupIndex,itemIndex,next);
                        }}
                      >
                        {/* Labelled by what the quantity would BE in that unit,
                            not by the number currently on screen - otherwise a
                            row holding 100 grams offers "פיתות" for a switch
                            that would produce exactly one pita. */}
                        <option value="native">{unitLabel(foodUnit(selectedFood).unit,convertQuantity(selectedFood,Number(item.amount||0),unitMode,"native"))}</option>
                        <option value="gram">גרם</option>
                      </select>
                    :<span>{selectedFood?unitLabel(foodUnit(selectedFood,unitMode).unit,item.amount):"גרם"}</span>}
                </label>
                {portion?<dl className="food-row__meta" aria-label={`ערכים תזונתיים של ${selectedFood?.name??"המזון"}`}>
                  <MacroChip label="קלוריות" value={portion.calories} unit="קל׳"/>
                  <MacroChip label="חלבון" value={portion.protein} unit="ג׳"/>
                  <MacroChip label="פחמימה" value={portion.carbs} unit="ג׳"/>
                  <MacroChip label="שומן" value={portion.fat} unit="ג׳"/>
                </dl>:null}
              </div>
              {/* A note belongs to the food, not to the meal: "בלי מלח" applies
                  to the chicken and to nothing else on the plate. */}
              {selectedFood?<input
                className="nutrition-input mt-2 text-sm"
                placeholder="הערה למאכל (רשות)"
                aria-label={`הערה ל${selectedFood.name}`}
                value={item.note??""}
                onChange={event=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((food,i)=>i===itemIndex?{...food,note:event.target.value}:food)}:value)})}
              />:null}
            </div>})}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={()=>{updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:[...value.items,{foodId:"",amount:100,amountSource:"auto"}]}:value)});setPicker({mealIndex:index,groupIndex,itemIndex:group.items.length})}} className="chip"><Plus aria-hidden="true" size={15}/>{group.items.length?"הוספת חלופה":"בחירת מאכל ראשי"}</button>
            {group.items.length?<button type="button" onClick={()=>{updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:[...value.items,{foodId:"",amount:100,amountSource:"auto" as const,primary:true}]}:value)});setPicker({mealIndex:index,groupIndex,itemIndex:group.items.length})}} className="chip"><Plus aria-hidden="true" size={15}/>מאכל ראשי נוסף</button>:null}
            {group.items.some((item,i)=>item.foodId&&(item.primary??i===0))?<button type="button" onClick={()=>suggestAlternatives(index,groupIndex)} className="chip"><Sparkles aria-hidden="true" size={15}/>הוסף 3 חלופות מומלצות</button>:null}
          </div>
        </div>)}
      </div>
      </>}</>}</section>)}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-[#16A34A]/30 p-3">{FIXED_MEAL_TITLES.filter(title=>!meals.some(meal=>meal.title===title)).map(title=><button key={title} type="button" onClick={()=>setMeals(current=>[...current,title==="קלוריות חופשיות"?{title,notes:"",freeCalorieTarget:"",groups:[]}:{...emptyMeal(),title}])} className="min-h-11 rounded-xl border border-[#E5E7E5] px-4 text-sm font-bold text-[#16A34A]"><Plus size={15} className="inline"/> {title}</button>)}</div>
    </div><aside className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 lg:sticky lg:top-5"><h2 className="font-black">יעדי המאקרו</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><MacroTotal label="חלבון" value={menu.proteinTarget} calories={Number(menu.proteinTarget||0)*4} target={Number(menu.calorieTarget)}/><MacroTotal label="פחמימה" value={menu.carbohydrateTarget} calories={Number(menu.carbohydrateTarget||0)*4} target={Number(menu.calorieTarget)}/><MacroTotal label="שומן" value={menu.fatTarget} calories={Number(menu.fatTarget||0)*9} target={Number(menu.calorieTarget)}/></dl><p className="mt-4 text-xs leading-5 text-[#5B5F5B]">בעת השמירה השרת מחשב שוב את הערכים מהמאגר המאושר; ערכי הדפדפן אינם מקור סמכות.</p></aside></div>

    {/* Activation replaces what the client is eating from today. Asked once, with
        both numbers on screen, rather than discovered afterwards. */}
    {/* Everything the coach reaches for while building, pinned to the bottom of
        the screen: the four totals against their targets, whether the work has
        reached the server, and save. Red when short of a target, green when it
        is met - the question being asked all the way down a menu is "am I still
        short?", and the answer should not be a scroll away. */}
    <div className="menu-dock">
      <dl className="menu-dock__totals">
        <DockTotal label="קלוריות" value={plannedCalories} target={Number(menu.calorieTarget)}/>
        <DockTotal label="חלבון" value={totals.protein} target={Number(menu.proteinTarget)}/>
        <DockTotal label="פחמימות" value={totals.carbs} target={Number(menu.carbohydrateTarget)}/>
        <DockTotal label="שומן" value={totals.fat} target={Number(menu.fatTarget)}/>
      </dl>
      <div className="menu-dock__actions">
        <span className="pill" data-testid="save-state">{pending?"שומרים…":dirty?"טיוטה במכשיר":savedAt?`נשמר ${savedAt}`:"אין שינויים"}</span>
        <button type="button" onClick={()=>submit()} disabled={pending||!menu.title.trim()} className="premium-primary-button"><Save aria-hidden="true" size={18}/>{pending?"שומרים…":"שמירה"}</button>
      </div>

      {/* The result of a save belongs with the button that caused it. */}
      {message&&<p
        role={messageTone==="error"?"alert":"status"}
        aria-live={messageTone==="error"?"assertive":"polite"}
        className={`menu-dock__message ${messageTone==="error"?"menu-dock__message--error":"menu-dock__message--ok"}`}
      >{message}</p>}

      {activeWithoutClient&&!message&&<p className="menu-dock__message menu-dock__message--warn">
        „פעיל אצל לקוח” דורש לקוח משויך. לבנק תפריטים בלי שיוך — יש לבחור „מוכן בבנק”.
      </p>}
    </div>

    <BottomSheet open={confirmActivation} title="להפעיל את התפריט ללקוח?" onClose={()=>setConfirmActivation(false)}>
      <p className="text-sm text-[#5B5F5B]">
        התפריט מסתכם ב־<strong>{plannedCalories} קלוריות</strong> מול יעד של <strong>{menu.calorieTarget}</strong> — פער של {Math.round(calorieGap*100)}%.
      </p>
      <p className="mt-2 text-sm text-[#5B5F5B]">
        הפעלה מחליפה את התפריט הפעיל הנוכחי של {selectedClient?.full_name??"הלקוח"}, והוא יראה את התפריט הזה כבר היום.
      </p>
      <div className="sheet__actions">
        <button type="button" onClick={()=>submit(true)} className="premium-primary-button">הפעלה בכל זאת</button>
        <button type="button" onClick={()=>setConfirmActivation(false)} className="premium-secondary-button">חזרה לעריכה</button>
      </div>
    </BottomSheet>

    {/* One picker for the whole editor. It fills a sheet rather than hanging off
        the row it belongs to, so the search and the results have room. */}
    <BottomSheet
      open={Boolean(picker)}
      placement="top"
      title={picker?pickerTitle:"בחירת מזון"}
      onClose={()=>setPicker(null)}
    >
      {picker&&<FoodCombobox
        foods={pickerFoods}
        value={meals[picker.mealIndex]?.groups[picker.groupIndex]?.items[picker.itemIndex]?.foodId??""}
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
function MacroTotal({label,value,calories,target}:{label:string;value:string;calories:number;target:number}){return <div><dt className="text-[#5B5F5B]">{label}</dt><dd className="mt-1 font-black">{value||"—"} גרם</dd><p className="text-[10px] text-[#5B5F5B]">{target>0?`${Math.round(calories/target*100)}%`:"—"}</p></div>}
// The whole totals table, at bar size. Three lines each: what the macro is,
// what the menu holds against its target, and - the line a coach is actually
// reading on the way down - how much is still missing. Red while short, green
// once the target is met, the same rule the sidebar used.
function DockTotal({label,value,target}:{label:string;value:number;target?:number}){
  const hasTarget=Boolean(target&&Number.isFinite(target)&&target>0);
  const rounded=Math.round(value);
  const goal=Math.round(target??0);
  const gap=goal-rounded;
  const short=hasTarget&&gap>0;
  return <div className="menu-dock__total" data-state={hasTarget?(short?"short":"met"):undefined}>
    <dt>{label}</dt>
    <dd>{rounded}{hasTarget?<span>/{goal}</span>:null}</dd>
    {hasTarget?<small>{short?`נשאר ${gap}`:gap===0?"ביעד":`חריגה ${Math.abs(gap)}`}</small>:<small>ללא יעד</small>}
  </div>;
}

function MacroChip({label,value,unit}:{label:string;value:number;unit:string}){return <div><dt>{label}</dt><dd>{value} {unit}</dd></div>}

function mealSummary(meal:Meal,foodMap:Map<string,FoodOption>):string{
  if(meal.title==="קלוריות חופשיות")return meal.freeCalorieTarget?`${meal.freeCalorieTarget} קל׳ חופשיות`:"ללא יעד קלורי";
  // Every primary, not the first row. A protein portion can be two foods - one
  // egg plus two egg whites - and taking items[0] made a collapsed meal report
  // fewer calories than the same meal open.
  const primaries=meal.groups.flatMap(group=>group.items.filter((item,index)=>item.foodId&&(item.primary??index===0)));
  const calories=primaries.reduce((sum,item)=>{
    const food=foodMap.get(item.foodId);
    const portion=food?portionFor(food,Number(item.amount||0),item.unitMode??"native"):null;
    return sum+(portion?.calories??0);
  },0);
  const options=meal.groups.map(group=>`${groupLabels[group.type]} ${group.items.length}`).join(" · ");
  return primaries.length?`${Math.round(calories)} קל׳ · ${options}`:"עדיין ריקה";
}
