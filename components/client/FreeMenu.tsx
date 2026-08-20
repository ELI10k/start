"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import SubmitButton from "@/components/forms/SubmitButton";
import { deleteFreeMenuEntry, saveFreeMenuEntry, type FreeMenuState } from "@/app/actions/free-menu";

const initial: FreeMenuState = { ok: false };

type Entry = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  eaten_at: string;
  meal_label: string;
  has_nutrition: boolean;
};

type Summary = {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  entries_count: number;
  missing_nutrition_count: number;
};

type Food = {
  id: string;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** Which meal it is, from the clock. Asking was one field for a fact the phone knows. */
function currentMeal(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }).format(now),
  );
  if (hour < 11) return "בוקר";
  if (hour < 16) return "צהריים";
  if (hour < 21) return "ערב";
  return "נשנוש";
}

function currentTime(now: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/**
 * Logging a free day, in four decisions instead of twelve.
 *
 * The form used to ask for name, catalogue food, quantity, unit, meal, time and
 * four macros, plus a note - thirteen controls to record an apple. Nobody fills
 * that in five times a day, so the logging was abandoned and the summary then
 * reported "items not included in the calculation", blaming the client for the
 * form. Meal and time now come from the clock, the macros come from the
 * catalogue, and everything else is behind "פרטים נוספים" for the rare item that
 * needs it.
 */
export default function FreeMenu({
  date,
  day,
  foods,
}: {
  date: string;
  day: { day: { calorie_target: number | null; protein_target: number | null }; entries: readonly Entry[]; summary: Summary | null };
  foods: readonly Food[];
}) {
  const [state, action] = useActionState(saveFreeMenuEntry, initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Food | null>(null);
  const [manual, setManual] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const summary = day.summary ?? { calories: 0, protein: 0, carbohydrates: 0, fat: 0, entries_count: 0, missing_nutrition_count: 0 };
  const calorieTarget = day.day.calorie_target;
  const proteinTarget = day.day.protein_target;

  // Ten is a list you scan; the whole catalogue is a list you scroll past.
  const matches = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return foods.filter((food) => food.name.includes(term)).slice(0, 10);
  }, [foods, query]);

  const now = new Date();
  const close = () => {
    setOpen(false);
    setPicked(null);
    setQuery("");
    setManual(false);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-[24px] border border-[#16A34A]/30 bg-[#FFFFFF] p-5">
        <p className="text-xs font-bold tracking-widest text-[#16A34A]">תפריט חופשי</p>
        <h2 className="mt-2 text-2xl font-black">היום מתועד בחופשיות</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="קלוריות" value={Math.round(summary.calories)} />
          <Metric label="חלבון" value={`${Math.round(summary.protein)} ג׳`} />
          <Metric label="פחמימות" value={`${Math.round(summary.carbohydrates)} ג׳`} />
          <Metric label="שומן" value={`${Math.round(summary.fat)} ג׳`} />
        </div>
        <p className="mt-4 text-sm text-[#3F433F]">
          {calorieTarget !== null
            ? summary.calories <= calorieTarget
              ? `נשארו לך ${Math.round(calorieTarget - summary.calories)} קלוריות`
              : `חרגת ב־${Math.round(summary.calories - calorieTarget)} קלוריות`
            : "לא הוגדר יעד קלורי"}
          {" · "}
          {proteinTarget !== null
            ? summary.protein >= proteinTarget
              ? "יעד החלבון הושג"
              : `חסרים לך ${Math.round(proteinTarget - summary.protein)} גרם חלבון`
            : "לא הוגדר יעד חלבון"}
        </p>
        {summary.missing_nutrition_count > 0 && (
          <p className="mt-2 text-sm">
            {summary.missing_nutrition_count} פריטים ללא ערכים תזונתיים ולכן לא נכללו בחישוב.
          </p>
        )}
      </div>

      <button type="button" onClick={() => setOpen(true)} className="premium-primary-button w-full">
        <Plus aria-hidden="true" size={18} />
        הוספת מה שאכלתי
      </button>

      <section className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
        <h2 className="text-xl font-black">פריטי היום</h2>
        {day.entries.length ? (
          <div className="mt-3 divide-y divide-[#E5E7E5]">
            {day.entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <strong>{entry.name}</strong>
                  <p className="text-[#5B5F5B]">
                    {entry.quantity} {entry.unit} ·{" "}
                    {new Date(entry.eaten_at).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {entry.meal_label}
                    {!entry.has_nutrition && " · חסר מידע תזונתי"}
                  </p>
                </div>
                <form action={deleteFreeMenuEntry}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button aria-label={`מחיקת ${entry.name}`} className="chip border-[#DC2626] text-[#DC2626]">
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[#5B5F5B]">עדיין לא הוספת פריטים.</p>
        )}
      </section>

      <BottomSheet open={open} placement="top" title={picked ? picked.name : "מה אכלת?"} onClose={close}>
        {picked ? (
          <form ref={form} action={action} className="grid gap-3">
            <input type="hidden" name="date" value={date} />
            <input type="hidden" name="requestKey" value={crypto.randomUUID()} />
            <input type="hidden" name="name" value={picked.name} />
            <input type="hidden" name="foodId" value={picked.id} />
            {/* Both come from the clock. They stay in the form because the server
                still records them - they are simply no longer questions. */}
            <input type="hidden" name="meal" value={currentMeal(now)} />
            <input type="hidden" name="time" value={currentTime(now)} />

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <label className="text-sm font-bold">
                כמות
                <input name="quantity" required type="number" min="0.1" step="0.1" inputMode="decimal" defaultValue={100} className="nutrition-input mt-1" autoFocus />
              </label>
              <label className="text-sm font-bold">
                יחידה
                <select name="unit" className="nutrition-input mt-1" defaultValue="g">
                  <option value="g">גרם</option>
                  <option value="ml">מ״ל</option>
                  <option value="portion">מנה</option>
                </select>
              </label>
            </div>

            <p className="text-xs text-[#5B5F5B]">
              נרשם כארוחת {currentMeal(now)} בשעה {currentTime(now)}.
              {picked.id ? " הערכים התזונתיים נלקחים מהמאגר." : " ללא ערכים תזונתיים - הפריט לא ייכלל בחישוב."}
            </p>

            <button type="button" onClick={() => setManual((value) => !value)} className="chip w-fit">
              <SlidersHorizontal aria-hidden="true" size={15} />
              פרטים נוספים
            </button>

            {/* Present but folded away. A manual macro entry is the exception, and
                it was costing every single entry four extra boxes. */}
            <div hidden={!manual} className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Manual name="calories" label="קלוריות" />
                <Manual name="protein" label="חלבון" />
                <Manual name="carbs" label="פחמימות" />
                <Manual name="fat" label="שומן" />
              </div>
              <label className="text-sm font-bold">
                הערה
                <textarea name="notes" className="nutrition-input mt-1" />
              </label>
            </div>

            {state.message && (
              <p role={state.ok ? "status" : "alert"} className={`rounded-2xl p-3 text-sm ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>
                {state.message}
              </p>
            )}

            <div className="sheet__actions">
              <SubmitButton idle="הוספה" pending="שומרים…" className="premium-primary-button w-full" />
              <button type="button" onClick={() => setPicked(null)} className="premium-secondary-button">מאכל אחר</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-3">
            <div className="food-picker__search">
              <label className="sr-only" htmlFor="free-menu-search">חיפוש מאכל</label>
              <Search aria-hidden="true" size={17} />
              <input
                id="free-menu-search"
                className="nutrition-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="שם המאכל"
                autoFocus
              />
            </div>

            {matches.length > 0 && (
              <ul className="grid gap-1">
                {matches.map((food) => (
                  <li key={food.id}>
                    <button type="button" onClick={() => setPicked(food)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-[#E5E7E5] px-3 text-start">
                      <span className="font-bold">{food.name}</span>
                      <span className="text-sm text-[#5B5F5B]">{Math.round(food.calories)} קל׳ / 100</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Anything not in the catalogue can still be logged - it simply has
                no approved values, and the entry says so rather than inviting a
                guess. */}
            {query.trim() && (
              <button
                type="button"
                onClick={() => setPicked({ id: "", name: query.trim(), calories: 0, protein: null, carbs: null, fat: null })}
                className="chip w-fit"
              >
                <Plus aria-hidden="true" size={15} />
                הוספת „{query.trim()}” שלא מהמאגר
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#F7F8F7] p-3">
      <p className="text-xs text-[#5B5F5B]">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function Manual({ name, label }: { name: string; label: string }) {
  return (
    <label className="text-xs font-bold">
      {label}
      <input name={name} type="number" min="0" step="0.1" inputMode="decimal" className="nutrition-input mt-1" />
    </label>
  );
}
