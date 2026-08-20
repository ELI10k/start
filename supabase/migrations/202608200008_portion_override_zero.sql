-- "I ate none of it" is an amount.
--
-- amount_override was constrained to > 0, and the field to a minimum of 0.1, so
-- the one honest answer for a portion that was served and left was unavailable:
-- the client had to mark the whole meal "לא נאכל", which is a different claim -
-- it says the meal did not happen, when what happened is that one group of it
-- did not. Zero says exactly the right thing and costs the day exactly the right
-- calories.
--
-- Null still means "as prescribed". Zero now means "none of this one".
--
-- Impact: one constraint widened and one guard. No row changes meaning: nothing
-- could have been zero before.
-- Rollback: supabase/seeds/portion-override-zero-rollback.sql

begin;

alter table public.meal_group_selections
  drop constraint if exists meal_group_selections_amount_override_check;
alter table public.meal_group_selections
  add constraint meal_group_selections_amount_override_check
  check (amount_override is null or amount_override >= 0);

create or replace function public.set_meal_group_amount(p_group_id uuid, p_date date, p_quantity numeric)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  -- Zero is allowed; below zero is not a portion.
  if p_quantity is not null and p_quantity < 0 then raise exception 'invalid_quantity'; end if;

  if not exists(
    select 1 from public.meal_food_groups g
    join public.meals m on m.id = g.meal_id
    join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
    where g.id = p_group_id and a.client_id = auth.uid() and a.status = 'active'
      and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date)
  ) then raise exception 'group_not_assigned'; end if;

  update public.meal_group_selections
    set amount_override = p_quantity, updated_at = now()
    where client_id = auth.uid() and group_id = p_group_id and selection_date = p_date
    returning id into v_id;
  if v_id is null then raise exception 'select_one_alternative_per_group'; end if;
  return v_id;
end $$;

notify pgrst, 'reload schema';
commit;
