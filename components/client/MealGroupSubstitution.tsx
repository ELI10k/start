"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";
import AteSomethingElse, { type PickableFood } from "@/components/client/AteSomethingElse";
import { foodsForGroup } from "@/lib/nutrition/food-groups";
import type { GroupType } from "@/lib/nutrition/adaptation";

const isGroupType=(value:string):value is GroupType=>
  value==="protein"||value==="carbohydrate"||value==="fat"||value==="vegetables";

export default function MealGroupSubstitution({mealId,date,groupLabel,groupType,foods}:{mealId:string;date:string;groupLabel:string;groupType:string;foods:readonly PickableFood[]}){
  const[open,setOpen]=useState(false);
  // Unknown database values must not reopen the entire catalogue under a
  // misleading heading. The recognised group is the sole source of options.
  const groupFoods=isGroupType(groupType)?foodsForGroup(foods,groupType):[];
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#16A34A] px-3 py-2 text-sm font-black text-[#15803D]"><PencilLine aria-hidden="true" size={15}/>אכלתי {groupLabel} אחר</button>
    <AteSomethingElse mealId={mealId} date={date} foods={groupFoods} open={open} onClose={()=>setOpen(false)} preserveMealStatus title={`איזה ${groupLabel} אכלת?`}/>
  </>;
}
