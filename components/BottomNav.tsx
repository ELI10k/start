"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, LineChart, UserRound } from "lucide-react";

// Four, and every one of them is somewhere the home screen does not already go.
//
// The bar and the home screen are one viewport apart, so a destination in both
// is a destination twice - and the tile always wins, because it is bigger and it
// carries a subtitle the tab cannot. Training left first, then nutrition, each
// as its tile took over. What is left is the four the tiles do not cover, which
// also buys every tab back the width a thumb needs: seven targets across a phone
// leave about 50px each, four leave nearly 100.
const items = [
  { href: "/", label: "בית", icon: Home },
  { href: "/notifications", label: "התראות", icon: Bell },
  { href: "/progress", label: "התקדמות", icon: LineChart },
  { href: "/profile", label: "פרופיל", icon: UserRound },
];

export default function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  if (pathname.startsWith("/coach") || pathname.startsWith("/foods") || pathname.startsWith("/import")) return null;
  return (
    // The bottom bar and the desktop bar are one navigation in two presentations,
    // and exactly one of them is ever rendered, so they carry the same name. On a
    // phone this is the client's main navigation - it has to be reachable by name.
    <nav aria-label="ניווט ראשי ללקוח" className="bottom-app-nav">
      <div>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          // The badge sits on the tab that opens the thing it is counting, and
          // it counts what the bell counts. Two badges on one screen showing
          // different totals for the same inbox is how this last went wrong -
          // the bell said 1 beside a tab saying 2 - so the tab and the bell are
          // now handed the same figure.
          const isInbox = href === "/notifications";
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} data-active={active || undefined}>
              <span className="bottom-app-nav__icon">
                <Icon aria-hidden="true" size={21} />
                {isInbox && unreadCount > 0 && (
                  <span className="bottom-app-nav__badge" aria-label={`${unreadCount} עדכונים שלא נקראו`}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
