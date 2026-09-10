"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function revalidateNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath("/coach");
  revalidatePath("/coach/notifications");
}

function reminderTime(form: FormData, key: string, fallback: string) {
  const value = String(form.get(key) ?? fallback);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("invalid_reminder_time");
  return value;
}

export async function markNotificationRead(form: FormData): Promise<void> {
  if (!(await getAuthContext())) throw new Error("not_authorized");
  const notificationId = String(form.get("notificationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) throw new Error("invalid_notification");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_notification_read", { p_notification_id: notificationId });
  if (error) throw error;
  revalidateNotifications();
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!(await getAuthContext())) throw new Error("not_authorized");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
  revalidateNotifications();
}

export type PreferencesState = Readonly<{ ok: boolean; message?: string }>;

/**
 * Saves the notification preferences, and says so.
 *
 * Every refusal here used to be a thrown Error, and a thrown Error out of a
 * server action is the full-page error screen. So a client who set their evening
 * workout reminder earlier than their morning one - which the two time fields
 * happily accept - lost the notifications screen and got "something went wrong",
 * with no hint that one of the four fields they had just touched was the reason.
 * The rules are unchanged; they are now answers rather than crashes.
 */
export async function saveNotificationPreferences(
  _previous: PreferencesState,
  form: FormData,
): Promise<PreferencesState> {
  if (!(await getAuthContext())) return { ok: false, message: "יש להתחבר מחדש." };
  let morningTime: string;
  let eveningTime: string;
  let endOfDayTime: string;
  try {
    morningTime = reminderTime(form, "workoutMorningReminderTime", "08:00");
    eveningTime = reminderTime(form, "workoutEveningReminderTime", "19:30");
    endOfDayTime = reminderTime(form, "endOfDayReminderTime", "21:30");
  } catch {
    return { ok: false, message: "יש להזין שעה תקינה בכל שדות התזכורות." };
  }
  const mealDelay = Number(form.get("mealReminderDelayMinutes") ?? 60);
  if (morningTime >= eveningTime)
    return { ok: false, message: "שעת תזכורת הבוקר חייבת להיות מוקדמת משעת הערב." };
  if (!Number.isInteger(mealDelay) || mealDelay < 1 || mealDelay > 240)
    return { ok: false, message: "ההשהיה לתזכורת ארוחה היא בין דקה ל־240 דקות." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_notification_preferences", {
    p_nutrition: form.get("nutrition") === "on",
    p_workouts: form.get("workouts") === "on",
    p_check_ins: form.get("checkIns") === "on",
    p_content: form.get("content") === "on",
    p_reminders: form.get("reminders") === "on",
    p_workout_morning_reminder: form.get("workoutMorningReminder") === "on",
    p_workout_evening_reminder: form.get("workoutEveningReminder") === "on",
    p_workout_morning_reminder_time: morningTime,
    p_workout_evening_reminder_time: eveningTime,
    p_meal_reminders: form.get("mealReminders") === "on",
    p_meal_reminder_delay_minutes: mealDelay,
    p_end_of_day_reminder: form.get("endOfDayReminder") === "on",
    p_end_of_day_reminder_time: endOfDayTime,
  });
  if (error) return { ok: false, message: "ההעדפות לא נשמרו. אפשר לנסות שוב." };
  revalidateNotifications();
  return { ok: true, message: "ההעדפות נשמרו." };
}
