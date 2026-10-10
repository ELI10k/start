"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setCheckInHandled } from "@/app/actions/product";

type DashboardCheckIn = Readonly<{
  id: string;
  submitted_at: string;
  status: string;
  client: { full_name: string } | null;
}>;

export default function DashboardCheckInActivity({ items }: { items: readonly DashboardCheckIn[] }) {
  const [handled, setHandled] = useState(() => new Set<string>());
  const openItems = items.filter((item) => !handled.has(item.id));

  return <section className="mt-6 rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-black">צ׳ק־אינים אחרונים</h2>
        <p className="mt-1 text-xs text-[#5B5F5B]">לאחר שעברת על הצ׳ק־אין, סמן „טופל” והוא יוסר מהעמוד הראשי בלבד.</p>
      </div>
      <Link href="/coach/check-ins" className="text-sm font-bold text-[#16A34A]">לכל הצ׳ק־אינים</Link>
    </div>
    {openItems.length
      ? <div className="mt-4 divide-y divide-[#E5E7E5]">
          {openItems.map((item) => <article key={item.id} className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2 text-sm">
            <span>
              <strong>{item.client?.full_name ?? "לקוח"}</strong>
              <span className="mr-2 text-[#5B5F5B]">{new Date(item.submitted_at).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })}</span>
              <span className="mr-2 text-[#0B0B0B]">{item.status === "reviewed" ? "נענתה — ממתין לטיפול" : "חדש"}</span>
            </span>
            <span className="flex items-center gap-2">
              <Link href={`/coach/check-ins/review?id=${item.id}`} className="chip">צפייה</Link>
              <HandledButton checkInId={item.id} onHandled={() => setHandled((current) => new Set([...current, item.id]))}/>
            </span>
          </article>)}
        </div>
      : <p className="mt-4 rounded-xl border border-dashed border-[#E5E7E5] p-8 text-center text-[#5B5F5B]">אין צ׳ק־אינים שממתינים לטיפול.</p>}
  </section>;
}

function HandledButton({ checkInId, onHandled }: { checkInId: string; onHandled: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return <span>
    <button type="button" disabled={pending} className="chip text-[#16A34A] disabled:opacity-50" onClick={() => startTransition(async () => {
      setError("");
      const form = new FormData();
      form.set("checkInId", checkInId);
      form.set("handled", "true");
      const result = await setCheckInHandled({ ok: false }, form);
      if (result.ok) onHandled();
      else setError(result.message ?? "סטטוס הטיפול לא נשמר.");
    })}>
      {pending ? "שומר…" : "טופל"}
    </button>
    {error && <span role="alert" className="mt-1 block text-xs text-[#DC2626]">{error}</span>}
  </span>;
}
