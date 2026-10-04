"use client";

import { useActionState } from "react";
import { updateClientIntake, type IntakeState } from "@/app/actions/onboarding";
import { GOAL_LABELS, MISSING_LABELS, NUTRITION_GOALS, calculateEnergy, type NutritionGoal, type Sex } from "@/lib/nutrition/energy";
import { TRAINEE_LEVELS, TRAINEE_LEVEL_LABELS } from "@/lib/workouts/trainee-level";
import TrainingIntakeFields from "./TrainingIntakeFields";

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
  targetWeight: number | null;
  trainingPreferences?: Record<string, unknown>;
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
      <Field label="יעד משקל (ק״ג)" name="targetWeight" type="number" min="1" step="0.1" defaultValue={values.targetWeight ?? ""}/>
      <TrainingIntakeFields values={values.trainingPreferences}/>
      <label className="block text-sm font-bold sm:col-span-2">מגבלות רפואיות או הערות<textarea name="medicalNotes" defaultValue={String(values.trainingPreferences?.medical_notes??"")} className="nutrition-input mt-2 min-h-24"/></label>
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

    {/* Saved recommendations remain visible after a reload. */}
    {typeof values.trainingPreferences?.training_recommendation === "string" && <p className="text-sm text-[#5B5F5B]">{values.trainingPreferences.training_recommendation}</p>}

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
