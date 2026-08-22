"use client";

import { useState } from "react";
import { Check, PencilLine, Plus, Undo2, X } from "lucide-react";
import AteSomethingElse, { type PickableFood } from "@/components/client/AteSomethingElse";
import { setMealStatus } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

// A meal is unmarked, eaten, eaten-as-something-else, or not eaten. Each state is
// one tap from the others and every mark is reversible.
//
// The third state is the one that was missing. "Eaten" and "not eaten" were the
// only answers, so a client who ate something off-plan had to pick between two
// false ones - and picked "not eaten", because they had not eaten the planned
// meal. The coach then read a skipped meal, and so did the adherence figures.
//
// Only "not eaten" is red. Green stays reserved for the positive state, so the
// two are never ambiguous at a glance.
export default function MealStatusControl({
  mealId,
  date,
  status,
  statusNote,
  completed,
  blocked,
  // Passed straight through to the sheet, which is the only thing here that
  // needs it.
  foods = [],
}: {
  mealId: string;
  date: string;
  status: "eaten" | "not_eaten" | "other" | null;
  statusNote?: string | null;
  completed: boolean;
  blocked: boolean;
  foods?: readonly PickableFood[];
}) {
  const [substituting, setSubstituting] = useState(false);
  const eaten = status === "eaten" || completed;

  if (status === "not_eaten") {
    return (
      <div className="flex items-center gap-2">
        <span className="pill pill--red">לא נאכל</span>
        <Action mealId={mealId} date={date} status="none" label="ביטול הסימון" icon={<Undo2 aria-hidden="true" size={15} />} className="chip" />
      </div>
    );
  }

  if (status === "other") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="pill">נאכל משהו אחר</span>
        {statusNote && <span className="text-xs text-[#5B5F5B]">{statusNote}</span>}
        {/* A meal is rarely one thing.
            
            Marking "אכלתי משהו אחר" once closed the door: the row showed what
            had been logged and offered nothing but undoing it, so a client who
            ate a sandwich and a yoghurt could record the sandwich, and then had
            to delete it to record the yoghurt. Same sheet, same scanner, still
            open. */}
        <button type="button" onClick={() => setSubstituting(true)} className="chip">
          <Plus aria-hidden="true" size={15} />
          הוספת פריט
        </button>
        <Action mealId={mealId} date={date} status="none" label="ביטול הסימון" icon={<Undo2 aria-hidden="true" size={15} />} className="chip" />
        <AteSomethingElse mealId={mealId} date={date} foods={foods} open={substituting} onClose={() => setSubstituting(false)} />
      </div>
    );
  }

  if (eaten) {
    return (
      <div className="flex items-center gap-2">
        <span className="pill pill--green">נאכל</span>
        <Action mealId={mealId} date={date} status="none" label="ביטול השלמה" icon={<Undo2 aria-hidden="true" size={15} />} className="chip" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {blocked ? (
        // The database refuses "eaten" until every group has a choice, so the
        // screen says so rather than offering a button that would be refused.
        <span className="pill">בחרו חלופה בכל קבוצה</span>
      ) : (
        <Action
          mealId={mealId}
          date={date}
          status="eaten"
          label="סימון הארוחה כנאכלה"
          icon={<Check aria-hidden="true" size={16} />}
          className="premium-primary-button"
        />
      )}
      {/* Neither of these ever depends on choosing an alternative first. */}
      <button type="button" onClick={() => setSubstituting(true)} className="chip">
        <PencilLine aria-hidden="true" size={15} />
        אכלתי משהו אחר
      </button>
      <Action
        mealId={mealId}
        date={date}
        status="not_eaten"
        label="לא נאכל"
        icon={<X aria-hidden="true" size={16} />}
        className="chip border-[#DC2626] text-[#DC2626]"
      />

      <AteSomethingElse mealId={mealId} date={date} foods={foods} open={substituting} onClose={() => setSubstituting(false)} />
    </div>
  );
}

function Action({
  mealId,
  date,
  status,
  label,
  icon,
  className,
}: {
  mealId: string;
  date: string;
  status: "eaten" | "not_eaten" | "none";
  label: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <form action={setMealStatus}>
      <input type="hidden" name="id" value={mealId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="status" value={status} />
      {/* The status only - never which meal or what was in it. */}
      <SubmitButton idle={label} pending="שומרים…" className={className} icon={icon} event="meal_marked" eventProperties={{ status }} />
    </form>
  );
}
