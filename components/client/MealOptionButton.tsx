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
}: {
  selected: boolean;
  name: string;
  quantity: string;
  unit: string;
  calories: string;
}) {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      aria-pressed={selected}
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-right text-sm transition disabled:opacity-50 ${selected ? "border-[#16A34A] bg-[#16A34A]/[.07]" : "border-[#E5E7E5] hover:border-white/15"}`}
    >
      {selected ? (
        <CircleDot size={18} aria-hidden="true" className="shrink-0 text-[#16A34A]" />
      ) : (
        <Circle size={18} aria-hidden="true" className="shrink-0 text-[#3F433F]" />
      )}
      <span className={`flex-1 truncate ${selected ? "font-bold text-[#16A34A]" : "text-[#0B0B0B]"}`}>{name}</span>
      <span className="shrink-0 text-[#5B5F5B]">{quantity} {unit}</span>
      <span className="shrink-0 text-xs tabular-nums text-[#5B5F5B]">{calories} קל׳</span>
    </button>
  );
}
