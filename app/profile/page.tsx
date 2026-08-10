import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, BookOpen, ChevronLeft, ClipboardCheck, LifeBuoy, LogOut, Scale } from "lucide-react";
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

      <header className="premium-card flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-xl font-black text-[#16A34A]">
          {auth.fullName.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <strong className="block truncate text-lg">{auth.fullName}</strong>
          <span className={`pill${auth.status === "active" ? " pill--green" : ""}`}>
            {auth.status === "active" ? "פעיל" : auth.status}
          </span>
        </div>
      </header>

      {/* Six boxes in a grid read as six equal facts. As rows, the label sits on
          one side and the number on the other, which is what a client scans. */}
      <h2 className="section-heading section-heading--compact mt-5">היעדים שלי</h2>
      <div className="settings-group">
        <Row label="יעד" value={profile.goal ?? "טרם הוגדר"} />
        <Row label="משקל יעד" value={profile.target_weight ? `${profile.target_weight} ק״ג` : "טרם הוגדר"} />
        <Row label="יעד קלוריות" value={profile.calorie_target ? `${profile.calorie_target} קל׳` : "טרם הוגדר"} />
        <Row label="יעד חלבון" value={profile.protein_target ? `${profile.protein_target} ג׳` : "טרם הוגדר"} />
      </div>
      <p className="start-empty mt-3 rounded-2xl p-4 text-sm leading-6">
        לעדכון פרטים או יעדים, פנו למאמן. כך נשמרת התאמה אחת ומאושרת של התוכנית האישית שלך.
      </p>

      <h2 className="section-heading section-heading--compact mt-6">האפליקציה</h2>
      <div className="settings-group">
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

function Row({ label, value }: { label: string; value: string }) {
  return <div><span className="settings-group__label">{label}</span><span className="settings-group__value">{value}</span></div>;
}
