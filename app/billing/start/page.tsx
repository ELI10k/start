import { redirect } from "next/navigation";
import { startDigitalCheckout } from "@/app/actions/subscriptions";
import { getAuthContext } from "@/lib/data/product-repository";
import { getSubscriptionAccess } from "@/lib/subscriptions/server";
import { getBillingConfiguration } from "@/lib/billing/config";

export default async function BillingStartPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/billing/start");
  if (auth.role !== "client") redirect("/unauthorized");
  const access = await getSubscriptionAccess();
  if (access.plan) redirect("/");
  const billing = getBillingConfiguration();
  const available = Boolean(billing.checkoutUrl);
  return <main className="auth-screen text-[#0B0B0B]"><section className="auth-card">
    <p className="auth-card__mark">START DIGITAL</p><h1>שלב אחרון לפני שמתחילים</h1>
    <p className="auth-card__lead">בדף המאובטח אפשר לבחור START Digital, Coach או VIP.</p>
    {available ? <form action={startDigitalCheckout} className="mt-7"><button className="premium-primary-button w-full">מעבר לתשלום מאובטח</button></form> : <p role="status" className="mt-7 rounded-2xl bg-[#F5F7F6] p-4 text-sm font-bold">הסליקה עדיין אינה מחוברת. החשבון נשמר ולא בוצע חיוב.</p>}
    {billing.mode === "manual" && <p className="mt-3 rounded-2xl bg-[#FFF8E7] p-4 text-sm leading-6 text-[#725600]">לאחר התשלום צוות START יאמת את העסקה ויפעיל את המסלול שנבחר. החזרה מהדף לבדה אינה פותחת גישה.</p>}
    <form action="/auth/logout" method="post" className="mt-4"><button className="w-full min-h-11 text-sm font-bold text-[#5B5F5B]">התנתקות</button></form>
  </section></main>;
}
