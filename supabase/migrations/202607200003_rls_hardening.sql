begin;

drop policy if exists completions_self_all on public.meal_completion_logs;
create policy completions_self_select on public.meal_completion_logs for select to authenticated using (client_id = (select auth.uid()));
create policy completions_self_insert on public.meal_completion_logs for insert to authenticated with check (
  client_id = (select auth.uid()) and exists (
    select 1 from public.meals x join public.menu_days d on d.id=x.menu_day_id join public.menus m on m.id=d.menu_id
    where x.id=meal_id and m.client_id=(select auth.uid()) and m.status='active'
  )
);
create policy completions_self_update on public.meal_completion_logs for update to authenticated
using (client_id = (select auth.uid())) with check (
  client_id = (select auth.uid()) and exists (
    select 1 from public.meals x join public.menu_days d on d.id=x.menu_day_id join public.menus m on m.id=d.menu_id
    where x.id=meal_id and m.client_id=(select auth.uid()) and m.status='active'
  )
);

create or replace function public.protect_profile_authority() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.role <> old.role or new.status <> old.status or new.id <> old.id or lower(new.email) <> lower(old.email)) then
    raise exception 'profile_authority_fields_are_server_managed';
  end if;
  return new;
end $$;

create or replace function public.protect_check_in_client_fields() returns trigger language plpgsql as $$
begin
  if public.current_role() = 'coach' and (
    new.client_id <> old.client_id or new.submitted_at <> old.submitted_at or new.adherence <> old.adherence or
    new.hunger <> old.hunger or new.energy <> old.energy or new.sleep <> old.sleep or new.training <> old.training or
    new.notes is distinct from old.notes
  ) then raise exception 'coach_may_only_review_check_in'; end if;
  return new;
end $$;
create trigger check_ins_protect_client_fields before update on public.check_ins for each row execute function public.protect_check_in_client_fields();

commit;
