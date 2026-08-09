import { Bell } from "lucide-react";
import Link from "next/link";

export default function NotificationBell({ unreadCount, href = "/notifications" }: { unreadCount: number; href?: string }) {
  return <Link href={href} aria-label={unreadCount ? `${unreadCount} התראות שלא נקראו` : "התראות"} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[#3F433F] hover:bg-[#F7F8F7] hover:text-[#16A34A]"><Bell size={20}/>{unreadCount > 0 && <span className="absolute left-1 top-1 grid min-w-5 place-items-center rounded-full bg-[#16A34A] px-1 text-[10px] font-black leading-5 text-[#FFFFFF]">{unreadCount > 99 ? "99+" : unreadCount}</span>}</Link>;
}
