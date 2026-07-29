begin;

alter table public.check_ins
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles(id) on delete set null;

create index check_ins_client_status_submitted_idx
  on public.check_ins(client_id, status, submitted_at desc);
create index check_ins_reviewed_by_idx
  on public.check_ins(reviewed_by, reviewed_at desc)
  where reviewed_by is not null;

create or replace function public.apply_check_in_review() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.current_role() = 'coach' then
    if new.status = 'reviewed' and nullif(trim(coalesce(new.coach_response, '')), '') is null then
      raise exception 'review_response_required';
    end if;
    if new.status = 'reviewed' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := coalesce(new.reviewed_at, now());
    elsif new.status = 'submitted' then
      new.coach_response := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
    end if;
  end if;
  return new;
end $$;

create trigger check_ins_apply_review before update on public.check_ins
for each row execute function public.apply_check_in_review();

create or replace function public.review_check_in(p_check_in_id uuid, p_coach_response text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if length(trim(coalesce(p_coach_response, ''))) = 0 or length(trim(p_coach_response)) > 4000 then
    raise exception 'invalid_coach_response';
  end if;
  update public.check_ins
  set coach_response = trim(p_coach_response), status = 'reviewed'
  where id = p_check_in_id and public.is_coach_for(client_id);
  if not found then raise exception 'check_in_not_found'; end if;
end $$;

revoke all on function public.review_check_in(uuid,text) from public;
grant execute on function public.review_check_in(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
