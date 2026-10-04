"use client";

import { useActionState, useState } from "react";
import { updateOwnNutritionGoals, type NutritionGoalState } from "@/app/actions/account";
import { GOAL_LABELS, NUTRITION_GOALS, type NutritionGoal } from "@/lib/nutrition/energy";
import { calculateMacroTargets, PROTEIN_GRAMS_PER_KG } from "@/lib/nutrition/macro-targets";

const initial: NutritionGoalState = { status: "idle", message: "" };

export type ProfileNutritionGoalsProps = {
  goal: string | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbohydrateTarget: number | null;
  fatTarget: number | null;
  latestWeight: number | null;
  recommendations: Partial<Record<NutritionGoal, { calories: number; protein: number; carbohydrates: number; fat: number }>>;
};

export default function ProfileNutritionGoals({ goal, calorieTarget, proteinTarget, carbohydrateTarget, fatTarget, latestWeight, recommendations }: ProfileNutritionGoalsProps) {
  const [state, action, pending] = useActionState(updateOwnNutritionGoals, initial);
  const [selectedGoal, setSelectedGoal] = useState<NutritionGoal>((NUTRITION_GOALS as readonly string[]).includes(goal ?? "") ? goal as NutritionGoal : "maintain");
  const initialRecommendation = recommendations[selectedGoal];
  const [calories, setCalories] = useState(String(calorieTarget ?? initialRecommendation?.calories ?? ""));
  const [protein, setProtein] = useState(String(proteinTarget ?? initialRecommendation?.protein ?? ""));
  const [carbohydrates, setCarbohydrates] = useState(String(carbohydrateTarget ?? initialRecommendation?.carbohydrates ?? ""));
  const [fat, setFat] = useState(String(fatTarget ?? initialRecommendation?.fat ?? ""));
  const [macroMode, setMacroMode] = useState<"auto" | "manual">("auto");

  const applyAutomaticMacros = (nextCalories: string) => {
    const calculated = calculateMacroTargets(Number(latestWeight), Number(nextCalories));
    if (!calculated) return;
    setProtein(String(calculated.protein));
    setCarbohydrates(String(calculated.carbohydrates));
    setFat(String(calculated.fat));
  };

  const chooseGoal = (next: NutritionGoal) => {
    setSelectedGoal(next);
    const suggested = recommendations[next];
    if (!suggested) return;
    setCalories(String(suggested.calories));
    setProtein(String(suggested.protein));
    setCarbohydrates(String(suggested.carbohydrates));
    setFat(String(suggested.fat));
  };

  return (
    <form action={action} className="grid gap-3">
      <p className="text-sm text-[#5B5F5B]">אפשר לעבור מסלול ולעדכן את היעד באופן עצמאי. בחירת מטרה מציעה יעד מחושב, ותמיד אפשר לשנות אותו ידנית.</p>
      <label className="text-sm font-bold">מטרה
        <select name="nutritionGoal" value={selectedGoal} onChange={(event) => chooseGoal(event.target.value as NutritionGoal)} className="nutrition-input mt-2">
          {NUTRITION_GOALS.map((item) => <option key={item} value={item}>{GOAL_LABELS[item]}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold">יעד קלוריות יומי
        <input name="calorieTarget" required type="number" min="800" max="10000" value={calories} onChange={(event) => { setCalories(event.target.value); if (macroMode === "auto") applyAutomaticMacros(event.target.value); }} className="nutrition-input mt-2 text-lg font-black" />
      </label>
      {recommendations[selectedGoal] ? <p className="text-xs text-[#5B5F5B]">היעדים עודכנו אוטומטית לפי המטרה והנתונים שלך. ניתן לשנות כל מספר ידנית לפני השמירה.</p> : null}
      <fieldset className="rounded-2xl border border-[#E5E7E5] p-3">
        <legend className="px-2 text-sm font-black">חישוב אבות המזון</legend>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={macroMode === "auto"} onClick={() => { setMacroMode("auto"); applyAutomaticMacros(calories); }} className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${macroMode === "auto" ? "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]" : "border-[#E5E7E5]"}`}>חישוב אוטומטי</button>
          <button type="button" aria-pressed={macroMode === "manual"} onClick={() => setMacroMode("manual")} className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${macroMode === "manual" ? "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]" : "border-[#E5E7E5]"}`}>עריכה ידנית</button>
        </div>
        <p className="mt-2 text-xs text-[#5B5F5B]">במצב אוטומטי: חלבון לפי {PROTEIN_GRAMS_PER_KG} גרם לכל ק״ג משקל, שומן 25% מהקלוריות והיתרה פחמימה.</p>
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MacroInput label="חלבון" name="proteinTarget" value={protein} onChange={setProtein} readOnly={macroMode === "auto"} />
        <MacroInput label="פחמימה" name="carbohydrateTarget" value={carbohydrates} onChange={setCarbohydrates} readOnly={macroMode === "auto"} />
        <MacroInput label="שומן" name="fatTarget" value={fat} onChange={setFat} readOnly={macroMode === "auto"} />
      </div>
      {state.status !== "idle" ? <p role="status" className={`rounded-xl p-3 text-sm ${state.status === "saved" ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p> : null}
      <button disabled={pending} className="premium-primary-button w-full">{pending ? "שומרים…" : "שמירת המטרה והיעדים"}</button>
    </form>
  );
}

function MacroInput({ label, name, value, onChange, readOnly }: { label: string; name: string; value: string; onChange: (value: string) => void; readOnly: boolean }) {
  return <label className="text-sm font-bold">יעד {label} יומי (גרם)
    <input name={name} type="number" min="1" max="1000" value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} className={`nutrition-input mt-2 ${readOnly ? "bg-[#F7F8F7] text-[#5B5F5B]" : ""}`} />
  </label>;
}
