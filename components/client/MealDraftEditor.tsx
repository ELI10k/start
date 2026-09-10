"use client";

import { useActionState, useMemo, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { saveMealDraftState, type MealDraftSaveState } from "@/app/actions/product";
import MealGroupSubstitution from "@/components/client/MealGroupSubstitution";
import SubmitButton from "@/components/forms/SubmitButton";
import type { PickableFood } from "@/components/client/AteSomethingElse";
import type { FoodUsage } from "@/components/coach/menus/FoodCombobox";
import type { GroupType } from "@/lib/nutrition/adaptation";

type Item = { id:string; name:string; quantity:number; unit:string; calories:number; household?:string; note?:string|null };
type Group = { id:string; type:GroupType; label:string; selectedItemId?:string|null; amountOverride?:number|null; items:Item[] };
type Draft = Record<string,{itemId:string;quantity:number}>;
const round=(value:number)=>Math.round(value*10)/10;

function initialDraft(groups:Group[]):Draft {
  return Object.fromEntries(groups.flatMap(group=>{
    // The first item is the coach's prescribed choice. A missing client
    // selection means "use the plan", not "this group has no food".
    const item=group.items.find(entry=>entry.id===group.selectedItemId) ?? group.items[0];
    return item ? [[group.id,{itemId:item.id,quantity:group.amountOverride ?? item.quantity}]] : [];
  }));
}

export default function MealDraftEditor({mealId,date,groups,foods,usage=[]}:{mealId:string;date:string;groups:Group[];foods:readonly PickableFood[];usage?:readonly FoodUsage[]}) {
  const original=useMemo(()=>initialDraft(groups),[groups]);
  const [draft,setDraft]=useState<Draft>(()=>initialDraft(groups));
  const [state,formAction]=useActionState<MealDraftSaveState,FormData>(saveMealDraftState,{ok:false,message:""});
  const payload=useMemo(()=>Object.entries(draft).map(([groupId,value])=>({groupId,...value})),[draft]);
  const dirty=JSON.stringify(draft)!==JSON.stringify(original);
  const summary=useMemo(()=>groups.reduce((total,group)=>{
    const selected=draft[group.id];
    const item=group.items.find(entry=>entry.id===selected?.itemId);
    if(!item||!selected||item.quantity<=0)return total;
    return total+(item.calories*selected.quantity/item.quantity);
  },0),[draft,groups]);
  const updateQuantity=(group:Group,quantity:number)=>setDraft(current=>{
    const selected=current[group.id];
    if(!selected)return current;
    return {...current,[group.id]:{...selected,quantity:Math.max(0,round(quantity))}};
  });

  return <div className="mt-4 rounded-3xl border border-[#E5E7E5] bg-white p-3 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F3FBF6] px-4 py-3">
      <div><p className="text-xs text-[#5B5F5B]">סיכום הארוחה</p><p className="font-black">{round(summary)} קל׳ · {payload.length} קבוצות</p></div>
      {dirty?<button type="button" onClick={()=>setDraft(original)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7D9D7] px-3 text-sm font-bold"><RotateCcw size={15}/>ביטול שינויים</button>:null}
    </div>
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="mealId" value={mealId}/><input type="hidden" name="date" value={date}/>
      <input type="hidden" name="groups" value={JSON.stringify(payload)}/>
      {groups.map(group=>{
        const selected=draft[group.id];
        const selectedItem=group.items.find(item=>item.id===selected?.itemId);
        const step=Math.max(1,round((selectedItem?.quantity??4)/4));
        const calories=selectedItem&&selected&&selectedItem.quantity>0?round(selectedItem.calories*selected.quantity/selectedItem.quantity):0;
        return <section key={group.id} className="rounded-2xl border border-[#E5E7E5] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-[#15803D]">{group.label}</p>
            <div className="shrink-0 text-left text-sm"><strong>{calories} קל׳</strong><span className="mr-2 text-xs text-[#5B5F5B]">{selected?.quantity??0} {selectedItem?.unit}</span></div>
          </div>
          <div className="mt-2 grid w-full gap-2" role="group" aria-label={`בחירת ${group.label}`}>
                {group.items.map(item=>{
                  const chosen=selected?.itemId===item.id;
                  return <button key={item.id} type="button" aria-pressed={chosen} onClick={()=>setDraft(current=>({...current,[group.id]:{itemId:item.id,quantity:item.quantity}}))} className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-start ${chosen?"border-[#16A34A] bg-[#F0FDF4]":"border-[#E5E7E5] bg-white"}`}>
                    <strong className="min-w-0 flex-1">{item.name}</strong>
                    <span className="shrink-0 text-xs text-[#5B5F5B]">{item.quantity} {item.unit} · {round(item.calories)} קל׳</span>
                  </button>;
                })}
          </div>
          {selectedItem?.household?<p className="mt-2 text-xs text-[#5B5F5B]">{selectedItem.household}</p>:null}
          <div className="mt-3 flex items-center gap-2">
            <button type="button" className="chip !min-h-10 !px-3" onClick={()=>updateQuantity(group,(selected?.quantity??0)-step)} aria-label="הפחתת כמות"><Minus size={16}/></button>
            <input aria-label={`כמות ${group.label}`} className="min-w-0 flex-1 rounded-xl border border-[#D7D9D7] px-3 py-2 text-center text-base" type="number" inputMode="decimal" min="0" step="any" value={selected?.quantity??0} onChange={event=>updateQuantity(group,Number(event.target.value))}/>
            <button type="button" className="chip !min-h-10 !px-3" onClick={()=>updateQuantity(group,(selected?.quantity??0)+step)} aria-label="הוספת כמות"><Plus size={16}/></button>
            <MealGroupSubstitution compact mealId={mealId} date={date} groupLabel={group.label} groupType={group.type} foods={foods} usage={usage} onReplaced={()=>setDraft(current=>Object.fromEntries(Object.entries(current).filter(([id])=>id!==group.id)))}/>
          </div>
          {selectedItem?.note?<p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{selectedItem.note}</p>:null}
        </section>;
      })}
      <div className="sticky bottom-20 z-10 rounded-2xl bg-white pt-2 shadow-[0_-10px_20px_rgba(255,255,255,.95)]">
        <SubmitButton className="premium-primary-button w-full" idle="שמירת הארוחה" pending="שומרים את הארוחה…"/>
      </div>
      {state.message?<p role="status" className={`rounded-xl px-3 py-2 text-center text-sm font-bold ${state.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-700"}`}>{state.message}</p>:null}
    </form>
  </div>;
}
