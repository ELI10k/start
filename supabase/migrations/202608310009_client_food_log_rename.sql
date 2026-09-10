create or replace function public.rename_client_food_log(p_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null or public.current_role() <> 'client' then
    raise exception 'client_required';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 200 then
    raise exception 'food_name_required';
  end if;

  update public.client_food_log
  set name = v_name
  where id = p_id and client_id = auth.uid();

  return found;
end;
$$;

revoke all on function public.rename_client_food_log(uuid, text) from public;
grant execute on function public.rename_client_food_log(uuid, text) to authenticated;

alter table public.notification_preferences
  alter column end_of_day_reminder_time set default time '20:00';

update public.notification_preferences
set end_of_day_reminder_time = time '20:00'
where end_of_day_reminder = true;
