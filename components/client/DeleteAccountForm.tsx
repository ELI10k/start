"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteOwnAccount, initialDeleteAccountState } from "@/app/actions/account";

export default function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteOwnAccount, initialDeleteAccountState);

  useEffect(() => {
    if (state.status === "deleted") window.location.replace("/login?deleted=1");
  }, [state.status]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full text-right text-[#B42318]">
        מחיקת החשבון והנתונים
      </button>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-4">
      <h3 className="font-black text-[#991B1B]">מחיקה קבועה של החשבון</h3>
      <p className="mt-2 text-sm leading-6 text-[#7F1D1D]">הפעולה מוחקת את החשבון, תוכניות הליווי, המדידות, הצ׳ק־אינים, ההודעות, התמונות, הסרטונים ונתוני הצעדים. לא ניתן לבטל אותה.</p>
      <label className="mt-4 block text-sm font-bold">
        כדי לאשר, הקלידו “מחיקה”
        <input name="confirmation" required autoComplete="off" className="nutrition-input mt-2" />
      </label>
      <label className="mt-3 flex items-start gap-3 text-sm">
        <input name="understood" type="checkbox" required className="mt-1" />
        הבנתי שהמחיקה קבועה ושלא יהיה אפשר לשחזר את המידע.
      </label>
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 rounded-xl p-3 text-sm font-bold ${state.status === "error" ? "bg-white text-[#B42318]" : "bg-[#ECFDF3] text-[#15803D]"}`}>
          {state.message}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button disabled={pending} className="min-h-11 rounded-xl bg-[#B42318] px-4 font-black text-white disabled:opacity-60">
          {pending ? "מוחקים…" : "מחיקת החשבון לצמיתות"}
        </button>
        <button type="button" disabled={pending} onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-[#D1D5DB] bg-white px-4 font-bold">
          ביטול
        </button>
      </div>
    </form>
  );
}
