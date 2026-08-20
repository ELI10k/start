"use client";
import { Circle, CircleDot } from "lucide-react";
import { useFormStatus } from "react-dom";

// The whole row is the submit control, so choosing an option is one tap
// instead of reading a row and then hunting for a separate "בחירה" button.
export default function MealOptionButton({
  selected,
  name,
  quantity,
  unit,
  calories,
  household,
  note,
}: {
  selected: boolean;
  name: string;
  quantity: string;
  unit: string;
  calories: string;
  /** The same portion in spoons or palms, when there is an honest reading. */
  household?: string;
  /** The coach's instruction for this food. Written for the client and, until
      now, shown only to the coach who wrote it. */
  note?: string | null;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      aria-pressed={selected}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-right text-sm transition disabled:opacity-50 ${selected ? "border-[#16A34A] bg-[#16A34A]/[.07]" : "border-[#E5E7E5] hover:border-[#E5E7E5]"}`}
    >
      {selected ? (
        <CircleDot size={18} aria-hidden="true" className="shrink-0 text-[#16A34A]" />
      ) : (
        <Circle size={18} aria-hidden="true" className="shrink-0 text-[#3F433F]" />
      )}
      {/* The name and, under it, the portion in something a kitchen has. A client
          handed "200 גרם" either owns a scale or guesses, and most guess. */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate ${selected ? "font-bold text-[#16A34A]" : "text-[#0B0B0B]"}`}>{name}</span>
        {household ? <span className="text-xs text-[#5B5F5B]">{household}</span> : null}
        {/* The coach's own words, in their own colour so they do not read as
            another measurement. */}
        {note ? <span className="truncate text-xs font-bold text-[#16A34A]">{note}</span> : null}
      </span>
      <span className="shrink-0 text-[#5B5F5B]">{quantity} {unit}</span>
      <span className="shrink-0 text-xs tabular-nums text-[#5B5F5B]">{calories} קל׳</span>
    </button>
  );
}
