"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { buildGuidanceView } from "@/lib/workouts/exercise-guidance";
import type { Exercise } from "@/lib/workouts/types";

export default function ExerciseThumbnail({exercise}:{exercise?:Exercise}){
  const imageUrl=exercise?buildGuidanceView(exercise).imageUrl:undefined;
  const[fallbackFor,setFallbackFor]=useState<string>();
  const[broken,setBroken]=useState<string>();
  // Workout data arrives after the provider snapshot has loaded. Keeping only
  // the first useState value left some cards on the placeholder even though
  // their exercise already had an approved YouTube video and thumbnail.
  // The URL now asks for hqdefault, which exists for every video. mqdefault is
  // the one below it and exists for older uploads that predate hqdefault; after
  // that there is nothing to try and the card draws its placeholder.
  const src=!imageUrl||broken===imageUrl?undefined:fallbackFor===imageUrl?imageUrl.replace("hqdefault","mqdefault"):imageUrl;
  if(!src)return <span aria-hidden="true" className="grid h-16 w-20 shrink-0 place-items-center rounded-xl border border-dashed border-[#E5E7E5] bg-[#F7F8F7] text-[#8A8F8A]"><ImageIcon size={20}/></span>;
  // eslint-disable-next-line @next/next/no-img-element -- the fallback swaps YouTube thumbnail qualities after a real load failure
  return <img
    src={src}
    alt={`תמונה של ${exercise?.name??"התרגיל"}`}
    loading="lazy"
    className="h-16 w-20 shrink-0 rounded-xl border border-[#E5E7E5] object-cover object-center"
    onError={()=>{
      if(src.includes("hqdefault")){setFallbackFor(imageUrl);return}
      setBroken(imageUrl);
    }}
  />;
}
