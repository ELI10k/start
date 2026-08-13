import { CalendarRange } from "lucide-react";
import { formatIsraelDate, formatIsraelDateTime } from "@/lib/date-time";
import { approveWeeklySummary, saveWeeklySummaryDraft, sendWeeklySummary } from "@/app/actions/weekly-summary";
import SubmitButton from "@/components/forms/SubmitButton";
import type { StoredWeeklySummary } from "@/lib/coach-intelligence/summary-repository";

const STATUS: Record<StoredWeeklySummary["status"], string> = {
  draft: "טיוטה — לא נשלח",
  sent: "נשלח ללקוח",
  insufficient_data: "אין מספיק נתונים",
};

// The coach sees the summary, whether it went out, and every previous week. A
// draft is theirs to read and release; nothing reaches the client automatically.
export default function WeeklySummaryPanel({ summaries }: { summaries: readonly StoredWeeklySummary[] }) {
  return (
    <section className="premium-card mt-6">
      <div className="flex items-center gap-2">
        <CalendarRange aria-hidden="true" size={18} className="text-[#16A34A]" />
        <h2 className="text-xl font-black">סיכומים שבועיים</h2>
      </div>
      <p className="mt-1 text-sm text-[#5B5F5B]">נכתבים בכל מוצאי שבת מנתוני השבוע בלבד. שליחה ללקוח היא החלטה שלך.</p>

      {summaries.length ? (
        <div className="mt-4 space-y-3">
          {summaries.map((summary) => (
            <article key={summary.id} className="rounded-2xl border border-[#E5E7E5] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>שבוע {formatIsraelDate(`${summary.weekStart}T00:00:00`)}</strong>
                <span className={`pill${summary.status === "sent" ? " pill--green" : ""}`}>{STATUS[summary.status]}</span>
              </div>

              {summary.status === "insufficient_data" ? (
                <p className="mt-3 text-sm text-[#5B5F5B]">לא נאספו מספיק נתונים לשבוע הזה, ולכן לא נכתב סיכום.</p>
              ) : !summary.approvedAt ? (
                <form className="mt-3 grid gap-3">
                  <input type="hidden" name="summaryId" value={summary.id} />
                  <EditableList name="wentWell" title="מה היה טוב" items={summary.wentWell} />
                  <EditableList name="needsWork" title="מה דורש שיפור" items={summary.needsWork} />
                  <EditableList name="actions" title="פעולות לשבוע הבא" items={summary.actions} />
                  <p className="text-xs text-[#5B5F5B]">כל שורה נשמרת כנקודה נפרדת. לאחר האישור הגרסה ננעלת ולא ניתן לשנותה.</p>
                  <div className="flex flex-wrap gap-2">
                    <SubmitButton formAction={saveWeeklySummaryDraft} idle="שמירת טיוטה" pending="שומרים…" className="chip" />
                    <SubmitButton formAction={approveWeeklySummary} idle="אישור ושמירת גרסה" pending="מאשרים…" className="chip chip--primary" />
                  </div>
                </form>
              ) : (
                <div className="mt-3 grid gap-3 text-sm">
                  <Block title="מה היה טוב" items={summary.wentWell} />
                  <Block title="מה דורש שיפור" items={summary.needsWork} />
                  <Block title="פעולות לשבוע הבא" items={summary.actions} />
                </div>
              )}

              <p className="mt-3 text-xs text-[#3F433F]">
                נוצר {formatIsraelDateTime(summary.generatedAt)} · מקור: {summary.provider === "rules" ? "מנוע כללים" : summary.provider}
                {summary.approvedAt ? ` · אושר ${formatIsraelDateTime(summary.approvedAt)} על ידי המאמן` : ""}
                {summary.sentAt ? ` · נשלח ${formatIsraelDateTime(summary.sentAt)}` : ""}
              </p>

              {summary.status === "draft" && summary.approvedAt && (
                <form action={sendWeeklySummary} className="mt-3">
                  <input type="hidden" name="summaryId" value={summary.id} />
                  <SubmitButton idle="שליחה ללקוח" pending="שולחים…" className="chip" />
                </form>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-[#E5E7E5] p-6 text-center text-sm text-[#5B5F5B]">עדיין לא נוצר סיכום שבועי.</p>
      )}
    </section>
  );
}

function EditableList({ name, title, items }: { name: string; title: string; items: readonly string[] }) {
  return (
    <label className="grid gap-1 text-sm font-black">
      {title}
      <textarea name={name} defaultValue={items.join("\n")} rows={Math.max(3, items.length)} maxLength={4000} className="min-h-24 rounded-xl border border-[#D7DAD7] bg-white p-3 font-normal leading-6" />
    </label>
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
