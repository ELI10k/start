begin;

alter table public.check_ins
  add column if not exists handled_at timestamptz,
  add column if not exists handled_by uuid references public.profiles(id) on delete set null;

create index if not exists check_ins_coach_queue_idx
  on public.check_ins(handled_at, submitted_at desc);

create or replace function public.set_check_in_handled(
  p_check_in_id uuid,
  p_handled boolean
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.current_role() <> 'coach' then
    raise exception 'coach_required';
  end if;

  update public.check_ins
  set handled_at = case when p_handled then coalesce(handled_at, now()) else null end,
      handled_by = case when p_handled then auth.uid() else null end
  where id = p_check_in_id
    and public.is_coach_for(client_id);

  if not found then
    raise exception 'check_in_not_found';
  end if;
end
$$;

revoke all on function public.set_check_in_handled(uuid, boolean) from public;
grant execute on function public.set_check_in_handled(uuid, boolean) to authenticated;

create or replace function public.notify_check_in_events() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_coach_id uuid;
begin
  if tg_op = 'INSERT' then
    for v_coach_id in
      select coach_id from public.coach_client_relationships
      where client_id = new.client_id and status = 'active'
    loop
      perform public.create_in_app_notification(
        v_coach_id,
        new.client_id,
        'check_ins',
        'check_in_submitted',
        'צ׳ק-אין חדש מלקוח',
        'נשלח עדכון שבועי חדש.',
        '/coach/check-ins?status=new&client=' || new.client_id::text,
        'check_ins',
        new.id::text,
        'check-in-coach-' || new.id::text || '-' || v_coach_id::text
      );
    end loop;
  elsif new.status = 'reviewed'
    and (old.status is distinct from 'reviewed'
      or old.coach_response is distinct from new.coach_response) then
    perform public.create_in_app_notification(
      new.client_id,
      new.reviewed_by,
      'check_ins',
      'check_in_reviewed',
      'המאמן הגיב לצ׳ק-אין',
      'נוספה תגובה לעדכון השבועי שלך.',
      '/check-in/history',
      'check_ins',
      new.id::text,
      'check-in-review-' || new.id::text || '-' || md5(coalesce(new.coach_response, ''))
    );
  end if;
  return new;
end
$$;

notify pgrst, 'reload schema';
commit;
