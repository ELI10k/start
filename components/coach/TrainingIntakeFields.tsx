import { recommendTraining, type TrainingIntake } from "@/lib/workouts/personalization";

export default function TrainingIntakeFields({values = {}, preview}: {values?: Record<string, unknown>; preview?: TrainingIntake}) {
  const select = (label: string, name: string, options: string[][], key: string) => <label className="block text-sm font-bold">{label}<select aria-label={label} name={name} defaultValue={String(values[key] ?? "")} className="nutrition-input mt-2"><option value="">לא נבחר</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
  const recommendation = preview ? recommendTraining(preview) : null;
  return <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
    <h3 className="text-sm font-black sm:col-span-2">אפיון אימונים והתאמה אוטומטית</h3>
    {select("מיקום האימון", "trainingLocation", [["gym", "חדר כושר"], ["home", "בית / חוץ"]], "training_location")}
    {select("ציוד זמין לאימון", "equipment", [["gym", "חדר כושר מלא — משקולות ומכונות"], ["trx", "TRX ומשקל גוף"], ["bodyweight", "משקל גוף בלבד"]], "equipment")}
    {select("דגש באימון", "trainingFocus", [["balanced", "גוף מלא ומאוזן"], ["glutes", "ישבן"], ["back", "גב"]], "training_focus")}
    {select("חלוקת אימונים", "trainingSplit", [["auto", "התאמה אוטומטית"], ["FBW", "FBW — גוף מלא"], ["A-B", "A-B"], ["PPL", "Push Pull Legs"]], "training_split")}
    <label className="block text-sm font-bold">משך אימון זמין (דקות)<input aria-label="משך אימון זמין (דקות)" name="sessionMinutes" type="number" min="30" max="120" defaultValue={String(values.session_minutes ?? "")} className="nutrition-input mt-2"/></label>
    <label className="block text-sm font-bold">חודשי אימון עקבי<input name="experienceMonths" type="number" min="0" max="600" defaultValue={String(values.experience_months ?? "")} className="nutrition-input mt-2"/></label>
    {select("שליטה בטכניקה", "technique", [["learning", "עדיין לומד/ת את תנועות הבסיס"], ["stable", "טכניקה יציבה ובחירת עומס עצמאית"]], "technique")}
    {select("פציעה, כאב, היריון או מגבלה רפואית", "medicalReview", [["no", "לא"], ["yes", "כן — נדרשת בדיקת מאמן"]], "medical_review")}
    <p className="text-xs text-[#5B5F5B] sm:col-span-2">מתחיל: למידת טכניקה או פחות מ־6 חודשי עקביות. בינוני: שליטה בתנועות הבסיס. מתקדם: לפחות 24 חודשי עקביות וטכניקה יציבה, לצד רמת מתאמן מתקדם. זמן וניסיון לבדם אינם מספיקים.</p>
    <label className="flex items-start gap-3 text-sm font-bold sm:col-span-2"><input type="checkbox" name="autoAssignProgrammes" defaultChecked className="mt-1 size-5 accent-[#16A34A]"/><span>התאם ושייך תוכנית אוטומטית לפי האפיון<span className="mt-1 block text-xs font-normal text-[#5B5F5B]">אם כבר קיימת תוכנית פעילה, היא תישמר והמאמן יקבל המלצה. נתונים חסרים או מגבלות רפואיות יועברו לבדיקת מאמן.</span></span></label>
    {recommendation && <p role="status" className="rounded-2xl bg-[#F7F8F7] p-3 text-sm sm:col-span-2">{recommendation.message}</p>}
  </div>;
}
