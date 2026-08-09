import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import { getAuthContext } from "@/lib/data/product-repository";

export const metadata: Metadata = { title: "תמיכה | START" };

export default async function SupportPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  return (
    <ClientShell>
      <PageHeader
        eyebrow="עזרה"
        title="תמיכה ויצירת קשר"
        description="ערוצי התמיכה יחוברו לאחר אישור פרטי הקשר."
      />
      <section className="rounded-[26px] border border-[#E5E7E5] bg-[#FFFFFF] p-6">
        <h2 className="text-xl font-black">צריכים עזרה?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5B5F5B]">
          מסך זה הוא מעטפת דמו בלבד. לא הוגדרו במאגר פרטי קשר מאושרים, ולכן אין כאן טופס ששולח הודעה או קישור חיצוני.
        </p>
        <div
          className="mt-5 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-4 text-sm text-[#0B0B0B]"
          role="status"
        >
          במקרה דחוף יש להשתמש בערוץ הקשר שסוכם ישירות עם צוות הליווי.
        </div>
      </section>
    </ClientShell>
  );
}
