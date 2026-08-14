import Link from "next/link";
import type { CoachAttentionItem } from "@/lib/coach-intelligence/proactive-coach";

export default function CoachAttentionPanel({ items }: { items: readonly CoachAttentionItem[] }) {
  return <section className="mt-8 rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5" aria-labelledby="coach-attention-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black tracking-[.18em] text-[#16A34A]">START PROACTIVE COACH</p><h2 id="coach-attention-title" className="mt-2 text-xl font-black">דורשים תשומת לב</h2><p className="mt-1 text-xs text-[#5B5F5B]">רק לקוחות עם אות מדוד בדוח האחרון. המערכת לא משנה תוכנית בעצמה.</p></div><span className="pill pill--green">{items.length} לקוחות</span></div>
    {items.length ? <div className="mt-4 grid gap-2">{items.slice(0, 8).map((item) => <Link key={item.clientId} href={`/coach/clients/${item.clientId}?tab=report`} className="flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F8F7] p-3"><span><strong className="block">{item.clientName}</strong><small className="mt-1 block text-[#5B5F5B]">{item.reason} · דוח עד {item.weekEnd}</small></span><span className={item.severity === "high" ? "rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-black text-[#B91C1C]" : "pill"}>{item.severity === "high" ? "דחוף" : "לבדיקה"}</span></Link>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-[#E5E7E5] p-7 text-center text-sm text-[#5B5F5B]">אין כרגע לקוח עם אות סיכון מבוסס נתונים.</p>}
  </section>;
}
