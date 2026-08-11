import { redirect } from "next/navigation";
import { completeClientOnboarding } from "@/app/actions/onboarding";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GOAL_LABELS, NUTRITION_GOALS } from "@/lib/nutrition/energy";
import { TRAINEE_LEVEL_LABELS, TRAINEE_LEVELS } from "@/lib/workouts/trainee-level";
import { INITIAL_NAVEL_MAX_CM, INITIAL_NAVEL_MIN_CM } from "@/lib/progress/measurements";

// The client's own intake. It asks for exactly what the coach's form asks for,
// because both write the same columns - a client who filled this in must be as
// computable as one the coach entered by hand, or the menu builder would refuse
// to work for half the roster.
export default async function Onboarding() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/coach");
  const supabase = await createSupabaseServerClient();
  const { data: relationship } = await supabase
    .from("coach_client_relationships")
    .select("coach_id")
    .eq("client_id", auth.id)
    .eq("status", "active")
    .maybeSingle();
  if (relationship) redirect("/");

  return <main className="px-4 py-8 sm:px-6"><div className="mx-auto max-w-3xl">
    <form action="/auth/logout" method="post" className="flex justify-end">
      <button className="min-h-11 text-sm text-[#5B5F5B]">התנתקות</button>
    </form>

    <form action={completeClientOnboarding}>
      <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">START</p>
      <h1 className="mt-2 text-3xl font-black">כמה פרטים לפני שמתחילים</h1>
      <p className="mt-2 text-[#5B5F5B]">המידע נשמר רק עבורך ועבור המאמן המשויך אליך.</p>

      <section className="mt-6 grid gap-4 rounded-[28px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-black text-[#3F433F]">נתונים לחישוב התזונה</h2>
          <p className="mt-1 text-xs text-[#5B5F5B]">מהם מחושבים הקלוריות והמאקרו שלך. שדה שתשאיר ריק פשוט יסומן כחסר.</p>
        </div>
        <Field label="גיל" name="ageYears" type="number" min="12" max="100" />
        <Select label="מין" name="sex" options={[["male", "זכר"], ["female", "נקבה"]]} />
        <Field label="משקל נוכחי (ק״ג)" name="weight" type="number" step="0.1" />
        <Field label="גובה (ס״מ)" name="height" type="number" />
        <Field label="היקף טבור (ס״מ)" name="navelCircumference" type="number" min={INITIAL_NAVEL_MIN_CM} max={INITIAL_NAVEL_MAX_CM} step="0.1" inputMode="decimal" />
        <Field label="יעד משקל (ק״ג)" name="targetWeight" type="number" step="0.1" />
        <Field label="ממוצע צעדים יומי" name="dailySteps" type="number" min="0" max="60000" step="100" />
        <Field label="אימונים בשבוע" name="weeklyWorkouts" type="number" min="1" max="14" />
        <Select label="מטרה" name="nutritionGoal" options={NUTRITION_GOALS.map((goal) => [goal, GOAL_LABELS[goal]])} />
        <Select label="רמת מתאמן" name="traineeLevel" options={TRAINEE_LEVELS.map((level) => [level, TRAINEE_LEVEL_LABELS[level]])} />
      </section>

      <section className="mt-4 grid gap-4 rounded-[28px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
        <h2 className="text-sm font-black text-[#3F433F] sm:col-span-2">אימון</h2>
        <Field label="סוג אימון" name="trainingType" />
        <Field label="מיקום אימונים" name="trainingLocation" />
        <Field label="ציוד זמין" name="equipment" />
        <Field label="ימים מועדפים" name="preferredDays" />
        <Field label="אלרגיות או מגבלות" name="allergies" />
        <Field label="שעות אכילה" name="mealTimes" />
        <label className="block text-sm font-bold sm:col-span-2">הערות רפואיות
          <textarea name="medicalNotes" className="nutrition-input mt-2 min-h-24" />
        </label>
      </section>

      <label className="mt-5 flex gap-3 text-sm">
        <input required name="terms" type="checkbox" />
        אני מאשר/ת את תנאי השימוש ושמירת המידע לצורך הליווי.
      </label>
      <button className="mt-6 min-h-14 w-full rounded-2xl bg-[#16A34A] px-6 font-black text-[#FFFFFF]">שמירה והמשך</button>
    </form>
  </div></main>;
}

function Field({ label, name, type = "text", ...props }: { label: string; name: string; type?: string; [key: string]: unknown }) {
  return <label className="block text-sm font-bold">{label}
    <input name={name} type={type} className="nutrition-input mt-2" {...props} />
  </label>;
}

// The select carries its own aria-label: wrapping one in a label makes its
// accessible name the label text plus every option, so a screen reader announces
// the whole list as the field's name.
function Select({ label, name, options }: { label: string; name: string; options: readonly (readonly [string, string])[] }) {
  return <label className="block text-sm font-bold">{label}
    <select name={name} aria-label={label} className="nutrition-input mt-2" defaultValue="">
      <option value="">לא נבחר</option>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>
  </label>;
}
