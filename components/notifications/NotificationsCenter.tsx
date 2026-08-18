import Link from "next/link";
import { BellOff, CheckCheck, ChevronLeft, Settings2 } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead, saveNotificationPreferences } from "@/app/actions/notifications";
import type { InAppNotification, NotificationPreferences } from "@/lib/notifications/repository";
import { StateBlock } from "@/components/client/AppPatterns";
import SubmitButton from "@/components/forms/SubmitButton";
import PushRegistration from "@/components/client/PushRegistration";

const labels = [["nutrition", "תזונה"], ["workouts", "אימונים"], ["checkIns", "צ׳ק-אין והתקדמות"], ["content", "תוכן"], ["reminders", "תזכורות"]] as const;

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
        <form action={saveNotificationPreferences} className="mt-4 grid gap-3">
          <div className="settings-group">
            {labels.map(([key, label]) =>
              <label key={key}>
                <span className="settings-group__label">{label}</span>
                <input name={key} type="checkbox" defaultChecked={preferences[key]} className="size-5 accent-[#16A34A]" />
              </label>)}
          </div>

          <fieldset className="rounded-2xl border border-[#E5E7E5] p-4">
            <legend className="px-1 text-sm font-black">תזכורות אימון</legend>
            <p className="mt-1 text-xs text-[#5B5F5B]">רק בימי אימון מתוכננים, ובהתאם להשלמת האימון.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-bold">תזכורת בוקר<input name="workoutMorningReminder" type="checkbox" defaultChecked={preferences.workoutMorningReminder} className="size-5 accent-[#16A34A]" /></label>
              <label className="text-sm font-bold">שעת בוקר<input name="workoutMorningReminderTime" type="time" defaultValue={preferences.workoutMorningReminderTime.slice(0, 5)} className="nutrition-input mt-2" /></label>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-bold">תזכורת ערב<input name="workoutEveningReminder" type="checkbox" defaultChecked={preferences.workoutEveningReminder} className="size-5 accent-[#16A34A]" /></label>
              <label className="text-sm font-bold">שעת ערב<input name="workoutEveningReminderTime" type="time" defaultValue={preferences.workoutEveningReminderTime.slice(0, 5)} className="nutrition-input mt-2" /></label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-[#E5E7E5] p-4">
            <legend className="px-1 text-sm font-black">תזכורות תזונה</legend>
            <p className="mt-1 text-xs text-[#5B5F5B]">תזכורת לאחר ארוחה שלא סומנה, וסיכום בסוף היום.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-bold">תזכורות ארוחה<input name="mealReminders" type="checkbox" defaultChecked={preferences.mealReminders} className="size-5 accent-[#16A34A]" /></label>
              <label className="text-sm font-bold">השהיה בדקות<input name="mealReminderDelayMinutes" type="number" min="1" max="240" step="1" defaultValue={preferences.mealReminderDelayMinutes} className="nutrition-input mt-2" /></label>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-bold">סיכום סוף יום<input name="endOfDayReminder" type="checkbox" defaultChecked={preferences.endOfDayReminder} className="size-5 accent-[#16A34A]" /></label>
              <label className="text-sm font-bold">שעת סיכום<input name="endOfDayReminderTime" type="time" defaultValue={preferences.endOfDayReminderTime.slice(0, 5)} className="nutrition-input mt-2" /></label>
            </div>
          </fieldset>

          <SubmitButton idle="שמירת העדפות" pending="שומרים…" className="premium-primary-button w-full" />
        </form>
      </div>
    </details>

    <p className="flex items-center justify-center gap-2 text-xs text-[#5B5F5B]"><CheckCheck aria-hidden="true" size={14} />התראות נשמרות בחשבון שלך בלבד.</p>
  </div>;
}
