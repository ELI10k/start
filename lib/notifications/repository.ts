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
  actorName: string | null;
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
    supabase.from("notifications").select("id,actor_id,category,type,title,body,href,created_at,read_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(80),
    supabase.from("notification_preferences").select("nutrition,workouts,check_ins,content,reminders,workout_morning_reminder,workout_evening_reminder,workout_morning_reminder_time,workout_evening_reminder_time,meal_reminders,meal_reminder_delay_minutes,end_of_day_reminder,end_of_day_reminder_time").eq("user_id", user.id).maybeSingle(),
  ]);
  if (notificationError) throw notificationError;
  if (preferenceError) throw preferenceError;
  const actorIds=[...new Set((notifications??[]).map((item)=>item.actor_id).filter((id):id is string=>Boolean(id)))];
  const {data:actors,error:actorsError}=actorIds.length
    ?await supabase.from("profiles").select("id,full_name").in("id",actorIds)
    :{data:[],error:null};
  if(actorsError)throw actorsError;
  const actorNames=new Map((actors??[]).map((actor)=>[actor.id,actor.full_name]));
  const rows = (notifications ?? []).map((item) => ({
    id: item.id,
    category: item.category,
    type: item.type,
    title: item.title,
    body: item.body,
    href: item.href,
    createdAt: item.created_at,
    readAt: item.read_at,
    actorName: item.actor_id?actorNames.get(item.actor_id)?.trim()||null:null,
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

/**
 * How many notifications are waiting, as a count rather than as a page of rows.
 *
 * This used to call getNotificationCenter, which fetches eighty notification
 * rows and the whole preferences record to return one integer - and it is called
 * on every render of the client shell and the coach navigation, so every screen
 * in the product paid for a page of data it discarded.
 *
 * `ensure_in_app_reminders` stays: generating the day's reminders on arrival is
 * how they appear for a client who has not opened the notifications screen, and
 * dropping it here would quietly change when reminders exist.
 *
 * `excludeTypes` exists for the one badge that counts messages separately. A
 * direct message writes both a notification and a message row, so a badge that
 * adds the two counts one message twice.
 */
export async function getUnreadNotificationCount(excludeTypes: readonly string[] = []) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  await supabase.rpc("ensure_in_app_reminders");
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (excludeTypes.length) query = query.not("type", "in", `(${excludeTypes.join(",")})`);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** The notification a direct message raises. Counted as a message, not twice. */
export const DIRECT_MESSAGE_TYPE = "direct_message";
