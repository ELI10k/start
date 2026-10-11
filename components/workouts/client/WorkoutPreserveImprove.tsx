import type { WorkoutInsight } from "@/lib/workouts/session-report";

export default function WorkoutPreserveImprove({insights,className="mt-5"}:{insights:readonly WorkoutInsight[];className?:string}){
  const worked=insights.filter((item)=>item.section==="worked"||(!item.section&&item.tone==="praise"));
  const next=insights.filter((item)=>item.section==="next"||(!item.section&&item.tone==="action"));
  const attention=insights.filter((item)=>item.section==="attention"||(!item.section&&item.tone==="note"));
  return <section className={className} aria-labelledby="preserve-improve-title">
    <h2 id="preserve-improve-title" className="text-xl font-black">שימור ושיפור</h2>
    <div className="mt-3 grid gap-3 lg:grid-cols-3">
      <ReportGroup title="מה עבד" items={worked} className="border-[#16A34A]/25 bg-[#ECFDF3]" titleClassName="text-[#15803D]" empty="השלמת האימון והנתונים שנרשמו הם הבסיס להתקדמות הבאה."/>
      <ReportGroup title="באימון הבא" items={next} className="border-[#2563EB]/20 bg-[#EFF6FF]" titleClassName="text-[#1D4ED8]" empty="ממשיכים באותו עומס ובאותה איכות ביצוע."/>
      <ReportGroup title="דורש תשומת לב" items={attention} className="border-[#DC2626]/20 bg-[#FEF2F2]" titleClassName="text-[#DC2626]" empty="לא זוהתה כרגע נקודה שדורשת תשומת לב."/>
    </div>
  </section>;
}

function ReportGroup({title,items,className,titleClassName,empty}:{title:string;items:readonly WorkoutInsight[];className:string;titleClassName:string;empty:string}){return <article className={`rounded-2xl border p-4 ${className}`}><h3 className={`font-black ${titleClassName}`}>{title}</h3><ul className="mt-2 space-y-2 text-sm">{items.length?items.map(item=><li key={`${title}-${item.title}`}><strong>{item.title}</strong><span className="block text-[#415247]">{item.detail}</span></li>):<li>{empty}</li>}</ul></article>}
