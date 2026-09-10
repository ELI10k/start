"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";
import AteSomethingElse, { type PickableFood } from "@/components/client/AteSomethingElse";
import type { GroupType } from "@/lib/nutrition/adaptation";
import type { FoodUsage } from "@/components/coach/menus/FoodCombobox";

export default function MealGroupSubstitution({mealId,date,groupLabel,groupType,foods,usage=[],compact=false,onReplaced}:{mealId:string;date:string;groupLabel:string;groupType:GroupType;foods:readonly PickableFood[];usage?:readonly FoodUsage[];compact?:boolean;onReplaced?:()=>void}){
  const[open,setOpen]=useState(false);
  return <>
    <button type="button" onClick={()=>setOpen(true)} className={`${compact?"":"mt-3"} inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-[#16A34A] px-3 py-2 text-sm font-black text-[#15803D]`}><PencilLine aria-hidden="true" size={15}/>{compact?"החלפה":`אכלתי ${groupLabel} אחר`}</button>
    <AteSomethingElse mealId={mealId} date={date} foods={foods} usage={usage} groupType={groupType} open={open} onClose={()=>setOpen(false)} onSaved={()=>{onReplaced?.();setOpen(false)}} preserveMealStatus title={`איזה ${groupLabel} אכלת?`}/>
  </>;
}
