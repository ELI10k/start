"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markNutritionHandled } from "@/app/actions/workout-reviews";

export type NutritionActivityItem = Readonly<{
  clientId: string;
  date: string;
  eaten: number;
  skipped: number;
  outsideFoods: number;
  latestAt: string;
}>;

export default function DashboardNutritionActivity({
  items,
  clientNames,
  handledKeys,
}: {
  items: readonly NutritionActivityItem[];
  clientNames: Readonly<Record<string, string>>;
  handledKeys: readonly string[];
}) {
  const [locallyHandled, setLocallyHandled] = useState<ReadonlySet<string>>(() => new Set());
  const handled = new Set([...handledKeys, ...locallyHandled]);
  const visible = items.filter((item) => !handled.has(keyOf(item.clientId, item.date)));
  return <section className="mt-6 rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
    <h2 className="text-xl font-black">פעילות תזונה אחרונה</h2>
    <p className="mt-1 text-xs text-[#5B5F5B]">סימוני ארוחות ודיווחי מזון מהשבוע האחרון של המתאמנים שלך.</p>
    {visible.length ? <div className="mt-3 divide-y divide-[#E5E7E5]">{visible.map((item) => <article key={keyOf(item.clientId, item.date)} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2 text-sm">
      <span>
        <strong>{clientNames[item.clientId] ?? "לקוח משויך"}</strong>
        <span className="mr-2 text-[#5B5F5B]">{new Date(`${item.date}T12:00:00Z`).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</span>
        <span className="mr-2 text-[#5B5F5B]">{[
          item.eaten ? `${item.eaten} נאכלו` : "",
          item.skipped ? `${item.skipped} לא נאכלו` : "",
          item.outsideFoods ? `${item.outsideFoods} דיווחי מזון` : "",
        ].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="flex items-center gap-2">
        <Link href={`/coach/clients/${item.clientId}?tab=nutrition&date=${item.date}`} className="chip">צפייה</Link>
        <NutritionHandledButton item={item} onHandled={() => setLocallyHandled((current) => new Set([...current, keyOf(item.clientId, item.date)]))}/>
      </span>
    </article>)}</div> : <p className="mt-3 text-sm text-[#5B5F5B]">אין פעילות תזונה שממתינה לטיפול.</p>}
  </section>;
}

function keyOf(clientId: string, date: string) {
  return `${clientId}:${date}`;
}

function NutritionHandledButton({ item, onHandled }: { item: NutritionActivityItem; onHandled: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <span>
    <button type="button" disabled={pending} className="chip text-[#16A34A] disabled:opacity-50" onClick={() => startTransition(async () => {
      setError("");
      const result = await markNutritionHandled(item.clientId, item.date);
      if (result.ok) onHandled();
      else setError(result.message);
    })}>{pending ? "שומר…" : "טופל"}</button>
    {error && <span role="alert" className="mt-1 block text-xs text-[#DC2626]">{error}</span>}
  </span>;
}
