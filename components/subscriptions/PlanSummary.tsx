import type { PlanCode } from "@/lib/subscriptions/access";
import { startDigitalCheckout } from "@/app/actions/subscriptions";

const labels: Record<PlanCode, string> = {
  digital: "START Digital",
  coach: "START Coach",
  vip: "START VIP",
};

export default function PlanSummary({ plan, source = null, checkoutAvailable = false, manualCheckout = false }: { plan: PlanCode | null; source?: string | null; checkoutAvailable?: boolean; manualCheckout?: boolean }) {
  const label = plan ? labels[plan] : "ללא מנוי פעיל";
  return (
    <section className="rounded-3xl border border-[#DDE7E1] bg-white p-5" aria-labelledby="current-plan-title">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#147A50]">המסלול שלי</p>
      <h2 id="current-plan-title" className="mt-1 text-xl font-extrabold text-[#10271D]">{label}</h2>
      <p className="mt-2 text-sm leading-6 text-[#5B6F65]">
        {plan === "digital" && "תוכנית עצמאית עם אימונים, תזונה והתאמות דיגיטליות."}
        {plan === "coach" && "התוכנית הדיגיטלית יחד עם בדיקה ותקשורת עם המאמן."}
        {plan === "vip" && "ליווי אישי מורחב עם עדיפות ומכסות שירות מוגדלות."}
        {!plan && "לא נמצאה זכאות פעילה. המידע וההיסטוריה שלך נשמרים."}
      </p>
      {(plan === null || (plan === "digital" && source === "legacy")) && (
        checkoutAvailable ? <form action={startDigitalCheckout} className="mt-4">
          <button className="premium-primary-button w-full">בחירת מסלול ותשלום מאובטח</button>
          <p className="mt-2 text-center text-xs text-[#6B756F]">{manualCheckout ? "בדף Cardcom אפשר לבחור את המסלול. ההפעלה מתבצעת לאחר אימות העסקה." : "החיוב מתבצע בדף סליקה מאובטח. אפשר לבטל בהתאם לתנאי המנוי."}</p>
        </form> : <p className="mt-4 rounded-2xl bg-[#F5F7F6] px-4 py-3 text-sm font-bold text-[#506158]">הרכישה העצמאית תהיה זמינה מיד לאחר חיבור דף הסליקה.</p>
      )}
    </section>
  );
}
