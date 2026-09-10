import Link from "next/link";
import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PlanSummary from "@/components/subscriptions/PlanSummary";
import { getBillingConfiguration } from "@/lib/billing/config";
import { getAuthContext } from "@/lib/data/product-repository";
import { getSubscriptionAccess } from "@/lib/subscriptions/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingCompletePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const supabase = await createSupabaseServerClient();
  const [access, { data: profile }, { count: programmes }] = await Promise.all([
    getSubscriptionAccess(),
    supabase.from("client_profiles").select("calorie_target,protein_target,onboarding_completed").eq("user_id", auth.id).maybeSingle(),
    supabase.from("workout_assignments").select("id", { count: "exact", head: true }).eq("client_id", auth.id).eq("status", "active"),
  ]);
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return <ClientShell>
    <div className="mx-auto max-w-2xl py-6 text-center">
      <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">התוכנית שלך מוכנה</p>
      <h1 className="mt-2 text-3xl font-black text-[#10271D]">מתחילים בצעד אחד</h1>
      <p className="mt-3 text-[#5B6F65]">היעדים ותוכניות האימון נבנו מהנתונים שמילאת. אפשר לעדכן אותם בהמשך בלי לאבד היסטוריה.</p>
      <div className="mt-6 text-right"><PlanSummary plan={access.plan} source={access.source} checkoutAvailable={Boolean(getBillingConfiguration().checkoutUrl)} manualCheckout={getBillingConfiguration().mode === "manual"}/></div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-[#5B6F65]">קלוריות</dt><dd className="mt-1 font-black">{profile.calorie_target ? Math.round(Number(profile.calorie_target)) : "—"}</dd></div>
        <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-[#5B6F65]">חלבון</dt><dd className="mt-1 font-black">{profile.protein_target ? `${Math.round(Number(profile.protein_target))} ג׳` : "—"}</dd></div>
        <div className="rounded-2xl bg-white p-4"><dt className="text-xs text-[#5B6F65]">תוכניות</dt><dd className="mt-1 font-black">{programmes ?? 0}</dd></div>
      </dl>
      <section className="mt-6 rounded-3xl border border-[#DDE7E1] bg-white p-6 text-right">
        <h2 className="text-lg font-extrabold">הפעולה הראשונה שלך</h2>
        <p className="mt-2 text-sm leading-6 text-[#5B6F65]">פתח את תוכנית האימונים ובדוק מה האימון הבא. אין צורך להשלים הכול היום.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/workouts" className="premium-primary-button">לתוכנית האימונים</Link><Link href="/" className="premium-secondary-button">למסך הבית</Link></div>
      </section>
    </div>
  </ClientShell>;
}
