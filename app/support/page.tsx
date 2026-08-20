import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, MessageSquare, Scale } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import PageHeader from "@/components/client/PageHeader";
import MessageThread from "@/components/messages/MessageThread";
import { getAuthContext } from "@/lib/data/product-repository";
import { listThread } from "@/lib/messages/repository";

export const metadata: Metadata = { title: "תמיכה | START" };

export default async function SupportPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  // This screen used to announce itself as "a demo shell" and offer nothing at
  // all - no form, no address, no link - while the profile linked to it as
  // "תמיכה". A client who was stuck arrived here and left with nowhere to go.
  // It is now the same thread as /messages, tagged so the coach can see at a
  // glance that this one is a support question rather than a chat.
  const messages = await listThread(auth.id);
  const supportMessages = messages.filter((message) => message.topic === "support");

  return (
    <ClientShell>
      <PageHeader
        eyebrow="עזרה"
        title="תמיכה ויצירת קשר"
        description="כותבים כאן, והמאמן מקבל התראה."
        action={{ href: "/messages", label: "כל ההודעות" }}
      />

      <MessageThread
        messages={supportMessages}
        topic="support"
        emptyTitle="במה אפשר לעזור?"
        emptyDescription="בעיה באפליקציה, שאלה על התוכנית או משהו שלא עובד - כתבו כאן והפנייה תגיע למאמן עם התראה."
        placeholder="מה קרה?"
      />

      <h2 className="section-heading section-heading--compact mt-6">אולי זה מה שחיפשתם</h2>
      <div className="settings-group">
        <Link href="/messages">
          <span className="settings-group__label"><MessageSquare aria-hidden="true" size={18} />שאלה למאמן על התוכנית</span>
        </Link>
        <Link href="/check-in">
          <span className="settings-group__label"><ClipboardCheck aria-hidden="true" size={18} />שליחת צ׳ק־אין שבועי</span>
        </Link>
        <Link href="/progress">
          <span className="settings-group__label"><Scale aria-hidden="true" size={18} />עדכון משקל ומדידות</span>
        </Link>
      </div>
    </ClientShell>
  );
}
