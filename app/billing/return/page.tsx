import Link from "next/link";
import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import BillingStatusRefresh from "@/components/subscriptions/BillingStatusRefresh";
import PlanSummary from "@/components/subscriptions/PlanSummary";
import { getAuthContext } from "@/lib/data/product-repository";
import { getSubscriptionAccess } from "@/lib/subscriptions/server";

export default async function BillingReturnPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/billing/return");
  if (auth.role !== "client") redirect("/unauthorized");
  const access = await getSubscriptionAccess();
  const verified = access.plan === "digital" && ["web", "apple", "google"].includes(access.source ?? "") && ["trialing", "active"].includes(access.status ?? "");
  return <ClientShell>
    <BillingStatusRefresh active={verified}/>
    <section className="mx-auto mt-8 max-w-xl rounded-3xl border border-[#DDE7E1] bg-white p-6 text-center">
      <p className="text-xs font-black uppercase tracking-[.12em] text-[#147A50]">START Digital</p>
      <h1 className="mt-2 text-2xl font-black text-[#10271D]">{verified ? "המנוי הופעל בהצלחה" : "מאמתים את התשלום"}</h1>
      <p className="mt-3 text-sm leading-6 text-[#5B6F65]">{verified ? "הגישה נפתחה לפי אישור חתום שהתקבל מספק הסליקה." : "לא פותחים גישה לפי כתובת החזרה בדפדפן. המערכת ממתינה לאישור המאובטח מספק הסליקה; בדרך כלל זה לוקח כמה שניות."}</p>
      <div className="mt-5 text-right"><PlanSummary plan={access.plan} source={access.source}/></div>
      <Link href={verified ? "/" : "/billing/return"} className="premium-primary-button mt-5 block w-full">{verified ? "המשך להתאמה האישית" : "בדיקה מחדש"}</Link>
    </section>
  </ClientShell>;
}
