"use client";
import { useMemo,useRef,useState } from "react";
import { ChevronDown,Star } from "lucide-react";
import { normalizeFoodText } from "@/lib/foods/repository";

export type ComboboxFood={id:string;name:string;brand:string|null};
type Usage={foodId:string;count:number;lastUsedAt:string;favorite:boolean};

export default function FoodCombobox({foods,value,usage,onSelect,onToggleFavorite}:{foods:ComboboxFood[];value:string;usage:Usage[];onSelect:(id:string)=>void;onToggleFavorite:(id:string,favorite:boolean)=>void}){
  const[open,setOpen]=useState(false);const[query,setQuery]=useState("");const[active,setActive]=useState(0);const input=useRef<HTMLInputElement>(null);
  const usageMap=useMemo(()=>new Map(usage.map(item=>[item.foodId,item])),[usage]);
  const selected=foods.find(food=>food.id===value);
  const results=useMemo(()=>{
    const q=normalizeFoodText(query);
    const candidates=foods.map(food=>{const text=normalizeFoodText(`${food.name} ${food.brand??""}`);const u=usageMap.get(food.id);const relevance=!q?0:text===q?4:text.startsWith(q)?3:text.split(" ").some(word=>word.startsWith(q))?2:text.includes(q)?1:-1;return{food,u,relevance,group:"תוצאות" as string}});
    if(q)return candidates.filter(item=>item.relevance>=0).sort((a,b)=>b.relevance-a.relevance||(b.u?.count??0)-(a.u?.count??0)||a.food.name.localeCompare(b.food.name,"he")).slice(0,100);
    const used=candidates.filter(item=>item.u);
    const recent=used.slice().sort((a,b)=>(b.u?.lastUsedAt??"").localeCompare(a.u?.lastUsedAt??"")).slice(0,30).map(item=>({...item,group:"מזונות אחרונים"}));
    const included=new Set(recent.map(item=>item.food.id));
    const favorites=used.filter(item=>!included.has(item.food.id)).sort((a,b)=>Number(Boolean(b.u?.favorite))-Number(Boolean(a.u?.favorite))||(b.u?.count??0)-(a.u?.count??0)).slice(0,30).map(item=>({...item,group:"מזונות מועדפים ונפוצים"}));
    favorites.forEach(item=>included.add(item.food.id));
    const rest=candidates.filter(item=>!included.has(item.food.id)).sort((a,b)=>a.food.name.localeCompare(b.food.name,"he")).slice(0,Math.max(0,100-recent.length-favorites.length)).map(item=>({...item,group:"כל המזונות"}));
    return[...recent,...favorites,...rest];
  },[foods,query,usageMap]);
  const choose=(id:string)=>{onSelect(id);setOpen(false);setQuery("");setActive(0)};
  return <div className="relative"><label className="sr-only">מזון</label><div className="relative"><input ref={input} aria-label="חיפוש מזון" role="combobox" aria-expanded={open} aria-controls="food-options" aria-autocomplete="list" className="nutrition-input pl-10" value={open?query:(selected?`${selected.name}${selected.brand?` — ${selected.brand}`:""}`:"")} placeholder="חיפוש מזון בעברית או באנגלית" onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(0)}} onKeyDown={event=>{if(event.key==="ArrowDown"){event.preventDefault();setOpen(true);setActive(index=>Math.min(results.length-1,index+1))}else if(event.key==="ArrowUp"){event.preventDefault();setActive(index=>Math.max(0,index-1))}else if(event.key==="Enter"&&open&&results[active]){event.preventDefault();choose(results[active].food.id)}else if(event.key==="Escape"){setOpen(false);setQuery("")}}}/><button type="button" aria-label="פתיחת רשימת מזונות" className="absolute left-2 top-2 p-2 text-zinc-500" onClick={()=>{setOpen(value=>!value);input.current?.focus()}}><ChevronDown size={16}/></button></div>{open&&<div id="food-options" role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#333] bg-[#111] p-2 shadow-2xl">{results.length?results.map((item,index)=><div key={item.food.id}>{(index===0||results[index-1]?.group!==item.group)&&<p className="px-3 pb-1 pt-2 text-[10px] font-black text-[#D4AF37]">{item.group}</p>}<div role="option" aria-selected={item.food.id===value} className={`flex items-center rounded-xl ${index===active?"bg-[#D4AF37]/15":"hover:bg-white/5"}`}><button type="button" className="min-h-11 flex-1 px-3 text-right text-sm" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(item.food.id)}>{item.food.name}{item.food.brand&&<span className="mr-2 text-xs text-zinc-500">{item.food.brand}</span>}{item.u&&<span className="mr-2 text-[10px] text-zinc-600">נבחר {item.u.count} פעמים</span>}</button><button type="button" aria-label={item.u?.favorite?"הסרה מהמועדפים":"הוספה למועדפים"} className="p-3 text-[#D4AF37]" onMouseDown={event=>event.preventDefault()} onClick={()=>onToggleFavorite(item.food.id,!item.u?.favorite)}><Star size={15} fill={item.u?.favorite?"currentColor":"none"}/></button></div></div>):<p className="p-4 text-center text-sm text-zinc-500">לא נמצאו מזונות.</p>}</div>}</div>
}
