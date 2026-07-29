begin;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('nutrition', 'workouts', 'check_ins', 'content', 'reminders', 'progress', 'system')),
  type text not null check (type in ('meal_plan_assigned', 'workout_assigned', 'check_in_submitted', 'check_in_reviewed', 'progress_updated', 'check_in_reminder', 'weight_reminder', 'content_published')),
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null default '' check (length(body) <= 2000),
  href text not null default '/' check (href like '/%'),
  source_table text,
  source_id text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_unread_idx on public.notifications(recipient_id, created_at desc) where read_at is null;
create index notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create unique index notifications_recipient_dedupe_idx on public.notifications(recipient_id, dedupe_key) where dedupe_key is not null;

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  nutrition boolean not null default true,
  workouts boolean not null default true,
  check_ins boolean not null default true,
  content boolean not null default true,
  reminders boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references public.profiles(id) on delete cascade,
  client_id uuid references public.profiles(id) on delete cascade,
  category text not null check (category in ('check_ins', 'progress')),
  cadence_days smallint not null default 7 check (cadence_days between 1 and 31),
  enabled boolean not null default true,
  message text check (message is null or length(trim(message)) between 1 and 500),
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coach_id is not null or client_id is not null)
);
create index reminder_rules_client_enabled_idx on public.reminder_rules(client_id, enabled, category);
create index reminder_rules_coach_enabled_idx on public.reminder_rules(coach_id, enabled, category);
create trigger reminder_rules_touch before update on public.reminder_rules for each row execute function public.touch_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.reminder_rules enable row level security;

create policy notifications_recipient_read on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_recipient_update on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy notification_preferences_self on public.notification_preferences for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reminder_rules_coach_all on public.reminder_rules for all to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()) and (client_id is null or public.is_coach_for(client_id)));
create policy reminder_rules_client_read on public.reminder_rules for select to authenticated using (client_id = (select auth.uid()));

revoke all on table public.notifications, public.notification_preferences, public.reminder_rules from anon, authenticated;
grant select, update on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notification_preferences, public.reminder_rules to authenticated;

create or replace function public.notification_enabled(p_user_id uuid, p_category text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select case p_category
    when 'nutrition' then nutrition when 'workouts' then workouts when 'check_ins' then check_ins
    when 'content' then content when 'reminders' then reminders when 'progress' then check_ins else true end
  from public.notification_preferences where user_id = p_user_id), true)
$$;

