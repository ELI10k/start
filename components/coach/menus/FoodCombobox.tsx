"use client";
import { useMemo,useRef,useState } from "react";
import { Search } from "lucide-react";
import { foodSearchRelevance,normalizeFoodText } from "@/lib/foods/repository";

export type ComboboxFood={id:string;name:string;brand:string|null;category?:string;isMaster?:boolean};
type Usage={foodId:string;count:number;lastUsedAt:string;favorite:boolean};

// The picker is a panel, not a dropdown. It used to be an absolutely positioned
// list hanging off a 150px input inside a wrapping row - on a phone that put the
// results over the row they belonged to. It now fills a bottom sheet, so the
// search field is at the top and the whole list is scrollable.
export default function FoodCombobox({foods,value,usage,onSelect,onClose}:{foods:ComboboxFood[];value:string;usage:Usage[];onSelect:(id:string)=>void;onToggleFavorite?:(id:string,favorite:boolean)=>void;onClose?:()=>void}){
  const[query,setQuery]=useState("");const[active,setActive]=useState(0);const input=useRef<HTMLInputElement>(null);
  const usageMap=useMemo(()=>new Map(usage.map(item=>[item.foodId,item])),[usage]);
  const results=useMemo(()=>{
    const q=normalizeFoodText(query);
    const candidates=foods.map(food=>{const u=usageMap.get(food.id);const relevance=!q?0:foodSearchRelevance(q,[food.name,food.brand,food.category]);return{food,u,relevance,group:"תוצאות" as string}});
    if(q)return candidates.filter(item=>item.relevance>=0).sort((a,b)=>{
      const relevance=b.relevance-a.relevance;
      if(relevance)return relevance;
      const master=Number(Boolean(b.food.isMaster))-Number(Boolean(a.food.isMaster));
      if(master)return master;
      const usageCount=(b.u?.count??0)-(a.u?.count??0);
      return usageCount||a.food.name.localeCompare(b.food.name,"he");
    }).slice(0,100);
    const masters=candidates.filter(item=>item.food.isMaster).map(item=>({...item,group:"⭐ מאכלי מאסטר"}));
    const masterIds=new Set(masters.map(item=>item.food.id));
    const used=candidates.filter(item=>item.u);
    const recent=used.filter(item=>!masterIds.has(item.food.id)).slice().sort((a,b)=>(b.u?.lastUsedAt??"").localeCompare(a.u?.lastUsedAt??"")).slice(0,30).map(item=>({...item,group:"מזונות אחרונים"}));
    const included=new Set([...masterIds,...recent.map(item=>item.food.id)]);
    const rest=candidates.filter(item=>!included.has(item.food.id)).sort((a,b)=>a.food.name.localeCompare(b.food.name,"he")).slice(0,Math.max(0,100-masters.length-recent.length)).map(item=>({...item,group:"כל המזונות"}));
    return[...masters,...recent,...rest];
  },[foods,query,usageMap]);
  const choose=(id:string)=>{onSelect(id);setQuery("");setActive(0)};

  return <div className="food-picker">
    <label className="sr-only" htmlFor="food-search">מזון</label>
    <div className="food-picker__search">
      <Search aria-hidden="true" size={17}/>
      <input
        id="food-search"
        ref={input}
        aria-label="חיפוש מזון"
        role="combobox"
        aria-expanded="true"
        aria-controls="food-options"
        aria-autocomplete="list"
        className="nutrition-input"
        autoFocus
        value={query}
        placeholder="חיפוש מזון בעברית או באנגלית"
        onChange={event=>{setQuery(event.target.value);setActive(0)}}
        onKeyDown={event=>{
          if(event.key==="ArrowDown"){event.preventDefault();setActive(index=>Math.min(results.length-1,index+1))}
          else if(event.key==="ArrowUp"){event.preventDefault();setActive(index=>Math.max(0,index-1))}
          else if(event.key==="Enter"&&results[active]){event.preventDefault();choose(results[active].food.id)}
          else if(event.key==="Escape"){setQuery("");onClose?.()}
        }}
      />
    </div>
    <div id="food-options" role="listbox" aria-label="תוצאות חיפוש מזון" className="food-picker__list">
      {results.length?results.map((item,index)=>
        <div key={item.food.id}>
          {(index===0||results[index-1]?.group!==item.group)&&<p className="food-picker__group">{item.group}</p>}
          <div role="option" aria-selected={item.food.id===value} className="food-picker__option" data-active={index===active||undefined}>
            <button type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(item.food.id)}>
              <strong>{item.food.name}</strong>
              {item.food.brand&&<span>{item.food.brand}</span>}
              {item.u&&<small>נבחר {item.u.count} פעמים</small>}
            </button>
          </div>
        </div>
      ):<p className="p-6 text-center text-sm text-[#5B5F5B]">לא נמצאו מזונות.</p>}
    </div>
  </div>;
}
