"use client";

import { useActionState } from "react";
import { CheckCheck } from "lucide-react";
import { handleAnsweredCheckIns } from "@/app/actions/product";
import type { SaveState } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };

/**
 * "Close everything I have already answered."
 *
 * Only offered while there is something for it to do, and it names the number so
 * the coach knows what they are about to close before they close it. It cannot
 * touch a check-in nobody has replied to.
 */
export default function HandleAnsweredCheckIns({ count }: { count: number }) {
  const [state, action] = useActionState(async () => handleAnsweredCheckIns(), initial);
  if (count <= 0) return null;
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <SubmitButton
        idle={`סגירת ${count} שנענו`}
        pending="סוגרים…"
        className="premium-secondary-button"
        icon={<CheckCheck aria-hidden="true" size={16} />}
      />
      {state.message && (
        <span role={state.ok ? "status" : "alert"} className={`text-sm font-bold ${state.ok ? "text-[#15803D]" : "text-[#DC2626]"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
