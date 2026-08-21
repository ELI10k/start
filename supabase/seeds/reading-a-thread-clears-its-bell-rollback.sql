-- Undoes 202608210002_reading_a_thread_clears_its_bell.sql by restoring the
-- definition from 202608190001. Nothing stored has to be undone: notifications
-- marked read while it was in force stay read, which is the truth either way.

begin;

create or replace function public.mark_message_thread_read(p_client_id uuid default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.current_role();
  v_client_id uuid;
  v_count integer;
begin
  if v_role = 'client' then
    v_client_id := auth.uid();
  elsif v_role = 'coach' then
    if p_client_id is null then raise exception 'client_required'; end if;
    if not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
    v_client_id := p_client_id;
  else
    raise exception 'not_authorized';
  end if;

  update public.coach_client_messages
    set read_at = now()
    where client_id = v_client_id and read_at is null and sender_id <> auth.uid();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

notify pgrst, 'reload schema';
commit;
