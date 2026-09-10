"use client";

import { useActionState } from "react";
import { requestDigitalInvitation, type JoinState } from "@/app/join/actions";

const initial: JoinState = { status: "idle" };

export default function DigitalJoinForm({ available }: { available: boolean }) {
  const [state, action, pending] = useActionState(requestDigitalInvitation, initial);
  return <form action={action} className="mt-7 space-y-4">
    <label className="block text-sm font-bold text-[#3F433F]">שם מלא<input name="fullName" required minLength={2} maxLength={100} autoComplete="name" className="nutrition-input mt-2"/></label>
    <label className="block text-sm font-bold text-[#3F433F]">אימייל<input name="email" required type="email" maxLength={254} autoComplete="email" dir="ltr" className="nutrition-input mt-2"/></label>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`rounded-2xl p-4 text-sm font-bold ${state.status === "error" ? "bg-[#FEF2F2] text-[#B42318]" : "bg-[#ECFDF3] text-[#15803D]"}`}>{state.message}</p>}
    <button disabled={!available || pending || state.status === "sent"} className="premium-primary-button w-full">{pending ? "שולחים…" : available ? "התחלת הרשמה" : "ההרשמה תיפתח בקרוב"}</button>
  </form>;
}
