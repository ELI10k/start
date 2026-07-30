import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("notification migration defines the in-app schema, RLS and event triggers", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607200012_in_app_notifications.sql", import.meta.url), "utf8");
  for (const table of ["notifications", "notification_preferences", "reminder_rules"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  for (const item of ["notifications_recipient_read", "mark_notification_read", "mark_all_notifications_read", "save_notification_preferences", "ensure_in_app_reminders", "notify_meal_plan_assignment", "notify_workout_assignment", "notify_check_in_events", "notify_published_content"]) {
    assert.match(sql, new RegExp(item));
  }
});

test("notification recipient isolation removes coach access to client notification rows", async () => {
  const [isolation, coachHistory] = await Promise.all([
    readFile(new URL("../supabase/migrations/202607280007_notification_recipient_isolation.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/202607280008_coach_message_history_policy.sql", import.meta.url), "utf8"),
  ]);
  assert.match(isolation, /drop policy if exists notifications_coach_assigned_select/);
  assert.match(isolation, /recipient_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(isolation, /public\.is_coach_for\(recipient_id\)/);
  assert.match(coachHistory, /type = 'coach_message'/);
  assert.match(coachHistory, /actor_id = \(select auth\.uid\(\)\)/);
  assert.match(coachHistory, /public\.is_coach_for\(recipient_id\)/);
});

test("notification center is Supabase-backed and exposes read, preferences and badges", async () => {
  const [repository, actions, center, shell, coachNav] = await Promise.all([
    readFile(new URL("../lib/notifications/repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/actions/notifications.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/notifications/NotificationsCenter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/client/ClientShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/coach/CoachNav.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(repository, /from\("notifications"\)/);
  assert.match(repository, /\.eq\("recipient_id", user\.id\)/);
  assert.match(repository, /ensure_in_app_reminders/);
  for (const action of ["markNotificationRead", "markAllNotificationsRead", "saveNotificationPreferences"]) assert.match(actions, new RegExp(action));
  assert.match(center, /סימון הכול כנקרא/);
  assert.match(center, /העדפות התראות/);
  assert.match(shell, /NotificationBell/);
  assert.match(coachNav, /coach\/notifications/);
  assert.doesNotMatch(repository, /localStorage/);
});

test("workout reminders use planned days, completion checks and independent morning/evening dedupe", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607200013_workout_day_reminders.sql", import.meta.url), "utf8");
  for (const preference of ["workout_morning_reminder", "workout_evening_reminder", "workout_morning_reminder_time", "workout_evening_reminder_time"]) assert.match(sql, new RegExp(preference));
  assert.match(sql, /workout_is_planned_on/);
  assert.match(sql, /not found or not public\.workout_is_planned_on/);
  assert.match(sql, /status = 'completed'/);
  assert.match(sql, /workout_morning_reminder/);
  assert.match(sql, /workout_evening_reminder/);
  assert.match(sql, /workout-morning-' \|\| v_assignment\.id::text \|\| '-' \|\| v_today::text/);
  assert.match(sql, /workout-evening-' \|\| v_assignment\.id::text \|\| '-' \|\| v_today::text/);
});

test("workout reminder preferences validate times and are persisted through the authenticated action", async () => {
  const [actions, repository, center] = await Promise.all([
    readFile(new URL("../app/actions/notifications.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/notifications/repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/notifications/NotificationsCenter.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(actions, /invalid_workout_reminder_times/);
  assert.match(actions, /p_workout_morning_reminder/);
  assert.match(actions, /p_workout_evening_reminder/);
  assert.match(repository, /workoutMorningReminderTime/);
  assert.match(center, /workoutMorningReminderTime/);
  assert.match(center, /workoutEveningReminderTime/);
  assert.match(center, /mealReminderDelayMinutes/);
  assert.match(center, /endOfDayReminderTime/);
});

test("daily reminder sprint schema protects snooze, skipped workouts and notification preferences", async () => {
  const [sql, actions, dailyActions] = await Promise.all([
    readFile(new URL("../supabase/migrations/202607210002_daily_tasks_and_reminders.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/actions/notifications.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/workouts/client/WorkoutDailyActions.tsx", import.meta.url), "utf8"),
  ]);
  for (const item of ["workout_reminder_snoozes", "weekly_achievements", "skip_scheduled_workout", "snooze_scheduled_workout", "meal_reminders", "meal_reminder_delay_minutes", "end_of_day_reminder", "end_of_day_reminder_time", "completed_workout_cannot_skip"]) assert.match(sql, new RegExp(item));
  assert.match(sql, /unique\(assignment_id,scheduled_date,active\)/);
  assert.match(actions, /p_meal_reminders/);
  assert.match(actions, /p_end_of_day_reminder/);
  assert.match(dailyActions, /הזכר לי בעוד שעה/);
  assert.match(dailyActions, /דלג על היום/);
});

test("habits and free-menu MVP stores events, weekly reports and daily nutrition summaries in Supabase", async () => {
  const sql = await readFile(new URL("../supabase/migrations/202607210003_habits_and_free_menu_mvp.sql", import.meta.url), "utf8");
  for (const table of ["client_events", "habit_analysis_reports", "free_menu_days", "free_menu_entries", "free_menu_daily_summaries"]) assert.match(sql, new RegExp(`create table public\\.${table}`));
  for (const rule of ["unique(client_id,week_start,week_end)", "unique(client_id,menu_date)", "log_client_event", "save_free_menu_entry", "has_nutrition", "enable row level security"]) assert.ok(sql.includes(rule));
});
