"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Copy, Plus, Save, Trash2 } from "lucide-react";
import {
  recordCoachFoodSelection,
  saveMenuTree,
} from "@/app/actions/product";
import FoodCombobox from "@/components/coach/menus/FoodCombobox";
import { calculateMacroTargetResult } from "@/lib/nutrition/macro-targets";
import { FIXED_MEAL_TITLES } from "@/lib/nutrition/menu-validation";
import { calculateAlternativePortion,defaultPortionQuantity,foodUnit,portionFor } from "@/lib/nutrition/meal-alternatives";

type FoodOption={id:string;name:string;brand:string|null;category?:string;calories:number;protein:number|null;carbs:number|null;fat:number|null;packageUnit:string|null;unitWeightGrams:number|null;isMaster?:boolean;masterGroup?:GroupType|null};
type FoodUsage={foodId:string;count:number;lastUsedAt:string;favorite:boolean};
type ClientOption={id:string;full_name:string;weight:number|null};
type Item={foodId:string;amount:number;amountSource?:"auto"|"manual"};
type GroupType="protein"|"carbohydrate"|"fat"|"vegetables";
type Group={type:GroupType;items:Item[]};
type Meal={title:typeof FIXED_MEAL_TITLES[number];notes:string;freeCalorieTarget:string;groups:Group[]};
type MacroSource="auto"|"manual";
type MacroSources={protein:MacroSource;carbohydrates:MacroSource;fat:MacroSource};
export type EditableMenu={id?:string;title:string;description:string;clientId:string;status:"draft"|"published"|"active";calorieTarget:string;proteinTarget:string;carbohydrateTarget:string;fatTarget:string;macroSources:MacroSources;meals:Meal[]};
const emptyMeal=():Meal=>({title:"ארוחת בוקר",notes:"",freeCalorieTarget:"",groups:[{type:"protein",items:[]},{type:"carbohydrate",items:[]}]});
const groupLabels:Record<GroupType,string>={protein:"קבוצת חלבון",carbohydrate:"קבוצת פחמימה",fat:"קבוצת שומן",vegetables:"קבוצת ירקות"};

