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
    <form action={setMealGroupAmount} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="date" value={date} />
      <label className="flex items-center gap-2 text-xs text-[#5B5F5B]">
        אכלתי
        <input
          name="quantity"
          type="number"
          min="0.1"
          step="0.1"
          defaultValue={current ?? planned}
          aria-label={`כמות שנאכלה ב${unit}`}
          className="nutrition-input w-20 py-1 text-sm"
        />
        {unit}
      </label>
      <SubmitButton idle="עדכון" pending="שומרים…" className="chip text-xs" event="portion_adjusted" />
      {changed ? (
        // Clearing it is sending an empty value, which is what the action reads
        // as "as prescribed".
        <SubmitButton
          idle="חזרה למתוכנן"
          pending="מאפסים…"
          className="chip text-xs"
          icon={<Undo2 aria-hidden="true" size={13} />}
          formAction={async (data: FormData) => {
            data.set("quantity", "");
            await setMealGroupAmount(data);
          }}
        />
      ) : (
        <button type="button" onClick={() => setOpen(false)} className="chip text-xs">ביטול</button>
      )}
    </form>
  );
}
