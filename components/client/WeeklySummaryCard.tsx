import { Sparkles } from "lucide-react";
import { formatIsraelDate } from "@/lib/date-time";
import type { StoredWeeklySummary } from "@/lib/coach-intelligence/summary-repository";

// Only ever renders a summary the coach released. Drafts are filtered out by
// RLS before they reach here, so there is nothing to hide at this level.
export default function WeeklySummaryCard({ summary }: { summary?: StoredWeeklySummary }) {
  if (!summary || summary.status !== "sent") return null;
  return (
    <section className="premium-card" aria-labelledby="weekly-summary">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" size={17} className="text-[#16A34A]" />
        <p className="text-xs font-bold text-[#16A34A]">סיכום שבועי</p>
      </div>
      <h2 id="weekly-summary" className="mt-1 text-xl font-black">השבוע שהסתיים ב-{formatIsraelDate(`${summary.weekStart}T00:00:00`)}</h2>
      <div className="mt-3 grid gap-3 text-sm">
        <Block title="מה היה טוב" items={summary.wentWell} />
        <Block title="מה דורש שיפור" items={summary.needsWork} />
        <Block title="מה לעשות השבוע" items={summary.actions} />
      </div>
    </section>
  );
}

function Block({ title, items }: { title: string; items: readonly string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="font-black">{title}</h3>
      <ul className="mt-1 grid gap-1 text-[#5B5F5B]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[#16A34A]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
