"use client";

import { useActionState, useState } from "react";
import { Undo2 } from "lucide-react";
import { withdrawCheckIn, type SaveState } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };

/**
 * "That was wrong — let me do it again."
 *
 * Behind a confirmation, because it throws away photographs the client took and
 * a week of answers. The first tap says what is about to happen; the second does
 * it. The database decides whether it is allowed at all, and refuses once the
 * coach has replied.
 */
export default function WithdrawCheckIn({ checkInId }: { checkInId: string }) {
  const [state, action] = useActionState(withdrawCheckIn, initial);
  const [confirming, setConfirming] = useState(false);

  if (!confirming)
    return (
      <>
        <button type="button" onClick={() => setConfirming(true)} className="premium-secondary-button">
          <Undo2 aria-hidden="true" size={16} />ביטול ושליחה מחדש
        </button>
        {state.message && !state.ok && (
          <p role="alert" className="mt-3 w-full rounded-2xl bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">{state.message}</p>
        )}
      </>
    );

  return (
    <form action={action} className="w-full">
      <input type="hidden" name="checkInId" value={checkInId} />
      <p className="mb-3 text-sm text-[#5B5F5B]">
        הצ׳ק־אין יימחק על כל התשובות והתמונות שבו, ותוכל לשלוח אחד חדש. אי אפשר לשחזר.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <SubmitButton idle="כן, לבטל" pending="מבטלים…" className="chip border-[#DC2626] text-[#DC2626]" />
        <button type="button" onClick={() => setConfirming(false)} className="chip">השארה</button>
      </div>
    </form>
  );
}
