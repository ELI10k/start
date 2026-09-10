"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";
import AteSomethingElse, { type PickableFood } from "@/components/client/AteSomethingElse";

export default function MealGroupSubstitution({mealId,date,groupLabel,foods}:{mealId:string;date:string;groupLabel:string;foods:readonly PickableFood[]}){
  const[open,setOpen]=useState(false);
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#16A34A] px-3 py-2 text-sm font-black text-[#15803D]"><PencilLine aria-hidden="true" size={15}/>אכלתי {groupLabel} אחר</button>
    <AteSomethingElse mealId={mealId} date={date} foods={foods} open={open} onClose={()=>setOpen(false)} preserveMealStatus title={`איזה ${groupLabel} אכלת?`}/>
  </>;
}
