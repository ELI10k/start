"use client";
import { Dumbbell, Home, LineChart, Salad, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [
  { href: "/", label: "בית", icon: Home },
  { href: "/nutrition", label: "תזונה", icon: Salad },
  { href: "/workouts", label: "אימונים", icon: Dumbbell },
  { href: "/progress", label: "התקדמות", icon: LineChart },
  { href: "/profile", label: "פרופיל", icon: UserRound },
];

export default function BottomNav(props: { unreadCount?: number }) {
  void props.unreadCount;
  const pathname = usePathname();
  if (pathname.startsWith("/coach") || pathname.startsWith("/foods") || pathname.startsWith("/import")) return null;
  return (
    <nav aria-label="ניווט לקוח" className="bottom-app-nav">
      <div>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <span className="bottom-app-nav__icon"><Icon aria-hidden="true" size={22} /></span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
