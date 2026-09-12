begin;

-- Give clients advance notice on Thursday, the day before the Friday morning
-- check-in. This is a separate, weekly-deduped reminder; the existing Friday
-- reminder stays unchanged for clients who still have not checked in.
create or replace function public.ensure_in_app_reminders_for_client(p_client_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_today date := timezone('Asia/Jerusalem', now())::date;
  v_week text := to_char(timezone('Asia/Jerusalem', now()), 'IYYY-IW');
begin
  if p_client_id is null or not public.notification_enabled(p_client_id, 'reminders') then return; end if;

  if extract(dow from v_today) = 4
    and not exists(
      select 1 from public.check_ins
      where client_id = p_client_id
        and public.israel_week_start(submitted_at) = public.israel_week_start(now())
    )
  then
    perform public.create_in_app_notification(
      p_client_id, null, 'reminders', 'check_in_reminder',
      '⏰ מחר צ׳ק־אין בבוקר', 'מחר בבוקר מחכה לך הצ׳ק־אין השבועי.',
      '/check-in', 'reminders', v_week, 'check-in-tomorrow-' || v_week
    );
  end if;

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

revoke all on function public.ensure_in_app_reminders_for_client(uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;
