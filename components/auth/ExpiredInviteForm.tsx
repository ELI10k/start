"use client";

import { useActionState } from "react";
import {
  requestReplacementInvite,
  type ReplacementInviteState,
} from "@/app/actions/onboarding";

const initial: ReplacementInviteState = { status: "idle", message: "" };

export default function ExpiredInviteForm() {
  const [state, action, pending] = useActionState(
    requestReplacementInvite,
    initial,
  );
  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm font-bold">
        אימייל הלקוח
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className="nutrition-input mt-2"
        />
      </label>
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-2xl bg-[#D4AF37] px-5 font-black text-black disabled:opacity-50"
      >
        {pending ? "שולחים…" : "שליחת הזמנה חדשה"}
      </button>
      {state.message && (
        <p role="status" className="text-sm text-amber-100">
          {state.message}
        </p>
      )}
    </form>
  );
}
