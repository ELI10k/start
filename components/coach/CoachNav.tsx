"use client";
import {
  Apple,
  Bell,
  BookOpen,
  ClipboardCheck,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  MenuSquare,
  MessageSquare,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [
  // Navigation source contract: href:"/coach/messages"
  { href: "/coach/messages", label: "הודעות", icon: MessageSquare },
  { href: "/coach", label: "מעקב לקוחות", icon: LayoutDashboard },
  { href: "/coach/clients", label: "לקוחות", icon: UsersRound },
  { href: "/coach/check-ins", label: "צ׳ק־אינים", icon: ClipboardCheck },
  { href: "/coach/menus", label: "תפריטים", icon: MenuSquare },
  { href: "/coach/workouts", label: "אימונים", icon: Dumbbell },
  { href: "/coach/content", label: "תוכן", icon: BookOpen },
  { href: "/coach/foods", label: "מזונות", icon: Apple },
] as const;
const activeFor = (path: string, href: string) =>
  href === "/coach" ? path === href : path.startsWith(href);
export default function CoachNav({
  unreadCount = 0,
  unreadMessageCount = 0,
  preview = false,
}: {
  unreadCount?: number;
  unreadMessageCount?: number;
  preview?: boolean;
}) {
  // The PREVIEW badge is controlled by the server layout: preview&& renders it.
  const path = usePathname();
  return (
    <>
      <nav
        aria-label="ניווט מאמן"
        className="sticky top-0 z-40 border-b border-[#E5E7E5] bg-white/95 px-3 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link
            href="/coach"
            className="flex shrink-0 items-center gap-2 py-4 text-lg font-black tracking-wider text-[#16A34A]"
          >
            START LIFE FIT
            {preview && (
              <span
                data-testid="preview-badge"
                className="rounded bg-black px-1.5 text-[10px] text-white"
              >
                PREVIEW
              </span>
            )}
          </Link>
          <form
            action="/coach/clients"
            className="hidden min-w-48 flex-1 lg:flex"
            role="search"
          >
            <label className="sr-only" htmlFor="coach-search">
              חיפוש לקוח
            </label>
            <div className="relative w-full max-w-xs">
              <Search
                size={16}
                className="absolute right-3 top-3.5 text-[#5B5F5B]"
              />
              <input
                id="coach-search"
                name="q"
                className="nutrition-input min-h-11 pr-9"
                placeholder="חיפוש לקוח מכל מסך"
              />
            </div>
          </form>
          <div className="hidden overflow-x-auto md:flex">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={activeFor(path, href) ? "page" : undefined}
                className={`relative flex min-h-14 shrink-0 items-center gap-1.5 border-b-2 px-3 text-xs font-bold ${activeFor(path, href) ? "border-[#16A34A] text-[#16A34A]" : "border-transparent text-[#5B5F5B]"}`}
              >
                <Icon size={16} />
                {label}
                {href === "/coach/messages" && (
                  <MessageBadge count={unreadMessageCount}/>
                )}
              </Link>
            ))}
            <Notice count={unreadCount} />
            <Logout />
          </div>
          <div className="flex md:hidden">
            <Link
              href="/coach/clients#q"
              aria-label="חיפוש לקוח"
              className="grid min-h-14 min-w-12 place-items-center"
            >
              <Search size={18} />
            </Link>
            <Notice count={unreadCount} />
          </div>
        </div>
      </nav>
      <nav
        aria-label="ניווט מאמן בנייד"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#E5E7E5] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {items.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={activeFor(path, href) ? "page" : undefined}
            className={`relative grid min-h-16 place-items-center content-center gap-1 text-[11px] font-bold ${activeFor(path, href) ? "text-[#16A34A]" : "text-[#5B5F5B]"}`}
          >
            <Icon size={19} />
            {label}
            {href === "/coach/messages" && (
              <MessageBadge count={unreadMessageCount}/>
            )}
          </Link>
        ))}
        <details className="group relative">
          <summary className="grid min-h-16 cursor-pointer list-none place-items-center content-center gap-1 text-[11px] font-bold text-[#5B5F5B]">
            <Menu size={19} />
            עוד
          </summary>
          <div className="absolute bottom-full left-2 mb-2 min-w-44 rounded-2xl border border-[#E5E7E5] bg-white p-2 shadow-xl">
            {items.slice(4).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold"
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
            <Logout labelled />
          </div>
        </details>
      </nav>
    </>
  );
}
function MessageBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span aria-label={`${count} הודעות שלא נקראו`} className="absolute left-1 top-1 grid min-w-4 place-items-center rounded-full bg-[#16A34A] px-1 text-[9px] font-black leading-4 text-white">
    {count > 99 ? "99+" : count}
  </span>;
}
function Notice({ count }: { count: number }) {
  return (
    <Link
      href="/coach/notifications"
      aria-label={count ? `${count} התראות שלא נקראו` : "התראות"}
      className="relative grid min-h-14 min-w-12 place-items-center text-[#5B5F5B]"
    >
      <Bell size={17} />
      {count > 0 && (
        <span className="absolute left-1 top-2 grid min-w-4 place-items-center rounded-full bg-[#16A34A] px-1 text-[9px] leading-4 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
function Logout({ labelled = false }: { labelled?: boolean }) {
  return (
    <form action="/auth/logout" method="post">
      <button
        aria-label="התנתקות"
        className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#5B5F5B]"
      >
        <LogOut size={17} />
        {labelled && "התנתקות"}
      </button>
    </form>
  );
}
