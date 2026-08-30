begin;

-- Progress photos are a baseline/month comparison, not a permanent four-week
-- loop. Only check-ins 1 and 4 require and display a photo set.
create or replace function public.set_check_in_photo_requirement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitted_count integer;
  v_number integer;
begin
  select count(*)::integer into v_submitted_count
  from public.check_ins
  where client_id = new.client_id;

  v_number := v_submitted_count + 1;
  new.photo_set_required := v_number in (1, 4);
  return new;
end;
$$;

with numbered as (
  select id, row_number() over (partition by client_id order by submitted_at, id) as n
  from public.check_ins
)
update public.check_ins as check_in
set photo_set_required = numbered.n in (1, 4)
from numbered
where numbered.id = check_in.id;

-- The form remains available every day. Only the reminder is Friday, resolved
-- in Israel time. The weekly key still prevents a duplicate Friday reminder.
create or replace function public.ensure_in_app_reminders_for_client(p_client_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_today date := timezone('Asia/Jerusalem', now())::date;
  v_week text := to_char(timezone('Asia/Jerusalem', now()), 'IYYY-IW');
begin
  if p_client_id is null or not public.notification_enabled(p_client_id, 'reminders') then return; end if;

  if extract(dow from v_today) = 5
    and not exists(
      select 1 from public.check_ins
      where client_id = p_client_id
        and public.israel_week_start(submitted_at) = public.israel_week_start(now())
    )
  then
    perform public.create_in_app_notification(
      p_client_id, null, 'reminders', 'check_in_reminder',
      'תזכורת לצ׳ק-אין', 'הגיע הזמן לעדכן איך עבר עליך השבוע.',
      '/check-in', 'reminders', v_week, 'check-in-reminder-' || v_week
    );
  end if;

  if not exists(select 1 from public.progress_entries where client_id = p_client_id and date >= v_today - 7) then
    perform public.create_in_app_notification(p_client_id, null, 'reminders', 'weight_reminder', 'תזכורת להזנת משקל', 'מדידה עדכנית עוזרת למעקב ולתוכנית שלך.', '/progress', 'reminders', v_week, 'weight-reminder-' || v_week);
  end if;
end $$;

-- Remove only unread check-in reminders created before this corrected schedule;
-- submitted check-ins and all other notification types are untouched.
delete from public.notifications
where type = 'check_in_reminder' and read_at is null;

notify pgrst, 'reload schema';
commit;
