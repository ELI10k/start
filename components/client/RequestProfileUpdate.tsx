"use client";

import { useActionState, useState } from "react";
import { PencilLine } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import SubmitButton from "@/components/forms/SubmitButton";
import { sendMessage, type MessageState } from "@/app/actions/messages";

const initial: MessageState = { ok: false };

// "לעדכון פרטים פנו למאמן" was the whole instruction, with nothing to press.
// A weight or a height that has drifted is not a support ticket and not a chat -
// it is a small, specific request, so it gets its own tagged message.
export default function RequestProfileUpdate() {
  const [state, action] = useActionState(sendMessage, initial);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="premium-secondary-button mt-3 w-full">
        <PencilLine aria-hidden="true" size={17} />
        בקשת עדכון פרטים מהמאמן
      </button>

      <BottomSheet open={open} title="מה צריך לעדכן?" onClose={() => setOpen(false)}>
        <form action={action} className="grid gap-3">
          <input type="hidden" name="topic" value="profile_update" />
          <label className="text-sm font-bold">
            הבקשה
            <textarea
              name="body"
              required
              maxLength={4000}
              rows={4}
              className="nutrition-input mt-2"
              placeholder="לדוגמה: המשקל שלי היום 78 ק״ג, ואני מתאמן 4 פעמים בשבוע ולא 3."
            />
          </label>
          <p className="text-xs text-[#5B5F5B]">
            הבקשה נשלחת למאמן עם התראה. היעדים מתעדכנים אחרי שהוא מאשר אותם.
          </p>
          {state.message && (
            <p role={state.ok ? "status" : "alert"} className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
              {state.message}
            </p>
          )}
          <div className="sheet__actions">
            <SubmitButton idle="שליחת הבקשה" pending="שולחים…" className="premium-primary-button w-full" />
            <button type="button" onClick={() => setOpen(false)} className="premium-secondary-button">סגירה</button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
}
