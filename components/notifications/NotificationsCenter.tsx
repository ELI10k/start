import Link from "next/link";
import { BellOff, CheckCheck, ChevronLeft, Settings2 } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import NotificationPreferencesForm from "@/components/notifications/NotificationPreferencesForm";
import type { InAppNotification, NotificationPreferences } from "@/lib/notifications/repository";
import { StateBlock } from "@/components/client/AppPatterns";
import SubmitButton from "@/components/forms/SubmitButton";
import PushRegistration from "@/components/client/PushRegistration";

const when = (value: string) =>
  new Date(value).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "short" });

export default function NotificationsCenter({ notifications, unreadCount, preferences }: { notifications: readonly InAppNotification[]; unreadCount: number; preferences: NotificationPreferences }) {
  return <div className="grid gap-4">
    <header className="premium-page-header">
      <div>
        <p>START</p>
        <h1>התראות</h1>
        <span>{unreadCount ? `${unreadCount} התראות ממתינות לקריאה` : "הכול מעודכן"}</span>
      </div>
      {unreadCount > 0 && <form action={markAllNotificationsRead}>
        <SubmitButton idle="סימון הכול כנקרא" pending="מסמנים…" className="premium-secondary-button" />
      </form>}
    </header>

    {/* One row per notification, unread ones tinted rather than bordered - a card
        per notification made twenty of them twenty screens. */}
    {notifications.length ? <div className="app-list">
      {notifications.map((notification) =>
        <div key={notification.id} data-unread={notification.readAt ? undefined : "true"}>
          <Link href={notification.href} className="app-list__main">
            <strong>{notification.title}</strong>
            <span>{notification.body}</span>
          </Link>
          <span className="app-list__meta">{when(notification.createdAt)}</span>
          {notification.readAt
            ? <ChevronLeft aria-hidden="true" size={18} />
            : <form action={markNotificationRead}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <SubmitButton idle="נקראה" pending="…" className="chip" />
              </form>}
        </div>)}
    </div> : <StateBlock icon={<BellOff aria-hidden="true" size={22} />} title="אין התראות כרגע" description="תזכורות ועדכונים מהמאמן יופיעו כאן." />}

    <details className="disclosure">
      <summary>
        <span className="flex items-center gap-2"><Settings2 aria-hidden="true" size={17} />העדפות התראות</span>
      </summary>
      <div className="disclosure__body">
        <p className="text-sm text-[#5B5F5B]">ההעדפות חלות גם על ההתראות בפעמון וגם על התראות במכשיר.</p>
        {/* Asking here rather than on first launch: the client is already
            looking at their notification settings, so the request has a reason. */}
        <div className="mt-3"><PushRegistration showPrompt /></div>
        <NotificationPreferencesForm preferences={preferences} />
      </div>
    </details>

    <p className="flex items-center justify-center gap-2 text-xs text-[#5B5F5B]"><CheckCheck aria-hidden="true" size={14} />התראות נשמרות בחשבון שלך בלבד.</p>
  </div>;
}
