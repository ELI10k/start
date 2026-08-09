import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import { getAuthContext, getClientOverview } from "@/lib/data/product-repository";

export default async function ProfilePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  const overview = await getClientOverview(auth.id, new Date().toISOString().slice(0, 10));
  const profile = overview.clientProfile;

  return (
    <ClientShell>
      <PageHeader
        eyebrow="הפרופיל שלי"
        title="פרטים ויעדים"
        description="הפרטים שמוצגים כאן נטענים מהחשבון המאובטח שלך."
      />
      <section className="start-surface grid gap-4 rounded-[26px] p-5 sm:grid-cols-2 sm:p-6">
        <Field label="שם מלא" value={auth.fullName} />
        <Field label="סטטוס חשבון" value={auth.status === "active" ? "פעיל" : auth.status} />
        <Field label="יעד" value={profile.goal ?? "טרם הוגדר"} />
        <Field label="משקל יעד" value={profile.target_weight ? `${profile.target_weight} ק״ג` : "טרם הוגדר"} />
        <Field label="יעד קלוריות" value={profile.calorie_target ? `${profile.calorie_target} קל׳` : "טרם הוגדר"} />
        <Field label="יעד חלבון" value={profile.protein_target ? `${profile.protein_target} ג׳` : "טרם הוגדר"} />
      </section>
      <p className="start-empty mt-5 rounded-2xl p-4 text-sm leading-6 text-[#5B5F5B]">לעדכון פרטים או יעדים, פנו למאמן. כך נשמרת התאמה אחת ומאושרת של התוכנית האישית שלך.</p>
      <form action="/auth/logout" method="post" className="mt-5 md:hidden">
        <button className="min-h-12 w-full rounded-2xl border border-red-400/20 bg-red-400/5 px-5 text-sm font-bold text-red-200">
          התנתקות מהחשבון
        </button>
      </form>
    </ClientShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[#F7F8F7] p-4"><p className="text-xs text-[#5B5F5B]">{label}</p><p className="mt-2 font-bold">{value}</p></div>;
}
