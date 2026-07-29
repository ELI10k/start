"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Save, Trash2 } from "lucide-react";
import {
  recordCoachFoodSelection,
  saveMenuTree,
  setCoachFoodFavorite,
} from "@/app/actions/product";
import FoodCombobox from "@/components/coach/menus/FoodCombobox";
import { calculateMacroTargets } from "@/lib/nutrition/macro-targets";

type FoodOption={id:string;name:string;brand:string|null;calories:number;protein:number|null;carbs:number|null;fat:number|null};
type FoodUsage={foodId:string;count:number;lastUsedAt:string;favorite:boolean};
type ClientOption={id:string;full_name:string;weight:number|null};
type Item={foodId:string;amount:number};
type Meal={title:string;items:Item[]};
type MacroSource="auto"|"manual";
type MacroSources={protein:MacroSource;carbohydrates:MacroSource;fat:MacroSource};
export type EditableMenu={id?:string;title:string;description:string;clientId:string;status:"draft"|"published"|"active";calorieTarget:string;proteinTarget:string;carbohydrateTarget:string;fatTarget:string;macroSources:MacroSources;meals:Meal[]};
const emptyMeal=():Meal=>({title:"ארוחה חדשה",items:[]});

export default function PersistentMenuEditor({initial,foods,clients,initialUsage}:{initial:EditableMenu;foods:FoodOption[];clients:ClientOption[];initialUsage:FoodUsage[]}){
  const[menu,setMenu]=useState(initial);
  const[usage,setUsage]=useState(initialUsage);
  const[message,setMessage]=useState("");
  const[macroMessage,setMacroMessage]=useState("");
  const[pending,startTransition]=useTransition();
  const router=useRouter();
  const foodMap=useMemo(()=>new Map(foods.map(food=>[food.id,food])),[foods]);
  const selectedClient=clients.find(client=>client.id===menu.clientId);
  const totals=menu.meals.flatMap(meal=>meal.items).reduce((sum,item)=>{const food=foodMap.get(item.foodId);const factor=Number(item.amount||0)/100;return{calories:sum.calories+(food?.calories??0)*factor,protein:sum.protein+(food?.protein??0)*factor,carbs:sum.carbs+(food?.carbs??0)*factor,fat:sum.fat+(food?.fat??0)*factor}},{calories:0,protein:0,carbs:0,fat:0});
  const updateMeal=(index:number,next:Meal)=>setMenu(current=>({...current,meals:current.meals.map((meal,i)=>i===index?next:meal)}));
  const calculated=(clientId:string,calorieTarget:string)=>{
    const client=clients.find(item=>item.id===clientId);
    return calculateMacroTargets(client?.weight??Number.NaN,Number(calorieTarget));
  };
  const applyAutomatic=(clientId:string,calorieTarget:string,force=false)=>{
    const next=calculated(clientId,calorieTarget);
    if(!next){setMacroMessage(clientId?"חסר משקל עדכני ללקוח או יעד קלוריות תקין.":"בחרו לקוח והזינו יעד קלוריות כדי לחשב מאקרו.");return}
    setMacroMessage(force?"יעדי המאקרו חושבו מחדש.":"יעדי המאקרו עודכנו לפי המשקל ויעד הקלוריות.");
    setMenu(current=>({...current,
      proteinTarget:force||current.macroSources.protein==="auto"?String(next.protein):current.proteinTarget,
      carbohydrateTarget:force||current.macroSources.carbohydrates==="auto"?String(next.carbohydrates):current.carbohydrateTarget,
      fatTarget:force||current.macroSources.fat==="auto"?String(next.fat):current.fatTarget,
      macroSources:force?{protein:"auto",carbohydrates:"auto",fat:"auto"}:current.macroSources,
    }));
  };
  const selectClient=(clientId:string)=>{setMenu(current=>({...current,clientId}));queueMicrotask(()=>applyAutomatic(clientId,menu.calorieTarget))};
  const changeCalories=(calorieTarget:string)=>{setMenu(current=>({...current,calorieTarget}));queueMicrotask(()=>applyAutomatic(menu.clientId,calorieTarget))};
  const selectFood=(mealIndex:number,itemIndex:number,foodId:string)=>{
    updateMeal(mealIndex,{...menu.meals[mealIndex],items:menu.meals[mealIndex].items.map((item,index)=>index===itemIndex?{...item,foodId}:item)});
    if(!foodId)return;
    const now=new Date().toISOString();
    setUsage(current=>{const previous=current.find(item=>item.foodId===foodId);return[{foodId,count:(previous?.count??0)+1,lastUsedAt:now,favorite:previous?.favorite??false},...current.filter(item=>item.foodId!==foodId)]});
    void recordCoachFoodSelection(foodId);
  };
  const toggleFavorite=(foodId:string,favorite:boolean)=>{
    setUsage(current=>{const previous=current.find(item=>item.foodId===foodId);return[{foodId,count:previous?.count??0,lastUsedAt:previous?.lastUsedAt??"",favorite},...current.filter(item=>item.foodId!==foodId)]});
    void setCoachFoodFavorite(foodId,favorite);
  };
  const submit=()=>startTransition(async()=>{
    setMessage("");
    const result=await saveMenuTree({id:menu.id,title:menu.title,description:menu.description,clientId:menu.clientId,status:menu.status,calorieTarget:menu.calorieTarget,proteinTarget:menu.proteinTarget,carbohydrateTarget:menu.carbohydrateTarget,fatTarget:menu.fatTarget,proteinTargetSource:menu.macroSources.protein,carbohydrateTargetSource:menu.macroSources.carbohydrates,fatTargetSource:menu.macroSources.fat,activeFrom:menu.status==="active"?new Date().toISOString().slice(0,10):"",days:[{dayIndex:0,title:"יום רגיל",sortOrder:0,meals:menu.meals.map((meal,mealIndex)=>({title:meal.title,sortOrder:mealIndex,items:meal.items.map((item,itemIndex)=>({...item,sortOrder:itemIndex}))}))}]});
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
      {menu.meals.map((meal,index)=><section key={index} className="rounded-[24px] border border-[#292929] bg-[#151515] p-5"><div className="flex gap-3"><input aria-label={`שם ארוחה ${index+1}`} className="nutrition-input" value={meal.title} onChange={event=>updateMeal(index,{...meal,title:event.target.value})}/><button type="button" aria-label="מחיקת ארוחה" onClick={()=>setMenu({...menu,meals:menu.meals.filter((_,i)=>i!==index)})} className="min-h-12 rounded-xl border border-red-400/20 px-3 text-red-300"><Trash2 size={18}/></button></div><div className="mt-4 space-y-3">{meal.items.map((item,itemIndex)=><div key={itemIndex} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_44px]"><FoodCombobox foods={foods} value={item.foodId} usage={usage} onSelect={foodId=>selectFood(index,itemIndex,foodId)} onToggleFavorite={toggleFavorite}/><input aria-label="כמות בגרם" className="nutrition-input" type="number" min="1" step="0.1" value={item.amount} onChange={event=>updateMeal(index,{...meal,items:meal.items.map((value,i)=>i===itemIndex?{...value,amount:Number(event.target.value)}:value)})}/><button type="button" aria-label="הסרת מזון" onClick={()=>updateMeal(index,{...meal,items:meal.items.filter((_,i)=>i!==itemIndex)})} className="rounded-xl border border-[#333]"><Trash2 size={16}/></button></div>)}</div><button type="button" onClick={()=>updateMeal(index,{...meal,items:[...meal.items,{foodId:"",amount:100}]})} className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-[#D4AF37]/30 px-4 text-sm font-bold text-[#D4AF37]"><Plus size={16}/>הוספת מזון</button></section>)}
      <button type="button" onClick={()=>setMenu({...menu,meals:[...menu.meals,emptyMeal()]})} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D4AF37]/40 text-[#D4AF37]"><Plus/>הוספת ארוחה</button>
    </div><aside className="rounded-[24px] border border-[#3A321B] bg-[#17150F] p-5 lg:sticky lg:top-5"><h2 className="font-black">סיכום מחושב</h2><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Total label="קלוריות" value={totals.calories}/><Total label="חלבון" value={totals.protein}/><Total label="פחמימות" value={totals.carbs}/><Total label="שומן" value={totals.fat}/></dl><p className="mt-4 text-xs leading-5 text-zinc-500">בעת השמירה השרת מחשב שוב את הערכים מהמאגר המאושר; ערכי הדפדפן אינם מקור סמכות.</p></aside></div>
  </div></main>
}

function Field({label,value,onChange,type="text"}:{label:string;value:string;onChange:(value:string)=>void;type?:string}){return <label className="text-sm font-bold">{label}<input className="nutrition-input mt-2" type={type} min={type==="number"?"1":undefined} value={value} onChange={event=>onChange(event.target.value)}/></label>}
function MacroField({label,value,source,onChange}:{label:string;value:string;source:MacroSource;onChange:(value:string)=>void}){return <label className="text-sm font-bold"><span className="flex items-center justify-between gap-2"><span>{label}</span><span className={`text-[10px] ${source==="auto"?"text-emerald-400":"text-amber-300"}`}>{source==="auto"?"מחושב אוטומטית":"הוזן ידנית"}</span></span><input className="nutrition-input mt-2" type="number" min="0" value={value} onChange={event=>onChange(event.target.value)}/></label>}
function Total({label,value}:{label:string;value:number}){return <div><dt className="text-zinc-500">{label}</dt><dd className="mt-1 font-black">{value.toFixed(1)}</dd></div>}
