"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { buildGuidanceView } from "@/lib/workouts/exercise-guidance";
import type { Exercise } from "@/lib/workouts/types";

export default function ExerciseThumbnail({exercise}:{exercise?:Exercise}){
  const imageUrl=exercise?buildGuidanceView(exercise).imageUrl:undefined;
  const[src,setSrc]=useState(imageUrl);
  if(!src)return <span aria-hidden="true" className="grid h-16 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-[#E5E7E5] bg-[#F7F8F7] text-[#8A8F8A]"><ImageIcon size={20}/></span>;
  // eslint-disable-next-line @next/next/no-img-element -- the fallback swaps YouTube thumbnail qualities after a real load failure
  return <img
    src={src}
    alt={`תמונה של ${exercise?.name??"התרגיל"}`}
    loading="lazy"
    className="h-16 w-20 shrink-0 rounded-xl border border-[#E5E7E5] object-cover object-center"
    onError={()=>{
      if(src.includes("maxresdefault")){setSrc(src.replace("maxresdefault","hqdefault"));return}
      setSrc(undefined);
    }}
  />;
}
