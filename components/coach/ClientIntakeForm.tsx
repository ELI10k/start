"use client";

import { useActionState } from "react";
import { updateClientIntake, type IntakeState } from "@/app/actions/onboarding";
import { GOAL_LABELS, MISSING_LABELS, NUTRITION_GOALS, calculateEnergy, type NutritionGoal, type Sex } from "@/lib/nutrition/energy";
import { PROGRAMMES_BY_LEVEL, TRAINEE_LEVELS, TRAINEE_LEVEL_LABELS, isTraineeLevel } from "@/lib/workouts/trainee-level";

// The intake form runs once, when a client is created. Every client created
// before the calorie columns existed therefore has none of them, and the builder
// can only keep naming what is missing. This is where a coach fills them in.
//
// It shows the calculation as it stands, so the effect of a correction is visible
// on the same screen rather than only after opening the menu builder.

export type IntakeValues = Readonly<{
  ageYears: number | null;
  sex: Sex | null;
  height: number | null;
  dailySteps: number | null;
  weeklyWorkouts: number | null;
  nutritionGoal: string | null;
  traineeLevel: string | null;
  latestWeight: number | null;
}>;

const initialState: IntakeState = { status: "idle", message: "" };

export default function ClientIntakeForm({ clientId, values }: { clientId: string; values: IntakeValues }) {
  const [state, action, pending] = useActionState(updateClientIntake, initialState);

  // The same pure function the builder uses. Nothing is recomputed here.
  const energy = calculateEnergy({
    ageYears: values.ageYears ?? undefined,
    weightKg: values.latestWeight ?? undefined,
    heightCm: values.height ?? undefined,
    sex: values.sex ?? undefined,
    weeklyWorkouts: values.weeklyWorkouts ?? undefined,
    dailySteps: values.dailySteps ?? undefined,
    goal: (values.nutritionGoal as NutritionGoal | null) ?? undefined,
  });

  const level = isTraineeLevel(values.traineeLevel) ? values.traineeLevel : null;

  return <form action={action} className="grid gap-4">
    <input type="hidden" name="clientId" value={clientId}/>

    {state.status !== "idle" && <p role="status" className={`rounded-2xl border p-3 text-sm ${state.status === "saved" ? "border-[#16A34A]/30 bg-[#ECFDF3] text-[#15803D]" : "border-[#DC2626]/30 bg-[#FEF2F2] text-[#DC2626]"}`}>{state.message}</p>}

    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="גיל" name="ageYears" type="number" min="12" max="100" defaultValue={values.ageYears ?? ""}/>
      <Select label="מין" name="sex" defaultValue={values.sex ?? ""} options={[["male","זכר"],["female","נקבה"]]}/>
      <Field label="גובה (ס״מ)" name="height" type="number" defaultValue={values.height ?? ""}/>
      <Field label="ממוצע צעדים יומי" name="dailySteps" type="number" min="0" max="60000" step="100" defaultValue={values.dailySteps ?? ""}/>
      <Field label="אימונים בשבוע" name="weeklyWorkouts" type="number" min="1" max="14" defaultValue={values.weeklyWorkouts ?? ""}/>
      <Select label="מטרה" name="nutritionGoal" defaultValue={values.nutritionGoal ?? ""} options={NUTRITION_GOALS.map((goal) => [goal, GOAL_LABELS[goal]])}/>
      <Select label="רמת מתאמן" name="traineeLevel" defaultValue={values.traineeLevel ?? ""} options={TRAINEE_LEVELS.map((item) => [item, TRAINEE_LEVEL_LABELS[item]])}/>
    </div>

    {/* The weight is not editable here: it comes from the client's own weigh-ins
        and changing it from a coach screen would put a number in the progress
        history that nobody actually stood on a scale for. */}
    <p className="text-xs text-[#5B5F5B]">{values.latestWeight ? `משקל אחרון מהמדידות: ${values.latestWeight} ק״ג` : "אין עדיין שקילה, ולכן אין משקל לחישוב. המשקל מגיע ממדידות הלקוח ולא נערך כאן."}</p>

    <div className="rounded-2xl border border-dashed border-[#E5E7E5] bg-[#F7F8F7] p-3">
      {energy.ok
        ? <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><dt className="text-[#5B5F5B]">BMR</dt><dd className="mt-0.5 font-black">{energy.bmr} קל׳</dd></div>
            <div><dt className="text-[#5B5F5B]">מקדם פעילות</dt><dd className="mt-0.5 font-black">×{energy.activityFactor}</dd></div>
            <div><dt className="text-[#5B5F5B]">הוצאה יומית</dt><dd className="mt-0.5 font-black">{energy.tdee} קל׳</dd></div>
            <div><dt className="text-[#5B5F5B]">יעד לפי המטרה</dt><dd className="mt-0.5 font-black text-[#16A34A]">{energy.calorieTarget} קל׳</dd></div>
          </dl>
        : <p className="text-xs text-[#5B5F5B]">עדיין לא ניתן לחשב יעד קלורי. חסר: {energy.missing.map((field) => MISSING_LABELS[field]).join(", ")}.</p>}
    </div>

    {/* A recommendation, and labelled as one. Nothing here assigns a programme:
        which programmes a level should start with is settled, but whether the
        system assigns them or the coach does is not. */}
    {level && <div className="rounded-2xl border border-[#E5E7E5] p-3">
      <p className="text-xs font-bold text-[#3F433F]">תוכניות מומלצות לרמת {TRAINEE_LEVEL_LABELS[level]}</p>
      <ul className="mt-2 grid gap-1 text-xs text-[#5B5F5B]">
        {PROGRAMMES_BY_LEVEL[level].map((name) => <li key={name} className="flex gap-2"><span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#16A34A]"/><span>{name}</span></li>)}
      </ul>
      <p className="mt-2 text-[11px] text-[#5B5F5B]">המלצה בלבד. שיוך תוכנית נעשה ממסך האימונים.</p>
    </div>}

    <button disabled={pending} className="premium-primary-button w-full">{pending ? "שומרים…" : "שמירת נתוני הקליטה"}</button>
  </form>;
}

function Field({ label, name, ...props }: { label: string; name: string; [key: string]: unknown }) {
  return <label className="block text-sm font-bold">{label}<input name={name} className="nutrition-input mt-2" {...props}/></label>;
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: readonly (readonly [string, string])[]; defaultValue: string }) {
  return <label className="block text-sm font-bold">{label}
    {/* Its own aria-label: a select inside a label otherwise announces as the
        label text followed by every option. */}
    <select name={name} aria-label={label} className="nutrition-input mt-2" defaultValue={defaultValue}>
      <option value="">לא נבחר</option>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>
  </label>;
}
