import Link from "next/link";
import type { DailyCoachMessage } from "@/lib/coach-intelligence/proactive-coach";

export default function DailyCoachCard({ message }: { message: DailyCoachMessage }) {
  return <section id="daily-coach" className="premium-card mb-6 scroll-mt-24" aria-labelledby="daily-coach-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-black tracking-[.18em] text-[#16A34A]">טיפ יומי</p><h2 id="daily-coach-title" className="mt-2 text-xl font-black">{message.title}</h2><p className="mt-2 text-sm leading-6 text-[#5B5F5B]">{message.summary}</p></div>
      <span className={message.tone === "success" ? "pill pill--green" : "pill"}>{message.tone === "success" ? "בוצע" : message.tone === "missing" ? "חסר מידע" : "הפוקוס היומי"}</span>
    </div>
    <ul className="mt-4 flex flex-wrap gap-2 text-xs text-[#5B5F5B]" aria-label="הנתונים שעליהם מבוססת ההמלצה">{message.evidence.map((item) => <li key={item} className="rounded-full bg-[#F7F8F7] px-3 py-2">{item}</li>)}</ul>
    <Link href={message.href} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#16A34A] px-4 font-black text-[#FFFFFF]">{message.action}</Link>
  </section>;
}
