"use client";

import { useActionState } from "react";
import { setTestPassword, type SetTestPasswordState } from "./actions";

const initial: SetTestPasswordState = {};

export default function SetTestPasswordForm() {
  const [state, action, pending] = useActionState(setTestPassword, initial);
  return <form action={action} className="mt-7 space-y-4">
    <label className="block text-sm font-bold">סיסמה חדשה
      <input name="password" type="password" required minLength={12} autoComplete="new-password" className="nutrition-input mt-2" />
    </label>
    <label className="block text-sm font-bold">אימות הסיסמה
      <input name="confirmation" type="password" required minLength={12} autoComplete="new-password" className="nutrition-input mt-2" />
    </label>
    {state.error ? <p role="alert" className="rounded-2xl bg-[#FEF2F2] p-4 text-sm font-bold text-[#DC2626]">{state.error}</p> : null}
    <button disabled={pending} className="premium-primary-button w-full">{pending ? "שומרים…" : "שמירת הסיסמה וכניסה"}</button>
  </form>;
}
