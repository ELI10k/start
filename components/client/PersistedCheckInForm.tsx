"use client";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { saveCheckIn, type SaveState } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";
import CheckInPhotoInputs from "@/components/client/CheckInPhotoInputs";

const initial: SaveState = { ok: false };
const ratings = [
  { name: "adherence", label: "התמדה השבוע" },
  { name: "hunger", label: "רעב" },
  { name: "energy", label: "אנרגיה" },
  { name: "sleep", label: "איכות שינה" },
  { name: "mood", label: "מצב רוח" },
];

// The check-in reads as six steps rather than one long form. Every field stays in
// the document - the server action receives the whole form in one submit, and the
// suite asserts each field is reachable - so the steps are marked complete live
// instead of hiding the ones you are not on.
export default function PersistedCheckInForm({ photosRequired = false }: { photosRequired?: boolean }) {
  const [state, action] = useActionState(saveCheckIn, initial);
  const form = useRef<HTMLFormElement>(null);
  const [done, setDone] = useState<readonly boolean[]>([false, false, false, false, false, false]);

  const recompute = () => {
    const element = form.current;
    if (!element) return;
    const data = new FormData(element);
    const filled = (name: string) => String(data.get(name) ?? "").trim() !== "";
    const hasPhoto = (name: string) => {
      const value = data.get(name);
      return value instanceof File && value.size > 0;
    };
    setDone([
      filled("weight"),
      filled("navelCircumference"),
      filled("workoutsCompleted") && filled("mealPlanDays"),
      ratings.every((item) => filled(item.name)),
      filled("notes"),
      ["photo_front", "photo_side", "photo_back"].every(hasPhoto),
    ]);
  };

  const completed = done.filter(Boolean).length;

  return (
    <form ref={form} action={action} onChange={recompute}>
      {/* How far through you are, before the first field. */}
      <div className="step-progress" role="img" aria-label={`${completed} מתוך ${done.length} שלבים הושלמו`}>
        {done.map((value, index) => <span key={index} className="step-progress__dot" data-done={value || undefined} />)}
      </div>
      <p className="step-caption">{completed} מתוך {done.length} שלבים הושלמו</p>

      <div className="mt-4">
        <Step number={1} title="משקל" done={done[0]}>
          <Field name="weight" label="משקל (ק״ג)" required />
        </Step>

        <Step number={2} title="מדידה" done={done[1]}>
          <Field name="navelCircumference" label="היקף טבור (ס״מ)" required />
        </Step>

        <Step number={3} title="עמידה בתוכנית" done={done[2]}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="workoutsCompleted" label="כמה אימונים בוצעו" integer />
            <Field name="mealPlanDays" label="כמה ימים עמדת בתפריט" integer max="7" />
          </div>
        </Step>

        <Step number={4} title="דירוגים" done={done[3]} hint="1 עד 10">
          <div className="grid gap-4">
            {ratings.map((item) => (
              <fieldset key={item.name}>
                <legend className="mb-2 text-sm font-bold">{item.label}</legend>
                <div className="rating-scale" dir="ltr">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <label key={value}>
                      <input className="sr-only" type="radio" name={item.name} value={value} required />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </Step>

        <Step number={5} title="הערות" done={done[4]} hint="רשות">
          <label className="block text-sm font-bold">הערות<textarea name="notes" className="nutrition-input mt-2 min-h-28" /></label>
        </Step>

        <Step number={6} title="תמונות" done={done[5]} hint={photosRequired ? "חובה השבוע" : "רשות"}>
          <CheckInPhotoInputs required={photosRequired} />
        </Step>
      </div>

      {/* Sending a check-in and hearing nothing back reads as "it did not go".
          Success gets its own panel, not a line of small print. */}
      {state.ok
        ? <p role="status" className="mt-5 rounded-2xl border border-[#16A34A]/30 bg-[#ECFDF3] p-4 text-center text-base font-black text-[#15803D]">הצ׳ק אין נשלח למאמן</p>
        : state.message
          ? <p role="alert" className="mt-4 rounded-2xl bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">{state.message}</p>
          : null}

      {/* Submit stays under the thumb: the form is six steps long and the button
          used to be wherever the last one happened to end. */}
      <div className="session-actions session-actions--stack mt-5">
        <SubmitButton idle="שליחת צ׳ק־אין" pending="שולחים…" event="check_in_submitted" />
      </div>
    </form>
  );
}

function Step({ number, title, done, hint, children }: { number: number; title: string; done: boolean; hint?: string; children: ReactNode }) {
  return (
    // No aria-label here: the heading already names the step, and a second
    // accessible name would make "weight" resolve to two elements.
    <section className="step premium-card" data-done={done || undefined}>
      <div className="step__head">
        <span className="step__number" aria-hidden="true">{number}</span>
        <h2 className="step__title">{title}</h2>
        {hint && <span className="step__hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

// A count starts at zero and has no fractions; a weight does not start at zero.
// The two used to share min="0.1", and with step="1" that made every whole number
// invalid - "3 אימונים" was rejected as "יש להזין ערך תקין".
function Field({ name, label, integer = false, max, required = false }: { name: string; label: string; integer?: boolean; max?: string; required?: boolean }) {
  return <label className="block text-sm font-bold">{label}<input className="nutrition-input mt-2" name={name} type="number" min={integer ? "0" : "0.1"} max={max} step={integer ? "1" : "0.1"} inputMode={integer ? "numeric" : "decimal"} required={required} /></label>;
}
