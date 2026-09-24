import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import NotificationBell from "@/components/notifications/NotificationBell";
import OfflineBanner from "@/components/client/OfflineBanner";
import PushRegistration from "@/components/client/PushRegistration";
import AnalyticsProvider from "@/components/client/AnalyticsProvider";

const links = [
  { href: "/", label: "בית" },
  { href: "/nutrition", label: "תזונה" },
  { href: "/workouts", label: "אימונים" },
  { href: "/progress", label: "התקדמות" },
  { href: "/messages", label: "הודעות" },
  { href: "/content", label: "תוכן" },
  { href: "/profile", label: "פרופיל" },
];

export default function ClientShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  // One inbox, one figure.
  //
  // The bar's badge used to sit on the profile tab and count notifications plus
  // messages, while the bell counted notification-centre rows - two badges on
  // one viewport, disagreeing, because a coach message writes both a message row
  // and a notification pointing at it. The badge now rides the notifications tab
  // and is handed the same count the bell shows, which is the count of the
  // screen they both open. Messages are not lost from it: every one of them puts
  // a row in the notification centre.
  return (
    <main className={`client-app-shell ${className}`.trim()}>
      <header className="mobile-app-header">
        <Link href="/" className="start-wordmark" aria-label="START LIFE FIT — מסך הבית">START LIFE FIT</Link>
      </header>
      <nav aria-label="ניווט ראשי ללקוח" className="desktop-app-nav">
        <div className="desktop-app-nav__inner">
          <Link href="/" className="start-wordmark">START LIFE FIT</Link>
          <div className="desktop-app-nav__links">
            {links.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
          <div className="desktop-app-nav__actions">
            <NotificationBell />
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
      <BottomNav />
    </main>
  );
}
