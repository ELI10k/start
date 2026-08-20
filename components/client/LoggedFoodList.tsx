import { Barcode, Camera, PencilLine, Trash2 } from "lucide-react";
import { deleteClientFoodLog } from "@/app/actions/food-log";
import type { LoggedFood } from "@/lib/nutrition/food-log";

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
                <button aria-label={`מחיקת ${entry.name}`} className="rounded-lg p-1 text-[#DC2626]">
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
              {entry.quantity ? `${entry.quantity} ${entry.unit ?? "גרם"} · ` : ""}
              {entry.calories} קל׳
              {entry.protein !== null ? ` · ${entry.protein} ג׳ חלבון` : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-[#5B5F5B]">לא נספר בקלוריות — אין ערכים מאושרים לתיאור או לתמונה.</p>
          )}
        </li>
      ))}
    </ul>
  );
}
