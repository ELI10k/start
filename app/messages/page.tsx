import { redirect } from "next/navigation";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import MessageThread from "@/components/messages/MessageThread";
import { markThreadRead } from "@/app/actions/messages";
import { getAuthContext } from "@/lib/data/product-repository";
import { listThread } from "@/lib/messages/repository";

export default async function MessagesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/coach");

  const messages = await listThread(auth.id);
  // Opening the thread is what reading it means. Done here rather than behind a
  // button, so the coach's "נקראה" is true rather than optimistic.
  if (messages.some((message) => !message.fromMe && !message.readAt))
    await markThreadRead(new FormData());

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
