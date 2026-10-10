import type { MuscleFolder } from "@/lib/workouts/exercise-taxonomy";
/** A schematic of the region, not an exercise demonstration. */
export default function MuscleIllustration({muscle}:{muscle:MuscleFolder}){
 const back=muscle==="גב"||muscle==="יד אחורית";
 const active="#16A34A",muted="#DAE3DD";
 return <svg role="img" aria-label={`המחשת קבוצת שרירי ${muscle}`} viewBox="0 0 160 210" className="h-40 w-full" xmlns="http://www.w3.org/2000/svg">
  <circle cx="80" cy="22" r="15" fill="#DCE5DF"/>
  <path d="M66 40L52 47 46 83 35 118 42 123 57 91 61 72 63 122 61 145 60 192 69 198 80 145 91 198 100 192 99 145 97 122 99 72 103 91 118 123 125 118 114 83 108 47 94 40Z" fill="#EAF0EC" stroke="#B8C7BD" strokeWidth="2"/>
  <path d="M63 49L77 51 77 69 64 73Z M83 51L97 49 96 73 83 69Z" fill={muscle==="חזה"?active:muted}/>
  <path d="M53 48Q44 57 49 71L60 65 63 49Z M107 48Q116 57 111 71L100 65 97 49Z" fill={muscle==="כתפיים"?active:muted}/>
  <path d="M49 73L59 69 56 91 48 97 44 94Z M111 73L101 69 104 91 112 97 116 94Z" fill={muscle===(back?"יד אחורית":"יד קדמית")?active:muted}/>
  {back?<path d="M64 76L78 71 82 71 96 76 93 107 80 117 67 107Z M69 46L80 41 91 46 80 67Z" fill={muscle==="גב"?active:muted}/>:<path d="M69 77H77V117H69Z M83 77H91V117H83Z M64 77L68 80V113L65 108Z M96 77L92 80V113L95 108Z" fill={muscle==="בטן"?active:muted}/>}
  <path d="M64 122L78 128 75 151 66 158 64 147Z M96 122L82 128 85 151 94 158 96 147Z M65 162L74 158 69 188 63 186Z M95 162L86 158 91 188 97 186Z" fill={muscle==="רגליים"?active:muted}/>
  <text x="80" y="208" textAnchor="middle" fill="#5B5F5B" fontSize="10">{back?"מבט אחורי":"מבט קדמי"}</text>
 </svg>;
}
