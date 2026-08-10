import { Check, Undo2, X } from "lucide-react";
import { setMealStatus } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

// A meal is unmarked, eaten, or not eaten. Each state is one tap away from the
// others - no dialog, no reason field - and the mark is reversible.
//
// Only "not eaten" is red. Green stays reserved for the positive state, so the
// two are never ambiguous at a glance.
export default function MealStatusControl({
  mealId,
  date,
  status,
  completed,
  blocked,
}: {
  mealId: string;
  date: string;
  status: "eaten" | "not_eaten" | null;
  completed: boolean;
  blocked: boolean;
}) {
  const eaten = status === "eaten" || completed;
  const skipped = status === "not_eaten";

  if (skipped) {
    return (
      <div className="flex items-center gap-2">
        <span className="pill pill--red">לא נאכל</span>
        <Action mealId={mealId} date={date} status="none" label="ביטול הסימון" icon={<Undo2 aria-hidden="true" size={15} />} className="chip" />
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
      {/* Skipping never depends on choosing an alternative first. */}
      <Action
        mealId={mealId}
        date={date}
        status="not_eaten"
        label="לא נאכל"
        icon={<X aria-hidden="true" size={16} />}
        className="chip border-[#DC2626] text-[#DC2626]"
      />
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
      <SubmitButton idle={label} pending="שומרים…" className={className} icon={icon} />
    </form>
  );
}
