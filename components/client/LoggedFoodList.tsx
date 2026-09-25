import { Barcode, Camera, PencilLine, Trash2 } from "lucide-react";
import { deleteClientFoodLog, updateClientFoodLog } from "@/app/actions/food-log";
import type { LoggedFood } from "@/lib/nutrition/food-log";
import { displayCalories } from "@/lib/nutrition/display";
import { unitLabel } from "@/lib/nutrition/meal-alternatives";

/* eslint-disable @next/next/no-img-element -- signed Supabase storage URLs, short-lived and not optimisable. */

const ICONS = {
  text: <PencilLine aria-hidden="true" size={14} />,
  scan: <Barcode aria-hidden="true" size={14} />,
  photo: <Camera aria-hidden="true" size={14} />,
} as const;

/**
 * What the client recorded eating instead, under the meal it replaced.
 *
 * A scanned entry shows its figures because it has real ones. A sentence or a
 * photograph shows that it has none, in words - printing a dash under "קלוריות"
 * would read as zero, and zero is not what "we cannot know" means.
 */
export default function LoggedFoodList({
  entries,
  readOnly = false,
}: {
  entries: readonly LoggedFood[];
  /** The coach's side. This is the client's account of their own day, and the
      coach reads it - they do not edit it away. */
  readOnly?: boolean;
}) {
  if (!entries.length) return null;
  return (
    <ul className="mt-3 grid gap-2">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-2xl border border-[#E5E7E5] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
              {ICONS[entry.source]}
              <span className="truncate">{entry.name}</span>
            </span>
            {readOnly ? null : (
              <form action={deleteClientFoodLog}>
                <input type="hidden" name="id" value={entry.id} />
                <button type="submit" aria-label={`מחיקת ${entry.name}`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-[#DC2626]">
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              </form>
            )}
          </div>

          {entry.photoUrl && (
            <img src={entry.photoUrl} alt="" className="mt-2 max-h-56 w-full rounded-xl object-contain" />
          )}

          {entry.calories !== null ? (
            <p className="mt-2 text-xs text-[#5B5F5B]">
              {entry.quantity ? `${entry.quantity} ${unitLabel(entry.unit ?? "גרם", Number(entry.quantity))} · ` : ""}
              {displayCalories(entry.calories)} קל׳
              {entry.eatenAt ? ` · ${new Date(entry.eatenAt).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })}` : ""}
              {entry.protein !== null ? ` · ${entry.protein} ג׳ חלבון` : ""}
              {entry.carbs !== null ? ` · ${entry.carbs} ג׳ פחמימות` : ""}
              {entry.fat !== null ? ` · ${entry.fat} ג׳ שומן` : ""}
              {entry.nutritionEstimated ? " · הערכת AI" : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-[#5B5F5B]">לא נספר בקלוריות — אין ערכים מאושרים לתיאור או לתמונה.</p>
          )}
          {!readOnly && entry.quantity && entry.foodId ? (
            <details className="mt-3 rounded-xl bg-[#F7F8F7] p-3">
              <summary className="cursor-pointer text-sm font-bold text-[#15803D]">עריכת כמות ושעה</summary>
              <form action={updateClientFoodLog} className="mt-3 grid grid-cols-2 gap-2">
                <input type="hidden" name="id" value={entry.id}/>
                <label className="text-xs font-bold">כמות ({unitLabel(entry.unit ?? "גרם", Number(entry.quantity))})
                  <input name="quantity" required type="number" min="0.1" step="0.1" defaultValue={entry.quantity} className="nutrition-input mt-1"/>
                </label>
                <label className="text-xs font-bold">שעת אכילה
                  <input name="time" required type="time" defaultValue={entry.eatenAt ? new Date(entry.eatenAt).toLocaleTimeString("en-GB", {timeZone:"Asia/Jerusalem",hour:"2-digit",minute:"2-digit",hour12:false}) : "12:00"} className="nutrition-input mt-1"/>
                </label>
                <button className="premium-primary-button col-span-2">שמירת השינוי</button>
              </form>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
