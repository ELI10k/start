import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, ChevronLeft, ClipboardCheck, LifeBuoy, LogOut, MessageSquare, Scale } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import { getAuthContext } from "@/lib/data/product-repository";
import RequestProfileUpdate from "@/components/client/RequestProfileUpdate";

export default async function ProfilePage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  return (
    <ClientShell>
      <h1 className="sr-only">הפרופיל שלי</h1>
      <RequestProfileUpdate/>

      <h2 className="section-heading section-heading--compact mt-6">האפליקציה</h2>
      <div className="settings-group">
        <Link href="/messages">
          <span className="settings-group__label"><MessageSquare aria-hidden="true" size={18} />הודעות עם המאמן</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/notifications">
          <span className="settings-group__label"><Bell aria-hidden="true" size={18} />התראות והעדפות</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/progress">
          <span className="settings-group__label"><Scale aria-hidden="true" size={18} />משקל ומדידות</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/check-in/history">
          <span className="settings-group__label"><ClipboardCheck aria-hidden="true" size={18} />היסטוריית צ׳ק־אין</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/content">
          <span className="settings-group__label"><BookOpen aria-hidden="true" size={18} />ספריית התוכן</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
        <Link href="/support">
          <span className="settings-group__label"><LifeBuoy aria-hidden="true" size={18} />תמיכה</span>
          <ChevronLeft aria-hidden="true" size={18} />
        </Link>
      </div>

      <h2 className="section-heading section-heading--compact mt-6">חשבון</h2>
      <form action="/auth/logout" method="post" className="settings-group settings-group--danger">
        <button>
          <span className="settings-group__label"><LogOut aria-hidden="true" size={18} />התנתקות מהחשבון</span>
        </button>
      </form>
    </ClientShell>
  );
}
