import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InAppNotification = Readonly<{
  id: string;
  category: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
}>;

export type NotificationPreferences = Readonly<{
  nutrition: boolean;
  workouts: boolean;
  checkIns: boolean;
  content: boolean;
  reminders: boolean;
  workoutMorningReminder: boolean;
  workoutEveningReminder: boolean;
  workoutMorningReminderTime: string;
  workoutEveningReminderTime: string;
  mealReminders: boolean;
  mealReminderDelayMinutes: number;
  endOfDayReminder: boolean;
  endOfDayReminderTime: string;
}>;

const defaultPreferences: NotificationPreferences = {
  nutrition: true,
  workouts: true,
  checkIns: true,
  content: true,
  reminders: true,
  workoutMorningReminder: true,
  workoutEveningReminder: true,
  workoutMorningReminderTime: "08:00:00",
  workoutEveningReminderTime: "19:30:00",
  mealReminders: true,
  mealReminderDelayMinutes: 60,
  endOfDayReminder: true,
  endOfDayReminderTime: "21:30:00",
};

export async function getNotificationCenter() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { notifications: [] as readonly InAppNotification[], unreadCount: 0, preferences: defaultPreferences };

  await supabase.rpc("ensure_in_app_reminders");
  const [{ data: notifications, error: notificationError }, { data: preferences, error: preferenceError }] = await Promise.all([
    supabase.from("notifications").select("id,category,type,title,body,href,created_at,read_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(80),
    supabase.from("notification_preferences").select("nutrition,workouts,check_ins,content,reminders,workout_morning_reminder,workout_evening_reminder,workout_morning_reminder_time,workout_evening_reminder_time,meal_reminders,meal_reminder_delay_minutes,end_of_day_reminder,end_of_day_reminder_time").eq("user_id", user.id).maybeSingle(),
  ]);
  if (notificationError) throw notificationError;
  if (preferenceError) throw preferenceError;
  const rows = (notifications ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    type: item.type,
    title: item.title,
    body: item.body,
    href: item.href,
    createdAt: item.created_at,
    readAt: item.read_at,
  }));
  return {
    notifications: rows,
    unreadCount: rows.filter((item) => !item.readAt).length,
    preferences: preferences ? {
      nutrition: preferences.nutrition,
      workouts: preferences.workouts,
      checkIns: preferences.check_ins,
      content: preferences.content,
      reminders: preferences.reminders,
      workoutMorningReminder: preferences.workout_morning_reminder,
      workoutEveningReminder: preferences.workout_evening_reminder,
      workoutMorningReminderTime: preferences.workout_morning_reminder_time,
      workoutEveningReminderTime: preferences.workout_evening_reminder_time,
      mealReminders: preferences.meal_reminders,
      mealReminderDelayMinutes: preferences.meal_reminder_delay_minutes,
      endOfDayReminder: preferences.end_of_day_reminder,
      endOfDayReminderTime: preferences.end_of_day_reminder_time,
    } : defaultPreferences,
  };
}

export async function getUnreadNotificationCount() {
  const center = await getNotificationCenter();
  return center.unreadCount;
}
