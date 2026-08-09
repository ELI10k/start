"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Dumbbell, Home, LineChart, Salad, UserRound } from "lucide-react";

const items = [
  { href: "/", label: "בית", icon: Home },
  { href: "/nutrition", label: "תזונה", icon: Salad },
  { href: "/workouts", label: "אימונים", icon: Dumbbell },
  { href: "/progress", label: "התקדמות", icon: LineChart },
  { href: "/content", label: "תוכן", icon: BookOpen },
  { href: "/notifications", label: "התראות", icon: Bell },
  { href: "/profile", label: "פרופיל", icon: UserRound },
];

export default function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  if (pathname.startsWith("/coach") || pathname.startsWith("/foods") || pathname.startsWith("/import")) return null;
  return (
    <nav aria-label="ניווט לקוח" className="bottom-app-nav">
      <div>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isNotifications = href === "/notifications";
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} data-active={active || undefined}>
              <span className="bottom-app-nav__icon">
                <Icon aria-hidden="true" size={21} />
                {isNotifications && unreadCount > 0 && (
                  <span className="bottom-app-nav__badge" aria-label={`${unreadCount} התראות שלא נקראו`}>
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
