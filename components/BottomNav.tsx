"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, Home, LineChart, Salad, UserRound } from "lucide-react";

// Five, not seven.
//
// Notifications had a tab here as well as the bell in the header - the same
// screen reachable twice from one viewport - and content had one despite being
// something a client opens occasionally, not daily. Seven targets across a phone
// leaves each about 50px, which is under the size a thumb can hit reliably.
// These five are the daily loop; the bell keeps notifications, and content and
// messages live one tap into the profile.
const items = [
  { href: "/", label: "בית", icon: Home },
  { href: "/nutrition", label: "תזונה", icon: Salad },
  { href: "/workouts", label: "אימונים", icon: Dumbbell },
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
          // Anything waiting - a notification or a message - shows on the profile
          // tab, which is the tab that now leads to both.
          const isProfile = href === "/profile";
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} data-active={active || undefined}>
              <span className="bottom-app-nav__icon">
                <Icon aria-hidden="true" size={21} />
                {isProfile && unreadCount > 0 && (
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
