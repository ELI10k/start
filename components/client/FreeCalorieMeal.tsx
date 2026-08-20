"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AteSomethingElse from "@/components/client/AteSomethingElse";

/**
 * The free-calorie window, with a way to fill it.
 *
 * It used to be a sentence: "choose anything, as long as the total stays inside
 * X calories." True, and useless - there was nowhere to say what was chosen, so
 * the frame could not be tracked against and the day's total counted the whole
 * allowance whether or not any of it was eaten.
 *
 * The same three ways as everywhere else. A scanned item carries real figures
 * and moves the number; a sentence or a photograph does not, and says so.
 */
export default function FreeCalorieMeal({
  mealId,
  date,
  frame,
  logged,
  unmeasured,
}: {
  mealId: string;
  date: string;
  frame: number;
  /** Calories already recorded against this window. */
  logged: number;
  /** Entries recorded against it that carry no figures. */
  unmeasured: number;
}) {
  const [adding, setAdding] = useState(false);
  const left = Math.round(frame - logged);

  return (
    <div className="mt-4 rounded-xl border border-[#16A34A]/20 p-4">
      <p className="text-sm text-[#16A34A]">
        אפשר לבחור כל מזון, כל עוד הסך נשאר במסגרת {frame} קלוריות.
      </p>
      <p className="mt-2 text-sm font-bold">
        {logged > 0
          ? left >= 0
            ? `נרשמו ${Math.round(logged)} קל׳ · נותרו ${left}`
            : `נרשמו ${Math.round(logged)} קל׳ · חריגה של ${Math.abs(left)}`
          : "עדיין לא נרשם כלום במסגרת הזו."}
      </p>
      {unmeasured > 0 && (
        <p className="mt-1 text-xs text-[#5B5F5B]">
          {unmeasured} {unmeasured === 1 ? "פריט נרשם" : "פריטים נרשמו"} בלי ערכים — תיאור או תמונה אינם נספרים.
        </p>
      )}

      <button type="button" onClick={() => setAdding(true)} className="chip mt-3">
        <Plus aria-hidden="true" size={15} />הוספת מה שאכלתי
      </button>

      <AteSomethingElse mealId={mealId} date={date} open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
