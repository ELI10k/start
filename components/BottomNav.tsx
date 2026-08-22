"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, LineChart, Salad, UserRound } from "lucide-react";

// Five, not seven. Seven targets across a phone leaves each about 50px, which is
// under the size a thumb can hit reliably.
//
// Training left this bar rather than gaining a second entrance: the home screen
// opens it from a tile that also names the next training day, so keeping a tab
// for it made the same destination reachable twice from one viewport. What took
// the slot is what had no thumb-sized target at all - the coach's notifications,
// which until now were only the bell in the header.
const items = [
  { href: "/", label: "בית", icon: Home },
  { href: "/nutrition", label: "תזונה", icon: Salad },
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
