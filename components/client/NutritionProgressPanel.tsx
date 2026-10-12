"use client";

import { useMemo, useState } from "react";
import { Beef, Flame } from "lucide-react";
import { nutritionMacroPercentages, nutritionTargetPercentages, sumNutrition, type DailyNutritionTotal, type NutritionTargets } from "@/lib/nutrition/progress";

const dayLabel = (day: string) => new Intl.DateTimeFormat("he-IL", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
const dateLabel = (day: string) => new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
const round = (value: number) => Math.round(value);

export default function NutritionProgressPanel({ days, targets }: { days: readonly DailyNutritionTotal[]; targets: NutritionTargets }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const selected = useMemo(() => days.slice(period === "week" ? -7 : -30), [days, period]);
  const reported = selected.filter((day) => day.calories > 0 || day.protein > 0 || day.carbohydrates > 0 || day.fat > 0);
  const totals = sumNutrition(selected);
  const averageCalories = reported.length ? round(totals.calories / reported.length) : 0;
  const averageMacros = {
    protein: reported.length ? totals.protein / reported.length : 0,
    carbohydrates: reported.length ? totals.carbohydrates / reported.length : 0,
    fat: reported.length ? totals.fat / reported.length : 0,
  };
  const percentages = nutritionMacroPercentages(totals);
  const targetPercentages = nutritionTargetPercentages(targets);
  const daysAtGoal = targets.calories === null ? 0 : reported.filter((day) => day.calories >= targets.calories! * .9 && day.calories <= targets.calories! * 1.1).length;
  const proteinGapGrams = targets.protein === null ? null : round(targets.protein - averageMacros.protein);

  return <div className="health-progress-view nutrition-progress-view">
    <div className="health-period-picker" role="group" aria-label="טווח הצגה">
      <button type="button" aria-pressed={period === "week"} onClick={() => setPeriod("week")}>שבוע</button>
      <button type="button" aria-pressed={period === "month"} onClick={() => setPeriod("month")}>חודש</button>
    </div>

    <section className="health-summary-card" aria-labelledby="nutrition-calories-title">
      <span className="health-summary-card__icon"><Flame aria-hidden="true" size={24}/></span>
      <p id="nutrition-calories-title">ממוצע קלוריות יומי {period === "week" ? "בשבוע" : "בחודש"}</p>
      <strong>{reported.length ? `${averageCalories.toLocaleString("he-IL")} קל׳` : "אין נתונים"}</strong>
      <small>{targets.calories ? `מתוך יעד של ${round(targets.calories).toLocaleString("he-IL")}` : "עדיין לא הוגדר יעד קלורי"}</small>
      <CaloriesChart key={period} values={selected} goal={targets.calories} monthly={period === "month"}/>
      <dl className="nutrition-inline-stats">
        <div><dt>ימים בטווח היעד</dt><dd>{targets.calories ? `${daysAtGoal} מתוך ${selected.length}` : "—"}</dd></div>
        <div><dt>קלוריות {period === "week" ? "בשבוע" : "בחודש"}</dt><dd>{round(totals.calories).toLocaleString("he-IL")}</dd></div>
      </dl>
    </section>

    <section className="nutrition-macro-card" aria-labelledby="nutrition-macros-title">
      <span className="health-summary-card__icon"><Beef aria-hidden="true" size={24}/></span>
      <h3 id="nutrition-macros-title">חלוקת אבות המזון</h3>
      <p>ממוצע יומי {period === "week" ? "בשבוע" : "בחודש"}</p>
      {reported.length ? <>
        <div className="nutrition-macro-bar" role="img" aria-label={`חלבון ${percentages.protein} אחוז, פחמימות ${percentages.carbohydrates} אחוז, שומן ${percentages.fat} אחוז`}>
          <span data-macro="protein" style={{ width: `${percentages.protein}%` }}>{percentages.protein}%</span>
          <span data-macro="carbohydrates" style={{ width: `${percentages.carbohydrates}%` }}>{percentages.carbohydrates}%</span>
          <span data-macro="fat" style={{ width: `${percentages.fat}%` }}>{percentages.fat}%</span>
        </div>
        <div className="nutrition-macro-grid">
          <Macro label="חלבון" macro="protein" percent={percentages.protein} grams={averageMacros.protein} target={targetPercentages.protein}/>
          <Macro label="פחמימות" macro="carbohydrates" percent={percentages.carbohydrates} grams={averageMacros.carbohydrates} target={targetPercentages.carbohydrates}/>
          <Macro label="שומן" macro="fat" percent={percentages.fat} grams={averageMacros.fat} target={targetPercentages.fat}/>
        </div>
      </> : <p className="nutrition-empty">עדיין לא דווחה תזונה בטווח הזה.</p>}
    </section>
    {proteinGapGrams !== null && reported.length ? <p className="health-insight">{Math.abs(proteinGapGrams) <= 3 ? "החלבון קרוב ליעד — ממשיכים כך" : proteinGapGrams > 0 ? `חסרים בממוצע ${proteinGapGrams} גרם חלבון ביום` : `ממוצע החלבון גבוה ב־${Math.abs(proteinGapGrams)} גרם מהיעד היומי`}</p> : null}
  </div>;
}

function CaloriesChart({ values, goal, monthly }: { values: readonly DailyNutritionTotal[]; goal: number | null; monthly: boolean }) {
  const max = Math.max(goal ?? 0, ...values.map((day) => day.calories), 1);
  return <div className="health-chart" data-monthly={monthly || undefined} role="img" aria-label={values.map((day) => `${monthly ? dateLabel(day.day) : dayLabel(day.day)} ${round(day.calories)} קלוריות`).join(", ")}>
    <div className="health-chart__plot" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
      {goal ? <span className="health-chart__goal" style={{ insetBlockEnd: `${Math.min(92, (goal / max) * 100)}%` }}><small>יעד</small></span> : null}
      {values.map((day, index) => {
        const excessPercent = goal && day.calories > goal ? ((day.calories - goal) / day.calories) * 100 : 0;
        const showMonthlyLabel = !monthly || index === 0 || index === values.length - 1 || index % 5 === 0;
        return <span className="health-chart__column" key={day.day}><b>{round(day.calories).toLocaleString("he-IL")}</b><i data-over-goal={excessPercent ? true : undefined} style={{ height: `${Math.max(day.calories ? 7 : 1, (day.calories / max) * 100)}%` }}>{excessPercent ? <em style={{ height: `${excessPercent}%` }}/>: null}</i><small>{showMonthlyLabel ? (monthly ? dateLabel(day.day) : dayLabel(day.day)) : ""}</small></span>;
      })}
    </div>
  </div>;
}

function Macro({ label, macro, percent, grams, target }: { label: string; macro: string; percent: number; grams: number; target: number }) {
  return <div><span className="nutrition-macro-key" data-macro={macro}/><strong>{label}</strong><b>{percent}%</b><small>{round(grams)} גר׳ בממוצע</small><small>{target ? `יעד ${target}%` : "אין יעד"}</small></div>;
}
