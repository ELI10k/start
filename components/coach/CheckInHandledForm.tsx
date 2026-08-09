"use client";

import { useActionState } from "react";
import {
  setCheckInHandled,
  type SaveState,
} from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };

export default function CheckInHandledForm({
  checkInId,
  handled,
}: {
  checkInId: string;
  handled: boolean;
}) {
  const [state, action] = useActionState(setCheckInHandled, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="checkInId" value={checkInId} />
      <input type="hidden" name="handled" value={handled ? "false" : "true"} />
      <SubmitButton
        idle={handled ? "החזרה לטיפול" : "סימון כטופל"}
        pending="שומרים…"
      />
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-xs text-[#16A34A]" : "text-xs text-[#DC2626]"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