create or replace function public.create_in_app_notification(
  p_recipient_id uuid, p_actor_id uuid, p_category text, p_type text, p_title text, p_body text, p_href text,
  p_source_table text default null, p_source_id text default null, p_dedupe_key text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.notification_enabled(p_recipient_id, p_category) then return; end if;
  insert into public.notifications(recipient_id, actor_id, category, type, title, body, href, source_table, source_id, dedupe_key)
  values(p_recipient_id, p_actor_id, p_category, p_type, p_title, p_body, p_href, p_source_table, p_source_id, p_dedupe_key)
  on conflict(recipient_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

create or replace function public.notify_meal_plan_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select title into v_title from public.meal_plans where id = new.meal_plan_id;
    perform public.create_in_app_notification(new.client_id, new.assigned_by, 'nutrition', 'meal_plan_assigned', 'תפריט חדש הוקצה לך', coalesce(v_title, 'תפריט חדש מוכן לצפייה.'), '/nutrition', 'client_meal_plan_assignments', new.id::text, 'meal-plan-' || new.id::text);
  end if;
  return new;
end $$;
create trigger client_meal_plan_assignments_notify after insert or update of status on public.client_meal_plan_assignments for each row execute function public.notify_meal_plan_assignment();

create or replace function public.notify_workout_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select name into v_name from public.workout_programs where id = new.program_id;
    perform public.create_in_app_notification(new.client_id, new.assigned_by, 'workouts', 'workout_assigned', 'תוכנית אימון חדשה', coalesce(v_name, 'תוכנית אימון חדשה מוכנה עבורך.'), '/workouts', 'workout_assignments', new.id::text, 'workout-' || new.id::text);
  end if;
  return new;
end $$;
create trigger workout_assignments_notify after insert or update of status on public.workout_assignments for each row execute function public.notify_workout_assignment();

create or replace function public.notify_check_in_events() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_coach_id uuid;
begin
  if tg_op = 'INSERT' then
    for v_coach_id in select coach_id from public.coach_client_relationships where client_id = new.client_id and status = 'active' loop
      perform public.create_in_app_notification(v_coach_id, new.client_id, 'check_ins', 'check_in_submitted', 'צ׳ק-אין חדש מלקוח', 'נשלח עדכון שבועי חדש.', '/coach/clients/' || new.client_id::text, 'check_ins', new.id::text, 'check-in-coach-' || new.id::text || '-' || v_coach_id::text);
    end loop;
  elsif new.status = 'reviewed' and (old.status is distinct from 'reviewed' or old.coach_response is distinct from new.coach_response) then
    perform public.create_in_app_notification(new.client_id, new.reviewed_by, 'check_ins', 'check_in_reviewed', 'המאמן הגיב לצ׳ק-אין', 'נוספה תגובה לעדכון השבועי שלך.', '/check-in/history', 'check_ins', new.id::text, 'check-in-review-' || new.id::text || '-' || md5(coalesce(new.coach_response, '')));
  end if;
  return new;
end $$;
create trigger check_ins_notify after insert or update of status, coach_response on public.check_ins for each row execute function public.notify_check_in_events();

create or replace function public.notify_progress_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_coach_id uuid;
begin
  for v_coach_id in select coach_id from public.coach_client_relationships where client_id = new.client_id and status = 'active' loop
    perform public.create_in_app_notification(v_coach_id, new.client_id, 'progress', 'progress_updated', 'נוספה מדידת משקל', 'הלקוח הזין מדידה חדשה.', '/coach/clients/' || new.client_id::text, 'progress_entries', new.id::text, 'progress-' || new.id::text || '-' || v_coach_id::text);
  end loop;
  return new;
end $$;
create trigger progress_entries_notify after insert on public.progress_entries for each row execute function public.notify_progress_update();

create or replace function public.notify_published_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_client_id uuid;
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    for v_client_id in select id from public.profiles where role = 'client' and status = 'active' loop
      perform public.create_in_app_notification(v_client_id, new.created_by, 'content', 'content_published', 'תוכן חדש פורסם', new.title, '/content/' || new.id::text, 'content_items', new.id::text, 'content-published-' || new.id::text);
    end loop;
  end if;
  return new;
end $$;
create trigger content_items_notify after insert or update of status on public.content_items for each row execute function public.notify_published_content();

create or replace function public.ensure_in_app_reminders() returns void
language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_week text := to_char(current_date, 'IYYY-IW');
begin
  if v_user_id is null or public.current_role() <> 'client' or not public.notification_enabled(v_user_id, 'reminders') then return; end if;
  if not exists(select 1 from public.check_ins where client_id = v_user_id and submitted_at >= now() - interval '7 days') then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'check_in_reminder', 'תזכורת לצ׳ק-אין', 'הגיע הזמן לעדכן איך עבר עליך השבוע.', '/check-in', 'reminders', v_week, 'check-in-reminder-' || v_week);
  end if;
  if not exists(select 1 from public.progress_entries where client_id = v_user_id and date >= current_date - 7) then
    perform public.create_in_app_notification(v_user_id, null, 'reminders', 'weight_reminder', 'תזכורת להזנת משקל', 'מדידה עדכנית עוזרת למעקב ולתוכנית שלך.', '/progress', 'reminders', v_week, 'weight-reminder-' || v_week);
  end if;
end $$;

create or replace function public.mark_notification_read(p_notification_id uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.notifications set read_at = coalesce(read_at, now()) where id = p_notification_id and recipient_id = auth.uid();
  if not found then raise exception 'notification_not_found'; end if;
end $$;
create or replace function public.mark_all_notifications_read() returns void
language sql security invoker set search_path = public as $$
  update public.notifications set read_at = now() where recipient_id = auth.uid() and read_at is null
$$;
create or replace function public.save_notification_preferences(p_nutrition boolean, p_workouts boolean, p_check_ins boolean, p_content boolean, p_reminders boolean) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.notification_preferences(user_id, nutrition, workouts, check_ins, content, reminders)
  values(auth.uid(), p_nutrition, p_workouts, p_check_ins, p_content, p_reminders)
  on conflict(user_id) do update set nutrition = excluded.nutrition, workouts = excluded.workouts, check_ins = excluded.check_ins, content = excluded.content, reminders = excluded.reminders, updated_at = now();
end $$;

revoke all on function public.ensure_in_app_reminders(), public.mark_notification_read(uuid), public.mark_all_notifications_read(), public.save_notification_preferences(boolean,boolean,boolean,boolean,boolean) from public;
revoke all on function public.notification_enabled(uuid,text), public.create_in_app_notification(uuid,uuid,text,text,text,text,text,text,text,text) from public;
grant execute on function public.ensure_in_app_reminders(), public.mark_notification_read(uuid), public.mark_all_notifications_read(), public.save_notification_preferences(boolean,boolean,boolean,boolean,boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
