"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {ArrowRight,FolderOpen,Search} from "lucide-react";
import {useWorkouts} from "@/components/workouts/WorkoutProvider";
import ExerciseGuidanceButton from "@/components/workouts/ExerciseGuidanceButton";
import ExerciseThumbnail from "@/components/workouts/ExerciseThumbnail";
import MuscleIllustration from "@/components/workouts/MuscleIllustration";
import {SkeletonList,StateBlock} from "@/components/client/AppPatterns";
import {EQUIPMENT_TAGS,MUSCLE_FOLDERS,exerciseTaxonomy,type MuscleFolder} from "@/lib/workouts/exercise-taxonomy";
import {normalizeExerciseName} from "@/lib/workouts/normalization";

export default function ExerciseDirectory(){
 const {snapshot,loading,persistenceError}=useWorkouts();
 const [folder,setFolder]=useState<MuscleFolder>();const[search,setSearch]=useState("");const[equipment,setEquipment]=useState("");const[focus,setFocus]=useState("");
 const all=useMemo(()=>snapshot.exercises.filter(e=>e.status==="active").map(exercise=>({exercise,taxonomy:exerciseTaxonomy(exercise)})),[snapshot.exercises]);
 const inFolder=useMemo(()=>all.filter(e=>!folder||e.taxonomy.folder===folder),[all,folder]);
 const focuses=[...new Set(inFolder.map(e=>e.taxonomy.focus))].sort((a,b)=>a.localeCompare(b,"he"));
 const equipmentOptions=EQUIPMENT_TAGS.filter(tag=>inFolder.some(e=>e.taxonomy.equipment.includes(tag)));
 const query=normalizeExerciseName(search);
 const results=inFolder.filter(({exercise,taxonomy:t})=>(!query||normalizeExerciseName([t.name,t.focus,t.folder,...t.equipment,...exercise.aliases].join(" ")).includes(query))&&(!focus||t.focus===focus)&&(!equipment||(equipment==="home"?t.home:t.equipment.includes(equipment)))).sort((a,b)=>a.taxonomy.name.localeCompare(b.taxonomy.name,"he"));
 const browsing=Boolean(folder||query||equipment||focus);
 const open=(next:MuscleFolder)=>{setFolder(next);setSearch("");setEquipment("");setFocus("");};
 const reset=()=>{setFolder(undefined);setSearch("");setEquipment("");setFocus("");};
 if(loading)return <SkeletonList rows={4}/>;
 if(persistenceError)return <StateBlock title="לא הצלחנו לטעון את מאגר התרגילים" description={persistenceError}/>;
 return <div className="space-y-5">
  <section className="rounded-[22px] border border-[#E5E7E5] bg-white p-4">
   <label className="relative block"><Search aria-hidden="true" size={18} className="absolute right-4 top-4 text-[#16A34A]"/><span className="sr-only">חיפוש תרגיל</span><input className="nutrition-input pr-11" value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש לפי תרגיל, שריר או ציוד"/></label>
   {browsing&&<div className="mt-3 grid gap-3 sm:grid-cols-2">
    <Filter label="דגש שרירי" value={focus} onChange={setFocus} values={focuses.map(s=>({value:s,label:s}))}/>
    <Filter label="ציוד נדרש" value={equipment} onChange={setEquipment} values={[{value:"home",label:"ציוד כושר ביתי"},...equipmentOptions.map(s=>({value:s,label:s}))]}/>
   </div>}
  </section>
  {!browsing?<>
   <p className="text-sm text-[#5B5F5B]">בחר קבוצת שרירים כדי לפתוח את התרגילים שלה · {all.length} תרגילים במאגר</p>
   <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{MUSCLE_FOLDERS.map(muscle=><button type="button" key={muscle} onClick={()=>open(muscle)} className="rounded-[22px] border border-[#E5E7E5] bg-white p-4 text-start transition hover:border-[#16A34A] focus-visible:outline-2 focus-visible:outline-[#16A34A]">
    <MuscleIllustration muscle={muscle}/><span className="mt-2 flex items-center gap-2 text-xl font-black"><FolderOpen size={20} aria-hidden="true"/>{muscle}</span><span className="mt-1 block text-sm text-[#5B5F5B]">{all.filter(e=>e.taxonomy.folder===muscle).length} תרגילים</span>
   </button>)}</div>
   {(["חימום","לבדיקת מאמן"] as const).map(muscle=>{const count=all.filter(e=>e.taxonomy.folder===muscle).length;return count?<button type="button" key={muscle} onClick={()=>open(muscle)} className="chip">{muscle} · {count} תרגילים</button>:null;})}
  </>:<>
   <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 font-bold text-[#16A34A]"><ArrowRight size={18} aria-hidden="true"/>כל קבוצות השרירים</button><span className="text-sm text-[#5B5F5B]">{results.length} תרגילים</span></div>
   <h2 className="text-2xl font-black">{folder??"תוצאות חיפוש בכל המאגר"}</h2>
   {results.length?<div className="grid gap-3 md:grid-cols-2">{results.map(({exercise,taxonomy:t})=>{const href=`/coach/workouts/exercises/${exercise.id}`;return <article key={exercise.id} className="rounded-[22px] border border-[#E5E7E5] bg-white p-5">
    <Link href={href} aria-label={`פתיחת פרטי ${exercise.name}`} className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-[#16A34A]"><ExerciseThumbnail exercise={exercise}/><h3 className="min-w-0 text-lg font-black">{t.name}</h3></Link>
    <p className="mt-3 text-sm font-bold text-[#3F433F]">דגש: {t.focus}</p>
    <div aria-label="ציוד נדרש" className="mt-2 flex flex-wrap gap-2">{t.equipment.map(tag=><span key={tag} className="pill">{tag}</span>)}{!t.equipment.length&&<span className="text-xs text-[#5B5F5B]">הציוד לא צוין במקור — יש לבדוק בסרטון</span>}</div>
    {exercise.difficulty&&<p className="mt-2 text-xs text-[#5B5F5B]">רמה: {exercise.difficulty}</p>}
    <div className="mt-3 flex flex-wrap items-center gap-4"><Link href={href} className="inline-flex min-h-11 items-center text-sm text-[#16A34A]">פרטים וסרטון טכניקה</Link><ExerciseGuidanceButton exercise={exercise} variant="link"/></div>
   </article>;})}</div>:<StateBlock title="לא נמצאו תרגילים" description="אפשר לשנות את החיפוש או לנקות את סינון הציוד והדגש."/>}
  </>}
 </div>;
}
function Filter({label,value,onChange,values}:{label:string;value:string;onChange:(value:string)=>void;values:{value:string;label:string}[]}){return <label className="text-xs text-[#5B5F5B]">{label}<select className="nutrition-input mt-1" value={value} onChange={e=>onChange(e.target.value)}><option value="">הכול</option>{values.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}</select></label>;}
