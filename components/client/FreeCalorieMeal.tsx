"use client";

import { useState } from "react";
import { Barcode, Camera, Database, PencilLine, UtensilsCrossed } from "lucide-react";
import AteSomethingElse, { type PickableFood, type SavedMealChoice } from "@/components/client/AteSomethingElse";
import { displayCalories } from "@/lib/nutrition/display";

type FoodLogTab = "text" | "food" | "scan" | "photo" | "saved";

/**
 * The free-calorie window, with a way to fill it.
 *
 * It used to be a sentence: "choose anything, as long as the total stays inside
 * X calories." True, and useless - there was nowhere to say what was chosen, so
 * the frame could not be tracked against and the day's total counted the whole
 * allowance whether or not any of it was eaten.
 *
 * The same three ways as everywhere else. A scanned item carries real figures
 * and moves the number; a sentence or a photograph does not, and says so.
 */
export default function FreeCalorieMeal({
  mealId,
  date,
  frame,
  logged,
  unmeasured,
  foods,
  savedMeals,
}: {
  mealId: string;
  date: string;
  frame: number;
  /** Calories already recorded against this window. */
  logged: number;
  /** Entries recorded against it that carry no figures. */
  unmeasured: number;
  /** Approved catalogue foods available through the database picker. */
  foods: readonly PickableFood[];
  savedMeals: readonly SavedMealChoice[];
}) {
  const [adding, setAdding] = useState<FoodLogTab | null>(null);
  const left = Math.round(frame - logged);

  return (
    <div className="mt-4 rounded-xl border border-[#16A34A]/20 p-4">
      <p className="text-sm text-[#16A34A]">
        אפשר לבחור כל מזון, כל עוד הסך נשאר במסגרת {frame} קלוריות.
      </p>
      <p className={`mt-2 text-sm font-bold ${left < 0 ? "text-[#DC2626]" : ""}`}>
        {logged > 0
          ? left >= 0
            ? `נרשמו ${displayCalories(logged)} קל׳ · נותרו ${displayCalories(left)}`
            : `נרשמו ${displayCalories(logged)} קל׳ · חריגה של ${displayCalories(Math.abs(left))}`
          : "עדיין לא נרשם כלום במסגרת הזו."}
      </p>
      {unmeasured > 0 && (
        <p className="mt-1 text-xs text-[#5B5F5B]">
          {unmeasured} {unmeasured === 1 ? "פריט נרשם" : "פריטים נרשמו"} בלי ערכים — תיאור או תמונה אינם נספרים.
        </p>
      )}

      <h3 className="mt-4 text-base font-black">מה אכלת במסגרת הזו?</h3>
      <div className="chip-row mt-3">
        <button type="button" onClick={() => setAdding("text")} className="chip pill--green">
          <PencilLine aria-hidden="true" size={15} />תיאור
        </button>
        <button type="button" onClick={() => setAdding("scan")} className="chip">
          <Barcode aria-hidden="true" size={15} />ברקוד
        </button>
        {foods.length ? (
          <button type="button" onClick={() => setAdding("food")} className="chip">
            <Database aria-hidden="true" size={15} />מהמאגר
          </button>
        ) : null}
        <button type="button" onClick={() => setAdding("saved")} className="chip">
          <UtensilsCrossed aria-hidden="true" size={15} />מהארוחות שלי
        </button>
        <button type="button" onClick={() => setAdding("photo")} className="chip">
          <Camera aria-hidden="true" size={15} />צילום
        </button>
      </div>

      <AteSomethingElse
        mealId={mealId}
        date={date}
        foods={foods}
        savedMeals={savedMeals}
        open={adding !== null}
        onClose={() => setAdding(null)}
        initialTab={adding ?? "text"}
        title="מה אכלת במסגרת הזו?"
        unmeasuredNote="התיאור או התמונה יישלחו לחישוב אוטומטי. אם לא ניתן לזהות בוודאות, הפריט יישמר לעיון המאמן בלי להוסיף ערכים שגויים."
      />
    </div>
  );
}