export default function PersistentMenuEditor({initial,foods,clients,initialUsage}:{initial:EditableMenu;foods:FoodOption[];clients:ClientOption[];initialUsage:FoodUsage[]}){
  const[menu,setMenu]=useState<EditableMenu>(()=>{
    const client=clients.find(item=>item.id===initial.clientId);
    const calculation=calculateMacroTargetResult(client?.weight??Number.NaN,Number(initial.calorieTarget));
    if(!calculation.ok)return initial;
    return{...initial,
      proteinTarget:initial.macroSources.protein==="auto"&&!initial.proteinTarget?String(calculation.targets.protein):initial.proteinTarget,
      carbohydrateTarget:initial.macroSources.carbohydrates==="auto"&&!initial.carbohydrateTarget?String(calculation.targets.carbohydrates):initial.carbohydrateTarget,
      fatTarget:initial.macroSources.fat==="auto"&&!initial.fatTarget?String(calculation.targets.fat):initial.fatTarget,
    };
  });
  const[usage,setUsage]=useState(initialUsage);
  const[message,setMessage]=useState("");
  const[macroMessage,setMacroMessage]=useState("");
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
  const calculated=(clientId:string,calorieTarget:string)=>{
    const client=clients.find(item=>item.id===clientId);
    return calculateMacroTargetResult(client?.weight??Number.NaN,Number(calorieTarget));
  };
  const withAutomaticTargets=(current:EditableMenu,clientId:string,calorieTarget:string,force=false)=>{
    const next=calculated(clientId,calorieTarget);
    if(!next.ok)return{menu:{...current,clientId,calorieTarget},result:next};
    return{menu:{...current,clientId,calorieTarget,
      proteinTarget:force||current.macroSources.protein==="auto"?String(next.targets.protein):current.proteinTarget,
      carbohydrateTarget:force||current.macroSources.carbohydrates==="auto"?String(next.targets.carbohydrates):current.carbohydrateTarget,
      fatTarget:force||current.macroSources.fat==="auto"?String(next.targets.fat):current.fatTarget,
      macroSources:force?{protein:"auto" as const,carbohydrates:"auto" as const,fat:"auto" as const}:current.macroSources,
    },result:next};
  };
  const applyAutomatic=(clientId:string,calorieTarget:string,force=false)=>{
    setMenu(current=>{
      const next=withAutomaticTargets(current,clientId,calorieTarget,force);
      // Name the input that is actually missing. Blaming the weight when the
      // calorie target is the empty one sends the coach hunting for the wrong thing.
      const client=clients.find(candidate=>candidate.id===clientId);
      const missingInput=!clientId
        ?"יש לבחור לקוח כדי לחשב מאקרו אוטומטית."
        :!client?.weight
          ?"ללקוח אין שקילה אחרונה, ולכן אין משקל לחישוב. אפשר להזין את היעדים ידנית."
          :!Number(calorieTarget)
            ?"יש להזין יעד קלוריות כדי לחשב מאקרו אוטומטית."
            :"לא ניתן לחשב מאקרו אוטומטית מהנתונים הקיימים.";
      setMacroMessage(next.result.ok
        ?force?"יעדי המאקרו חושבו מחדש.":"יעדי המאקרו עודכנו לפי המשקל ויעד הקלוריות."
        :next.result.reason==="negative_carbohydrates"?"יעד הקלוריות נמוך מדי ביחס למשקל: חישוב הפחמימות שלילי.":missingInput);
      return next.menu;
    });
  };
  const selectClient=(clientId:string)=>applyAutomatic(clientId,menu.calorieTarget);
  const changeCalories=(calorieTarget:string)=>applyAutomatic(menu.clientId,calorieTarget);
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
  const toggleFavorite=(...args:[string,boolean])=>void args;
  const submit=()=>startTransition(async()=>{
    setMessage("");
    const result=await saveMenuTree({id:menu.id,title:menu.title,description:menu.description,clientId:menu.clientId,status:menu.status,calorieTarget:menu.calorieTarget,proteinTarget:menu.proteinTarget,carbohydrateTarget:menu.carbohydrateTarget,fatTarget:menu.fatTarget,proteinTargetSource:menu.macroSources.protein,carbohydrateTargetSource:menu.macroSources.carbohydrates,fatTargetSource:menu.macroSources.fat,activeFrom:menu.status==="active"?new Date().toISOString().slice(0,10):"",days:[{dayIndex:0,title:"יום רגיל",sortOrder:0,meals:menu.meals.map((meal,mealIndex)=>({...meal,sortOrder:mealIndex,groups:meal.groups.map((group,groupIndex)=>({...group,sortOrder:groupIndex,items:group.items.map((item,itemIndex)=>{const food=foodMap.get(item.foodId);const portion=food?portionFor(food,item.amount):null;return{...item,amount:portion?.grams??item.amount,displayQuantity:item.amount,measurementUnit:portion?.unit??"גרם",amountSource:item.amountSource??"manual",itemRole:itemIndex===0?"primary":"alternative",sortOrder:itemIndex}})}))}))}]});
    setMessage(result.message??"");
    if(result.ok&&result.id){router.replace(`/coach/menus/${result.id}`);router.refresh()}
  });
  return <main className="px-4 pb-20 pt-7 sm:px-6"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black tracking-widest text-[#D4AF37]">תפריט שמור</p><h1 className="mt-2 text-3xl font-black">{menu.id?"עריכת תפריט":"תפריט חדש"}</h1></div><button type="button" onClick={submit} disabled={pending||!menu.title.trim()} className="flex min-h-12 items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 font-black text-black disabled:opacity-50"><Save size={18}/>{pending?"שומרים…":"שמירה"}</button></div>
    {message&&<p role="status" className="mt-4 rounded-2xl border border-[#333] p-3 text-sm">{message}</p>}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_300px]"><div className="space-y-4">
      <section className="grid gap-4 rounded-[24px] border border-[#292929] bg-[#151515] p-5 sm:grid-cols-2">
        <Field label="שם התפריט" value={menu.title} onChange={title=>setMenu({...menu,title})}/><Field label="תיאור" value={menu.description} onChange={description=>setMenu({...menu,description})}/>
        <label className="text-sm font-bold">לקוח<select className="nutrition-input mt-2" value={menu.clientId} onChange={event=>selectClient(event.target.value)}><option value="">ללא שיוך</option>{clients.map(client=><option key={client.id} value={client.id}>{client.full_name}</option>)}</select>{selectedClient&&<span className="mt-1 block text-xs text-zinc-500">{selectedClient.weight?`משקל עדכני: ${selectedClient.weight} ק״ג`:"לא נמצא משקל עדכני"}</span>}</label>
        <label className="text-sm font-bold">סטטוס<select className="nutrition-input mt-2" value={menu.status} onChange={event=>setMenu({...menu,status:event.target.value as EditableMenu["status"]})}><option value="draft">טיוטה</option><option value="published">פורסם</option><option value="active">פעיל</option></select></label>
        <Field label="יעד קלוריות" value={menu.calorieTarget} type="number" onChange={changeCalories}/>
        <MacroField label="יעד חלבון" value={menu.proteinTarget} source={menu.macroSources.protein} onChange={value=>setMenu({...menu,proteinTarget:value,macroSources:{...menu.macroSources,protein:"manual"}})}/>
        <MacroField label="יעד פחמימות" value={menu.carbohydrateTarget} source={menu.macroSources.carbohydrates} onChange={value=>setMenu({...menu,carbohydrateTarget:value,macroSources:{...menu.macroSources,carbohydrates:"manual"}})}/>
        <MacroField label="יעד שומן" value={menu.fatTarget} source={menu.macroSources.fat} onChange={value=>setMenu({...menu,fatTarget:value,macroSources:{...menu.macroSources,fat:"manual"}})}/>
        <div className="sm:col-span-2"><button type="button" onClick={()=>applyAutomatic(menu.clientId,menu.calorieTarget,true)} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#D4AF37]/40 px-4 text-sm font-bold text-[#D4AF37]"><Calculator size={17}/>חשב מחדש לפי משקל וקלוריות</button>{macroMessage&&<p role="status" className="mt-2 text-xs text-zinc-400">{macroMessage}</p>}</div>
      </section>
      {menu.meals.map((meal,index)=><section key={index} className="rounded-[24px] border border-[#292929] bg-[#151515] p-5"><div className="flex gap-3"><select aria-label={`סוג ארוחה ${index+1}`} className="nutrition-input" value={meal.title} onChange={event=>updateMeal(index,{...meal,title:event.target.value as Meal["title"]})}>{FIXED_MEAL_TITLES.map(title=><option key={title}>{title}</option>)}</select><button type="button" aria-label="שכפול ארוחה" onClick={()=>setMenu({...menu,meals:[...menu.meals.slice(0,index+1),structuredClone(meal),...menu.meals.slice(index+1)]})} className="min-h-12 rounded-xl border border-[#D4AF37]/30 px-3 text-[#E7C85D]"><Copy size={18}/></button><button type="button" aria-label="מחיקת ארוחה" onClick={()=>setMenu({...menu,meals:menu.meals.filter((_,i)=>i!==index)})} className="min-h-12 rounded-xl border border-red-400/20 px-3 text-red-300"><Trash2 size={18}/></button></div>
      {meal.title==="קלוריות חופשיות"?<div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="יעד קלורי" value={meal.freeCalorieTarget} type="number" onChange={freeCalorieTarget=>updateMeal(index,{...meal,freeCalorieTarget})}/><Field label="הערת מאמן" value={meal.notes} onChange={notes=>updateMeal(index,{...meal,notes})}/></div>:<>
      <div className="mt-4 space-y-4">{meal.groups.filter(group=>group.type==="protein"||group.type==="carbohydrate").map((group,groupIndex)=><div key={group.type} className="rounded-2xl border border-white/10 p-4"><h3 className="font-black">{groupLabels[group.type]}</h3><p className="mt-1 text-xs text-zinc-500">מאכל ראשי אחד, ומתחתיו חלופות בכמות מחושבת.</p><div className="mt-3 space-y-2">{group.items.map((item,itemIndex)=>{const selectedFood=foodMap.get(item.foodId);const portion=selectedFood?portionFor(selectedFood,item.amount):null;return <div key={itemIndex} className={`flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2 ${itemIndex===0?"border-[#D4AF37]/40 bg-[#D4AF37]/5":"border-white/5"}`}><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${itemIndex===0?"bg-[#D4AF37] text-black":item.amountSource==="auto"?"border border-emerald-400/40 text-emerald-300":"border border-[#3a3a3a] text-zinc-400"}`}>{itemIndex===0?"ראשי":item.amountSource==="auto"?"אוטו׳":"ידני"}</span><div className="min-w-[150px] flex-1"><FoodCombobox foods={foods.filter(food=>!food.masterGroup||food.masterGroup===group.type)} value={item.foodId} usage={usage} onSelect={foodId=>selectFood(index,groupIndex,itemIndex,foodId)} onToggleFavorite={toggleFavorite}/></div><label className="relative w-[116px] shrink-0"><span className="sr-only">כמות</span><input aria-label="כמות" className="nutrition-input pl-14" type="number" min="0.1" step="0.1" value={item.amount} onChange={event=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.map((food,i)=>i===itemIndex?{...food,amount:Number(event.target.value),amountSource:"manual"}:food)}:value)})}/><span className="absolute left-3 top-3 text-xs text-zinc-500">{selectedFood?foodUnit(selectedFood).unit:"גרם"}</span></label>{portion?<span className="shrink-0 text-[11px] tabular-nums text-zinc-500">{portion.calories} קל׳ · ח {portion.protein} · פ {portion.carbs} · ש {portion.fat}</span>:null}<button type="button" aria-label="הסרת חלופה" disabled={itemIndex===0&&group.items.length===1} onClick={()=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:value.items.filter((_,i)=>i!==itemIndex)}:value)})} className="shrink-0 rounded-xl border border-[#333] p-2 disabled:opacity-30"><Trash2 size={16}/></button></div>})}</div><button type="button" onClick={()=>updateMeal(index,{...meal,groups:meal.groups.map((value,g)=>g===groupIndex?{...value,items:[...value.items,{foodId:"",amount:100,amountSource:"auto"}]}:value)})} className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-[#D4AF37]/30 px-3 text-xs font-bold text-[#D4AF37]"><Plus size={15}/>{group.items.length?"הוספת חלופה":"בחירת מאכל ראשי"}</button></div>)}</div>
      <div className="mt-4"><Field label="הערת מאמן לארוחה" value={meal.notes} onChange={notes=>updateMeal(index,{...meal,notes})}/></div></>}</section>)}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-[#D4AF37]/30 p-3">{FIXED_MEAL_TITLES.filter(title=>!menu.meals.some(meal=>meal.title===title)).map(title=><button key={title} type="button" onClick={()=>setMenu({...menu,meals:[...menu.meals,title==="קלוריות חופשיות"?{title,notes:"",freeCalorieTarget:"",groups:[]}:{...emptyMeal(),title}]})} className="min-h-11 rounded-xl border border-[#3A321B] px-4 text-sm font-bold text-[#E7C85D]"><Plus size={15} className="inline"/> {title}</button>)}</div>
    </div><aside className="rounded-[24px] border border-[#3A321B] bg-[#17150F] p-5 lg:sticky lg:top-5"><h2 className="font-black">סיכום המזונות</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Total label="קלוריות" value={totals.calories+menu.meals.reduce((sum,meal)=>sum+(meal.title==="קלוריות חופשיות"?Number(meal.freeCalorieTarget||0):0),0)}/><Total label="חלבון (גרם)" value={totals.protein}/><Total label="פחמימה (גרם)" value={totals.carbs}/><Total label="שומן (גרם)" value={totals.fat}/></dl><h2 className="mt-6 border-t border-white/10 pt-5 font-black">יעדי המאקרו</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><MacroTotal label="חלבון" value={menu.proteinTarget} calories={Number(menu.proteinTarget||0)*4} target={Number(menu.calorieTarget)}/><MacroTotal label="פחמימה" value={menu.carbohydrateTarget} calories={Number(menu.carbohydrateTarget||0)*4} target={Number(menu.calorieTarget)}/><MacroTotal label="שומן" value={menu.fatTarget} calories={Number(menu.fatTarget||0)*9} target={Number(menu.calorieTarget)}/></dl><p className="mt-4 text-xs leading-5 text-zinc-500">בעת השמירה השרת מחשב שוב את הערכים מהמאגר המאושר; ערכי הדפדפן אינם מקור סמכות.</p></aside></div>
  </div></main>
}

function Field({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:string}){return <label className="text-sm font-bold">{label}<input className="nutrition-input mt-2" type={type} min={type==="number"?"1":undefined} value={value} onChange={event=>onChange(event.target.value)}/></label>}
function MacroField({label,value,source,onChange}:{label:string;value:string;source:MacroSource;onChange:(value:string)=>void}){return <label className="text-sm font-bold"><span className="flex items-center justify-between gap-2"><span>{label}</span><span className={`text-[10px] ${source==="auto"?"text-emerald-400":"text-amber-300"}`}>{source==="auto"?"מחושב אוטומטית":"הוזן ידנית"}</span></span><input className="nutrition-input mt-2" type="number" min="0" value={value} onChange={event=>onChange(event.target.value)}/></label>}
function Total({label,value}:{label:string;value:number}){return <div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-black">{value.toFixed(1)}</dd></div>}
function MacroTotal({label,value,calories,target}:{label:string;value:string;calories:number;target:number}){return <div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-black">{value||"—"} גרם</dd><p className="text-[10px] text-zinc-500">{target>0?`${Math.round(calories/target*100)}%`:"—"}</p></div>}
