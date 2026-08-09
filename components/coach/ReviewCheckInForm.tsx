"use client";

import { useActionState } from "react";
import { reviewCheckIn, type SaveState } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };

export default function ReviewCheckInForm({ checkInId, clientId }: { checkInId: string; clientId: string }) {
  const [state, action] = useActionState(reviewCheckIn, initial);
  return (
    <form action={action} className="mt-4 space-y-3 rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/[.04] p-4">
      <input type="hidden" name="checkInId" value={checkInId} />
      <input type="hidden" name="clientId" value={clientId} />
      <label className="block text-sm font-bold">תגובת מאמן<textarea name="response" required maxLength={4000} className="nutrition-input mt-2 min-h-24" placeholder="כתבו משוב מעשי ללקוח" /></label>
      <div className="flex items-center gap-3"><SubmitButton idle="שמירת תגובה" pending="שומרים…" />{state.message && <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-emerald-400" : "text-sm text-red-400"}>{state.message}</p>}</div>
    </form>
  );
}
