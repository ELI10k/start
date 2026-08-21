"use client";

import { useActionState } from "react";
import { saveNotificationPreferences, type PreferencesState } from "@/app/actions/notifications";
import SubmitButton from "@/components/forms/SubmitButton";
import type { NotificationPreferences } from "@/lib/notifications/repository";

const initial: PreferencesState = { ok: false };
const labels = [["nutrition", "תזונה"], ["workouts", "אימונים"], ["checkIns", "צ׳ק-אין והתקדמות"], ["content", "תוכן"], ["reminders", "תזכורות"]] as const;

/**
 * The preferences form, apart from the notification list around it.
 *
 * It lives in its own client component for one reason: the action can now refuse
 * - an evening reminder set earlier than the morning one, a delay outside its
 * range - and a refusal has to arrive as a sentence beside the field rather than
 * as the error screen the thrown version produced.
 */
export default function NotificationPreferencesForm({ preferences }: { preferences: NotificationPreferences }) {
  const [state, action] = useActionState(saveNotificationPreferences, initial);
  return (
    <form action={action} className="mt-4 grid gap-3">
      <div className="settings-group">
        {labels.map(([key, label]) => (
          <label key={key}>
            <span className="settings-group__label">{label}</span>
            <input name={key} type="checkbox" defaultChecked={preferences[key]} className="size-5 accent-[#16A34A]" />
          </label>
        ))}
      </div>

      <fieldset className="rounded-2xl border border-[#E5E7E5] p-4">
        <legend className="px-1 text-sm font-black">תזכורות אימון</legend>
        <p className="mt-1 text-xs text-[#5B5F5B]">רק בימי אימון מתוכננים, ובהתאם להשלמת האימון.</p>
        {/* The scheduler runs once a day, in the morning. The evening reminder is
            therefore created when the app is next opened rather than pushed at
            the hour - promising a push that cannot arrive is how a client
            concludes that notifications do not work. */}
        <p className="mt-1 text-xs text-[#5B5F5B]">תזכורת הבוקר נשלחת למכשיר בשעה שנבחרה. תזכורת הערב מופיעה באפליקציה בכניסה הבאה.</p>
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
          {/* The hour is not a choice, and offering a picker for it was worse
              than saying so: the summary is sent by one nightly job for everyone,
              so a time typed here changed nothing. The value is still submitted -
              unchanged - so the preference row keeps whatever it holds. */}
          <input type="hidden" name="endOfDayReminderTime" value={preferences.endOfDayReminderTime.slice(0, 5)} />
          <p className="self-center text-xs text-[#5B5F5B]">הסיכום נשלח פעם ביום, בסביבות 21:30. הכיבוי כאן עוצר אותו לגמרי.</p>
        </div>
      </fieldset>

      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`rounded-2xl p-3 text-sm font-bold ${state.ok ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#DC2626]"}`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton idle="שמירת העדפות" pending="שומרים…" className="premium-primary-button w-full" />
    </form>
  );
}
