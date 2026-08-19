import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import { UserRound } from "lucide-react";
import NotificationBell from "@/components/notifications/NotificationBell";
import OfflineBanner from "@/components/client/OfflineBanner";
import PushRegistration from "@/components/client/PushRegistration";
import AnalyticsProvider from "@/components/client/AnalyticsProvider";
import NativeBridge from "@/components/native/NativeBridge";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
import { getUnreadMessageCount } from "@/lib/messages/repository";

const links = [
  { href: "/", label: "בית" },
  { href: "/nutrition", label: "תזונה" },
  { href: "/workouts", label: "אימונים" },
  { href: "/progress", label: "התקדמות" },
  { href: "/messages", label: "הודעות" },
  { href: "/content", label: "תוכן" },
  { href: "/profile", label: "פרופיל" },
];

export default async function ClientShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // The bottom bar carries one badge, so it carries one figure: anything at all
  // that is waiting for this client, notification or message.
  const [unreadNotifications, unreadMessages] = await Promise.all([
    getUnreadNotificationCount(),
    getUnreadMessageCount(),
  ]);
  const unreadCount = unreadNotifications + unreadMessages;
  return (
    <main className={`client-app-shell ${className}`.trim()}>
      <header className="mobile-app-header">
        <Link href="/" className="start-wordmark" aria-label="START — מסך הבית">START</Link>
        <div className="mobile-app-header__actions">
          <NotificationBell unreadCount={unreadNotifications} />
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
            <NotificationBell unreadCount={unreadNotifications} />
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
      {/* Hands the container's capabilities to the app. No-op on the web. */}
      <NativeBridge />
      <div className="client-app-content">{children}</div>
      <BottomNav unreadCount={unreadCount} />
    </main>
  );
}
