"use client";
import { useActionState, useState } from "react";
import { Scale } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import { saveProgress, type SaveState } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };

// Logging a weight is the one thing a client comes to this screen to do, so it is
// a FAB and a sheet rather than a form that pushes the history below the fold.
export default function PersistedProgressForm({ today }: { today: string }) {
  const [state, action] = useActionState(saveProgress, initial);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fab" aria-label="הוספת מדידה">
        <Scale aria-hidden="true" size={18} />הוספת מדידה
      </button>

      <BottomSheet open={open} title="הוספת מדידה" onClose={() => setOpen(false)}>
        <form action={action} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="date" label="תאריך" type="date" defaultValue={today} required />
            <Field name="weight" label="משקל (ק״ג)" type="number" required />
            <Field name="navelCircumference" label="היקף טבור (ס״מ)" type="number" />
            <label className="text-sm font-bold sm:col-span-2">הערה<textarea name="notes" className="nutrition-input mt-2 min-h-20" /></label>
          </div>
          {state.message && (
            <p role={state.ok ? "status" : "alert"} className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p>
          )}
          <div className="sheet__actions">
            <SubmitButton idle="שמירת מדידה" className="premium-primary-button w-full" />
            <button type="button" onClick={() => setOpen(false)} className="premium-secondary-button">סגירה</button>
          </div>
        </form>
      </BottomSheet>
    </>
  );
}

function Field({ name, label, type, defaultValue, required = false }: { name: string; label: string; type: string; defaultValue?: string; required?: boolean }) {
  return <label className="text-sm font-bold">{label}<input name={name} className="nutrition-input mt-2" type={type} defaultValue={defaultValue} required={required} min={type === "number" ? "1" : undefined} step={type === "number" ? "0.1" : undefined} /></label>;
}
