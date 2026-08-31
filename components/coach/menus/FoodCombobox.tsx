"use client";
import { useMemo,useRef,useState } from "react";
import { Search, Star } from "lucide-react";
import { foodSearchRelevance,normalizeFoodText } from "@/lib/foods/repository";
import { foodMacroGroup } from "@/lib/nutrition/food-groups";
import type { GroupType } from "@/lib/nutrition/adaptation";

export type ComboboxFood={
  id:string;name:string;brand:string|null;category?:string;isMaster?:boolean;
  // foodMacroGroup classifies from the macros when a food carries no curated
  // group, so the three numbers it reads belong in the type handed to it.
  protein?:number|null;carbs?:number|null;fat?:number|null;
  /** Client picker metadata. Omitted by the coach menu editor. */
  // GroupType rather than MacroGroup: the menu editor's own options carry
  // "vegetables", which is a real group there and not one of the three macros.
  clientAdded?:boolean;personalFavorite?:boolean;masterGroup?:GroupType|null;
};
// favorite is null when the coach has said nothing either way - a usage row
// exists because the food was selected, which is not an opinion about it.
type Usage={foodId:string;count:number;lastUsedAt:string;favorite:boolean|null};

// The picker is a panel, not a dropdown. It used to be an absolutely positioned
// list hanging off a 150px input inside a wrapping row - on a phone that put the
// results over the row they belonged to. It now fills a bottom sheet, so the
// search field is at the top and the whole list is scrollable.
export default function FoodCombobox({foods,value,usage,onSelect,onToggleFavorite,onClose,clientCatalogueOrder=false}:{foods:readonly ComboboxFood[];value:string;usage:Usage[];onSelect:(id:string)=>void;onToggleFavorite?:(id:string,favorite:boolean)=>void;onClose?:()=>void;clientCatalogueOrder?:boolean}){
  const[query,setQuery]=useState("");const[active,setActive]=useState(0);const input=useRef<HTMLInputElement>(null);
  const usageMap=useMemo(()=>new Map(usage.map(item=>[item.foodId,item])),[usage]);
  // Only an explicit star or unstar overrides the curated status. Merely having
  // been chosen before does not, which is what "u ? u.favorite : ..." meant and
  // is how the curated list emptied itself through use.
  const isFavorite=(food:ComboboxFood,u?:Usage)=>clientCatalogueOrder
    ? Boolean(food.personalFavorite)
    : u?.favorite??Boolean(food.isMaster);
  const results=useMemo(()=>{
    const q=normalizeFoodText(query);
    const candidates=foods.map(food=>{const u=usageMap.get(food.id);const relevance=!q?0:foodSearchRelevance(q,[food.name,food.brand,food.category]);return{food,u,relevance,group:"תוצאות" as string}});
    // Searching narrows the list; it does not reorder it. Master foods used to
    // fall in among the rest as soon as anything was typed, ranked purely by
    // relevance - so the curated shortlist stopped being a shortlist exactly
    // when the coach was looking for something.
    const matching=q?candidates.filter(item=>item.relevance>=0):candidates;
    const byRelevance=(a:typeof candidates[number],b:typeof candidates[number])=>{
      const relevance=b.relevance-a.relevance;
      if(relevance)return relevance;
      const usageCount=(b.u?.count??0)-(a.u?.count??0);
      return usageCount||a.food.name.localeCompare(b.food.name,"he");
    };
    if(clientCatalogueOrder){
      const macroLabel=(food:ComboboxFood)=>{
        // "vegetables" is not one of the three columns this label names, so a
        // vegetable falls through to classification by its macros - which is
        // what happened before the type let it through at all.
        const group=food.masterGroup&&food.masterGroup!=="vegetables"
          ?food.masterGroup
          :foodMacroGroup({
              id:food.id,name:food.name,category:food.category,
              protein:food.protein??null,carbs:food.carbs??null,fat:food.fat??null,
            });
        return group==="protein"?"חלבון":group==="carbohydrate"?"פחמימה":"שומן";
      };
      const ordered=matching.slice().sort(byRelevance);
      const included=new Set<string>();
      const take=(predicate:(food:ComboboxFood)=>boolean,group:(food:ComboboxFood)=>string)=>ordered
        .filter(({food})=>!included.has(food.id)&&predicate(food))
        .map(item=>{included.add(item.food.id);return{...item,group:group(item.food)}});
      const clientFoods=take(food=>Boolean(food.clientAdded),()=>"נוספו על ידך");
      const macroGroups=["חלבון","פחמימה","שומן"] as const;
      const favorites=macroGroups.flatMap(label=>take(
        food=>Boolean(food.personalFavorite)&&macroLabel(food)===label,
        ()=>`מועדפים · ${label}`,
      ));
      const masters=macroGroups.flatMap(label=>take(
        food=>Boolean(food.isMaster)&&macroLabel(food)===label,
        ()=>`מזונות מאסטר · ${label}`,
      ));
      const rest=take(()=>true,()=>q?"תוצאות נוספות":"מזונות נוספים");
      return[...clientFoods,...favorites,...masters,...rest].slice(0,q?100:180);
    }
    if(q){
      const searchFavorites=matching.filter(item=>isFavorite(item.food,item.u)).sort(byRelevance).map(item=>({...item,group:"⭐ מאכלים מועדפים"}));
      const searchFavoriteIds=new Set(searchFavorites.map(item=>item.food.id));
      const searchRest=matching.filter(item=>!searchFavoriteIds.has(item.food.id)).sort(byRelevance).map(item=>({...item,group:"תוצאות חיפוש"}));
      return[...searchFavorites,...searchRest].slice(0,100);
    }
    const favorites=candidates.filter(item=>isFavorite(item.food,item.u)).sort(byRelevance).map(item=>({...item,group:"⭐ מאכלים מועדפים"}));
    const favoriteIds=new Set(favorites.map(item=>item.food.id));
    const used=candidates.filter(item=>item.u);
    const recent=used.filter(item=>!favoriteIds.has(item.food.id)).slice().sort((a,b)=>(b.u?.lastUsedAt??"").localeCompare(a.u?.lastUsedAt??"")).slice(0,30).map(item=>({...item,group:"מזונות אחרונים"}));
    const included=new Set([...favoriteIds,...recent.map(item=>item.food.id)]);
    const rest=candidates.filter(item=>!included.has(item.food.id)).sort((a,b)=>a.food.name.localeCompare(b.food.name,"he")).slice(0,Math.max(0,100-favorites.length-recent.length)).map(item=>({...item,group:"כל המזונות"}));
    return[...favorites,...recent,...rest];
  },[clientCatalogueOrder,foods,query,usageMap]);
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
          <div
            role="option"
            tabIndex={0}
            aria-selected={item.food.id===value}
            className="food-picker__option flex cursor-pointer items-center gap-2"
            data-active={index===active||undefined}
            onClick={()=>choose(item.food.id)}
            onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();choose(item.food.id)}}}
          >
            <button type="button" className="food-picker__choose" onMouseDown={event=>event.preventDefault()} onClick={event=>{event.stopPropagation();choose(item.food.id)}}>
              <strong>{item.food.name}</strong>
              {item.food.brand&&<span>{item.food.brand}</span>}
              {item.u&&<small>נבחר {item.u.count} פעמים</small>}
            </button>
            <button
              type="button"
              aria-label={isFavorite(item.food,item.u)?`הסרת ${item.food.name} מהמועדפים`:`הוספת ${item.food.name} למועדפים`}
              title={isFavorite(item.food,item.u)?"הסרה מהמועדפים":"הוספה למועדפים"}
              onClick={event=>{event.stopPropagation();onToggleFavorite?.(item.food.id,!isFavorite(item.food,item.u))}}
              className="shrink-0 rounded-xl p-2 text-[#16A34A]"
            ><Star size={17} fill={isFavorite(item.food,item.u)?"currentColor":"none"}/></button>
          </div>
        </div>
      ):<p className="p-6 text-center text-sm text-[#5B5F5B]">לא נמצאו מזונות.</p>}
    </div>
  </div>;
}
