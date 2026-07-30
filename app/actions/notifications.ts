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

export async function saveNotificationPreferences(form: FormData): Promise<void> {
  if (!(await getAuthContext())) throw new Error("not_authorized");
  const morningTime = reminderTime(form, "workoutMorningReminderTime", "08:00");
  const eveningTime = reminderTime(form, "workoutEveningReminderTime", "19:30");
  const endOfDayTime = reminderTime(form, "endOfDayReminderTime", "21:30");
  const mealDelay = Number(form.get("mealReminderDelayMinutes") ?? 60);
  if (morningTime >= eveningTime) throw new Error("invalid_workout_reminder_times");
  if (!Number.isInteger(mealDelay) || mealDelay < 1 || mealDelay > 240) throw new Error("invalid_meal_reminder_delay");
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
  if (error) throw error;
  revalidateNotifications();
}
