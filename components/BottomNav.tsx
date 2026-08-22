"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, LineChart, ShoppingBasket, UserRound } from "lucide-react";

// Five, and every one of them is somewhere the home screen does not already go.
//
// The bar and the home screen are one viewport apart, so a destination in both
// is a destination twice - and the tile always wins, because it is bigger and it
// carries a subtitle the tab cannot. Training left first, then nutrition, each
// as its tile took over. The shopping list came the other way: it was a button
// halfway down the nutrition screen, and it is the one thing in this app used
// away from the phone's owner's kitchen - in a supermarket, one-handed - so it
// is the one thing that had to be reachable without reading a screen first.
//
// Progress sits beside home because it is the pair a client moves between - "how
// am I doing today" and "how am I doing overall" - and the bell says whose
// notifications these are, since the only sender is the coach.
const items = [
  { href: "/", label: "בית", icon: Home },
  { href: "/progress", label: "התקדמות", icon: LineChart },
  { href: "/shopping", label: "קניות", icon: ShoppingBasket },
  { href: "/notifications", label: "התראות מאמן", icon: Bell },
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
