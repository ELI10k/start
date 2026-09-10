"use client";

import { useState } from "react";
import { Pencil, Undo2 } from "lucide-react";
import { setMealGroupAmount } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

/**
 * "I ate less than that."
 *
 * Appears only under a group that already has a choice, because an amount with
 * nothing chosen is an amount of nothing. The number is in the same unit the
 * row above shows - two pitas, 150 grams - so there is no conversion to do in
 * anybody's head, and the day's totals follow it immediately.
 *
 * The coach's portion is never touched. This says what happened to it.
 */
export default function PortionOverride({
  groupId,
  date,
  planned,
  unit,
  current,
}: {
  groupId: string;
  date: string;
  planned: string;
  unit: string;
  current?: number;
}) {
  const [open, setOpen] = useState(false);
  const changed = current !== undefined;

  if (!open && !changed) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="chip mt-2 w-fit text-xs">
        <Pencil aria-hidden="true" size={13} />אכלתי כמות אחרת
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <form action={setMealGroupAmount} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="date" value={date} />
        <label className="flex items-center gap-2 text-xs text-[#5B5F5B]">
          אכלתי
          <input
            name="quantity"
            type="number"
            min="0"
            // Any real portion, not a multiple of a tenth. With step="0.1" the
            // browser refuses 0.75 - three quarters of a pita - as a step
            // mismatch, and refuses it silently: the form never submits and the
            // action never runs, so the number simply does not save.
            step="any"
            defaultValue={current ?? planned}
            placeholder="0"
            aria-label={`כמות שנאכלה ב${unit}`}
            className="nutrition-input w-20 py-1 text-sm"
          />
          {unit}
        </label>
        <SubmitButton idle="עדכון" pending="שומרים…" className="chip text-xs" event="portion_adjusted" />
      </form>

      {/* Its own form, with an empty quantity - which the action reads as "back
          to what the coach wrote". It was a formAction override on a button
          inside the form above, and that quietly did nothing. */}
      {changed ? (
        <form action={setMealGroupAmount}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="quantity" value="" />
          <SubmitButton
            idle="חזרה למתוכנן"
            pending="מאפסים…"
            className="chip text-xs"
            icon={<Undo2 aria-hidden="true" size={13} />}
          />
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(false)} className="chip text-xs">ביטול</button>
      )}
    </div>
  );
}
