import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { UserRound } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import OfflineBanner from "@/components/client/OfflineBanner";
import PushRegistration from "@/components/client/PushRegistration";
import AnalyticsProvider from "@/components/client/AnalyticsProvider";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";

const links = [
  { href: "/", label: "בית" },
  { href: "/nutrition", label: "תזונה" },
  { href: "/workouts", label: "אימונים" },
  { href: "/progress", label: "התקדמות" },
  { href: "/content", label: "תוכן" },
  { href: "/profile", label: "פרופיל" },
];

export default async function ClientShell({ children }: { children: React.ReactNode }) {
  const unreadCount = await getUnreadNotificationCount();
  return (
    <main className="client-app-shell">
      <header className="mobile-app-header">
        <Link href="/" className="start-wordmark" aria-label="START — מסך הבית">START</Link>
        <div className="mobile-app-header__actions">
          <NotificationBell unreadCount={unreadCount} />
          <Link href="/profile" className="avatar-button" aria-label="פתיחת הפרופיל">
            <UserRound aria-hidden="true" size={18} />
          </Link>
        </div>
      </header>
      <nav aria-label="ניווט ראשי ללקוח" className="desktop-app-nav">
        <div className="desktop-app-nav__inner">
          <Link href="/" className="start-wordmark">START</Link>
          <div className="desktop-app-nav__links">
            {links.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
          <div className="desktop-app-nav__actions">
            <NotificationBell unreadCount={unreadCount} />
            <form action="/auth/logout" method="post">
              <button>התנתקות</button>
            </form>
          </div>
        </div>
      </nav>
      <OfflineBanner />
      {/* Draws nothing. It keeps the device token current and routes a tapped
          notification to the screen the bell would have opened. */}
      <PushRegistration />
      <AnalyticsProvider />
      <div className="client-app-content">{children}</div>
      <BottomNav unreadCount={unreadCount} />
    </main>
  );
}
