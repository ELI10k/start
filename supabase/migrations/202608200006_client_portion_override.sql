-- The client says how much they actually ate.
--
-- A menu prescribes a portion, and a person eats what a person eats. Until now
-- the only two answers were "eaten" and "not eaten", so half a portion had to be
-- reported as one or the other - and either way the day's totals were wrong by
-- half a portion. Multiply that across five meals and the summary the coach
-- reads stops describing anything.
--
-- The override belongs on the selection, which is already per client, per group
-- and per day. Null means "as prescribed", which is what every existing row
-- means and is why this needs no backfill. The number is in the same unit the
-- client is shown - if the row says 2 פיתות, an override of 1 is one pita - and
-- nothing about the plan changes: the coach's portion stays exactly as written,
-- and this records the difference.
--
-- Impact: one nullable column and one function. No existing row changes meaning.
-- Rollback: supabase/seeds/client-portion-override-rollback.sql

begin;

alter table public.meal_group_selections
  add column if not exists amount_override numeric(10,2)
  check (amount_override is null or amount_override > 0);

create or replace function public.set_meal_group_amount(p_group_id uuid, p_date date, p_quantity numeric)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_quantity is not null and p_quantity <= 0 then raise exception 'invalid_quantity'; end if;

  -- Same gate as select_meal_group_alternative: the group has to belong to a
  -- plan actively assigned to this client on this date.
  if not exists(
    select 1 from public.meal_food_groups g
    join public.meals m on m.id = g.meal_id
    join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
    where g.id = p_group_id and a.client_id = auth.uid() and a.status = 'active'
      and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date)
  ) then raise exception 'group_not_assigned'; end if;

  -- An amount without a chosen alternative has nothing to be an amount OF.
  update public.meal_group_selections
    set amount_override = p_quantity, updated_at = now()
    where client_id = auth.uid() and group_id = p_group_id and selection_date = p_date
    returning id into v_id;
  if v_id is null then raise exception 'select_one_alternative_per_group'; end if;
  return v_id;
end $$;

revoke all on function public.set_meal_group_amount(uuid,date,numeric) from public;
revoke all on function public.set_meal_group_amount(uuid,date,numeric) from anon;
grant execute on function public.set_meal_group_amount(uuid,date,numeric) to authenticated;

notify pgrst, 'reload schema';
commit;
