"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { completeClientOnboarding, type ClientOnboardingState } from "@/app/actions/onboarding";
import { GOAL_LABELS, NUTRITION_GOALS } from "@/lib/nutrition/energy";

const initialState: ClientOnboardingState = { status: "idle", message: "" };

const EXPERIENCE = {
  beginner: { months: "0", technique: "learning" },
  intermediate: { months: "12", technique: "stable" },
  advanced: { months: "24", technique: "stable" },
} as const;

export default function ClientOnboardingForm() {
  const [state, action, pending] = useActionState(completeClientOnboarding, initialState);
  const [level, setLevel] = useState<keyof typeof EXPERIENCE>("beginner");
  const experience = EXPERIENCE[level];

  return <form action={action} className="space-y-4">
    <header className="mb-6">
      <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">LIFE FIT</p>
      <h1 className="mt-2 text-3xl font-black">מתאימים לך התחלה טובה</h1>
      <p className="mt-2 text-sm text-[#5B5F5B]">כ־2 דקות. רק מידע שמשפיע על התזונה, האימון והבטיחות שלך.</p>
    </header>

    {state.status === "error" && <p role="alert" className="rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">{state.message}</p>}

    <section className="rounded-[28px] border border-[#E5E7E5] bg-white p-5">
      <SectionTitle number="1" title="כמה פרטים בסיסיים" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="גיל" name="ageYears" type="number" min="12" max="100" required inputMode="numeric" />
        <Select label="מין לצורך החישוב" name="sex" required options={[["male", "זכר"], ["female", "נקבה"]]} />
        <Field label="גובה (ס״מ)" name="height" type="number" min="120" max="230" required inputMode="numeric" />
        <Field label="משקל נוכחי (ק״ג)" name="weight" type="number" min="30" max="350" step="0.1" required inputMode="decimal" />
        <Select label="המטרה שלך" name="nutritionGoal" required options={NUTRITION_GOALS.map(goal => [goal, GOAL_LABELS[goal]])} />
        <Field label="משקל יעד (ק״ג)" name="targetWeight" type="number" min="30" max="350" step="0.1" required inputMode="decimal" />
      </div>
    </section>

    <section className="rounded-[28px] border border-[#E5E7E5] bg-white p-5">
      <SectionTitle number="2" title="איך מתאים לך להתאמן?" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="ניסיון באימונים" name="traineeLevel" required value={level} onChange={event => setLevel(event.target.value as keyof typeof EXPERIENCE)} options={[["beginner", "מתחיל/ה או חוזר/ת אחרי הפסקה"], ["intermediate", "מתאמן/ת באופן עקבי"], ["advanced", "מנוסה — לפחות שנתיים"]]} />
        <Select label="מטרת האימון" name="trainingGoal" required options={[["general", "כושר, בריאות וכוח כללי"], ["hypertrophy", "בניית שריר"], ["strength", "פיתוח כוח"]]} />
        <Select label="איפה נתאמן?" name="trainingLocation" required options={[["gym", "חדר כושר"], ["home", "בית או חוץ"]]} />
        <Select label="איזה ציוד זמין?" name="equipment" required options={[["gym", "חדר כושר מלא"], ["dumbbells_bench", "משקולות יד וספסל"], ["dumbbells", "משקולות יד"], ["trx", "TRX"], ["bodyweight_station", "משקל גוף עם מתח/מתקן"], ["bodyweight", "משקל גוף בלבד"]]} />
        <Select label="כמה אימונים בשבוע באמת אפשריים?" name="weeklyWorkouts" required options={[["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]]} />
        <Select label="כמה זמן יש לכל אימון?" name="sessionMinutes" required options={[["30", "כ־30 דקות"], ["45", "כ־45 דקות"], ["60", "כשעה"], ["75", "75 דקות ומעלה"]]} />
        <Select label="ממוצע צעדים ביום" name="dailySteps" required options={[["3000", "עד 4,000"], ["6000", "4,000–8,000"], ["10000", "8,000–12,000"], ["14000", "מעל 12,000"]]} />
      </div>
      <input type="hidden" name="experienceMonths" value={experience.months} />
      <input type="hidden" name="technique" value={experience.technique} />
      <input type="hidden" name="trainingFocus" value="balanced" />
      <input type="hidden" name="trainingSplit" value="auto" />
      <input type="hidden" name="bodyweightCapacity" value="regression" />
      <input type="hidden" name="autoAssignProgrammes" value="on" />
    </section>

    <section className="rounded-[28px] border border-[#E5E7E5] bg-white p-5">
      <SectionTitle number="3" title="תזונה ביום־יום" />
      <p className="mt-2 text-xs text-[#5B5F5B]">התשובות עוזרות להתאים תפריט שנוח לחיות איתו. אם אין מגבלה או העדפה, בוחרים או כותבים „אין”.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Select label="סוג תזונה" name="dietType" required options={[["mediterranean", "ים־תיכוני — אוכל/ת הכול"], ["low_carb", "דל פחמימה"], ["keto", "קטוגני (קיטו)"], ["pescatarian", "פסקטריאני/ת — צמחוני עם דגים"], ["vegetarian", "צמחוני/ת"], ["vegan", "טבעוני/ת"], ["other", "אחר"]]} />
        <Field label="אם בחרת אחר, אפשר לפרט" name="dietTypeOther" placeholder="סוג תזונה שלא הופיע ברשימה" />
        <fieldset className="rounded-2xl border border-[#E5E7E5] p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-bold">מגבלות תזונתיות — אפשר לבחור יותר מאחת</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="dietaryRestrictions" value="none" className="size-5 accent-[#16A34A]"/>אין</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="dietaryRestrictions" value="lactose_free" className="size-5 accent-[#16A34A]"/>ללא לקטוז</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="dietaryRestrictions" value="gluten_free" className="size-5 accent-[#16A34A]"/>ללא גלוטן</label>
          </div>
        </fieldset>
        <Field label="אלרגיות או רגישויות נוספות" name="allergies" required placeholder="למשל אגוזים, שומשום או סויה; אם אין, כתבו אין" />
        <Select label="כמה ארוחות נוח לך ביום?" name="mealTimes" required options={[["3", "3 ארוחות"], ["4", "4 ארוחות"], ["5", "5 ארוחות"]]} />
        <Field label="מאכלים שאוהבים וחשוב לשלב" name="foodPreferences" required placeholder="כמה דוגמאות קצרות; אם אין העדפה, כתבו אין" />
        <Field label="מאכלים שלא אוכלים" name="foodAvoidances" required placeholder="לא כולל אלרגיות; אם אין, כתבו אין" />
      </div>
    </section>

    <section className="rounded-[28px] border border-[#E5E7E5] bg-white p-5">
      <SectionTitle number="4" title="הצהרת בריאות" />
      <fieldset className="mt-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-4">
        <legend className="px-1 text-sm font-black">לפני שמפעילים את התוכנית</legend>
        <p className="text-sm leading-6 text-[#3F433F]">אין לי כאבים בחזה, אירועי עילפון או סחרחורת חריגה, מגבלה רפואית, פציעה פעילה, היריון בסיכון או הנחיה רפואית להימנע מפעילות גופנית. ידוע לי שהתוכנית אינה תחליף לייעוץ רפואי, ובכל שינוי במצבי עליי להפסיק את הפעילות ולהתייעץ עם רופא.</p>
        <label className="mt-3 flex items-start gap-3 text-sm font-bold"><input required type="radio" name="medicalReview" value="no" className="mt-1 size-5 accent-[#16A34A]"/><span>אני מאשר/ת ויכול/ה להתחיל להתאמן</span></label>
        <label className="mt-3 flex items-start gap-3 text-sm font-bold"><input required type="radio" name="medicalReview" value="yes" className="mt-1 size-5 accent-[#16A34A]"/><span>אחד מהסעיפים רלוונטי אליי או שאינני בטוח/ה</span></label>
      </fieldset>
      <label className="mt-4 block text-sm font-bold">אם אחד הסעיפים רלוונטי, מה חשוב שנדע?
        <textarea name="medicalNotes" maxLength={1000} className="nutrition-input mt-2 min-h-20" placeholder="לדוגמה: כאב ברך בעלייה במדרגות או הנחיה שקיבלת מרופא" />
      </label>
      <p className="mt-3 text-xs text-[#5B5F5B]">אם אחד הסעיפים רלוונטי, נשמור את האפיון ונמתין עם הפעלת התוכנית עד לקבלת אישור רפואי שלפיו הפעילות אינה מסכנת אותך. לאחר קבלת האישור אפשר לחזור ולעדכן את ההצהרה.</p>
    </section>

    <label className="flex gap-3 rounded-2xl p-1 text-sm">
      <input required name="terms" type="checkbox" className="mt-1 size-5 accent-[#16A34A]" />
      <span>קראתי ואני מאשר/ת את <Link href="/terms" target="_blank" className="font-bold text-[#15803D] underline underline-offset-4">תנאי השימוש</Link> ואת <Link href="/privacy" target="_blank" className="font-bold text-[#15803D] underline underline-offset-4">מדיניות הפרטיות</Link>, לרבות שמירת המידע לצורך הליווי.</span>
    </label>

    <button disabled={pending} className="min-h-14 w-full rounded-2xl bg-[#16A34A] px-6 font-black text-white disabled:cursor-wait disabled:opacity-60">{pending ? "שומרים ומתאימים…" : "סיימתי — אפשר להתחיל"}</button>
  </form>;
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-[#ECFDF3] text-sm font-black text-[#15803D]">{number}</span><h2 className="text-base font-black text-[#3F433F]">{title}</h2></div>;
}

function Field({ label, name, ...props }: { label: string; name: string; [key: string]: unknown }) {
  return <label className="block text-sm font-bold">{label}<input name={name} className="nutrition-input mt-2" {...props} /></label>;
}

function Select({ label, name, options, required, value, onChange }: { label: string; name: string; options: readonly (readonly [string, string])[]; required?: boolean; value?: string; onChange?: React.ChangeEventHandler<HTMLSelectElement> }) {
  return <label className="block text-sm font-bold">{label}<select name={name} aria-label={label} required={required} value={value} onChange={onChange} defaultValue={value === undefined ? "" : undefined} className="nutrition-input mt-2"><option value="" disabled>בחירה</option>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
