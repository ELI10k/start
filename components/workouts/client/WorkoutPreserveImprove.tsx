import type { WorkoutInsight } from "@/lib/workouts/session-report";

export default function WorkoutPreserveImprove({insights,className="mt-5"}:{insights:readonly WorkoutInsight[];className?:string}){
  const preserve=insights.filter((item)=>item.tone==="praise");
  const improve=insights.filter((item)=>item.tone!=="praise");
  return <section className={className} aria-labelledby="preserve-improve-title">
    <h2 id="preserve-improve-title" className="text-xl font-black">שימור ושיפור</h2>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-[#16A34A]/25 bg-[#ECFDF3] p-4"><h3 className="font-black text-[#15803D]">לשמר</h3><ul className="mt-2 space-y-2 text-sm">{preserve.length?preserve.map(item=><li key={item.title}><strong>{item.title}</strong><span className="block text-[#415247]">{item.detail}</span></li>):<li>השלמת האימון והנתונים שנרשמו הם הבסיס להתקדמות הבאה.</li>}</ul></article>
      <article className="rounded-2xl border border-[#DC2626]/20 bg-[#FEF2F2] p-4"><h3 className="font-black text-[#DC2626]">לשפר</h3><ul className="mt-2 space-y-2 text-sm">{improve.length?improve.map(item=><li key={item.title}><strong>{item.title}</strong><span className="block text-[#624141]">{item.detail}</span></li>):<li>לא זוהתה כרגע נקודה שדורשת שינוי.</li>}</ul></article>
    </div>
  </section>;
}
