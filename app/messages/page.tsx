import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import MessageThread from "@/components/messages/MessageThread";
import { getAuthContext } from "@/lib/data/product-repository";
import { listThread, markThreadRead } from "@/lib/messages/repository";
import { hasEntitlement } from "@/lib/subscriptions/access";
import { getSubscriptionAccess } from "@/lib/subscriptions/server";

export default async function MessagesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/coach");

  const access = await getSubscriptionAccess();
  if (!hasEntitlement(access, "coach_messaging")) {
    return (
      <ClientShell>
        <PageHeader eyebrow="START Digital" title="הודעות אישיות למאמן" description="המסלול הדיגיטלי ממשיך ללוות אותך אוטומטית לאורך התוכנית." />
        <section className="rounded-3xl border border-[#DDE7E1] bg-white p-6">
          <h2 className="text-lg font-extrabold text-[#10271D]">רוצה גם מאמן אנושי?</h2>
          <p className="mt-2 text-sm leading-6 text-[#5B6F65]">שיחה אישית, בדיקת צ׳ק־אין ומשוב אנושי זמינים במסלולי START Coach ו־START VIP. פרטי השדרוג יופיעו כאן כשדף הרכישה יחובר.</p>
        </section>
      </ClientShell>
    );
  }

  const messages = await listThread(auth.id);
  // Opening the thread is what reading it means. Done here rather than behind a
  // button, so the coach's "נקראה" is true rather than optimistic.
  if (messages.some((message) => !message.fromMe && !message.readAt))
    await markThreadRead(null);

  return (
    <ClientShell>
      <PageHeader
        eyebrow="הודעות"
        title="השיחה עם המאמן"
        description="הודעות ישירות, בלי לצאת מהאפליקציה."
      />
      <MessageThread
        messages={messages}
        emptyTitle="עדיין לא התחלתם שיחה"
        emptyDescription="אפשר לשאול כל דבר - על התפריט, על האימון או על משהו שקרה השבוע. המאמן יקבל התראה."
        placeholder="מה תרצו לשאול?"
      />
    </ClientShell>
  );
}
