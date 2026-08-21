-- What was recorded as eaten follows what the client actually said.
--
-- 202608200006 let a client say "I ate less than that" and 202608200008 let them
-- say "I ate none of it". Both wrote the answer onto meal_group_selections, and
-- the client's own nutrition screen scales by it - but nothing else did. The row
-- that records intake, eaten_meal_items, was still written straight from
-- meal_items, so:
--
--   * the coach's client file, the evening daily-coach message and every report
--     built on eaten_meal_items reported the portion the coach PLANNED, not the
--     one the client reported eating;
--   * an override of 0 - "it was served and I left it" - still recorded the full
--     planned meal, which is the exact opposite of what was said;
--   * changing the amount AFTER marking the meal eaten changed nothing at all,
--     because the intake row had already been written;
--   * changing the chosen alternative after marking the meal eaten left the
--     previous food recorded as eaten, and left an amount_override that had been
--     typed against a different food's portion - "2" meaning two pitas silently
--     became two grams of cottage cheese.
--
-- One rule now, in one place: intake for a group is whatever that group's
-- selection currently says, scaled by the override, and it is rewritten whenever
-- any part of that sentence changes. An override of zero records no intake at
-- all, which is both the truth and the only value eaten_meal_items.amount can
-- accept - it is constrained to be positive.
--
-- Impact: three functions replaced, no schema change, nothing backfilled. Rows
-- already written keep their values; they are corrected the next time the client
-- touches the meal.
--
-- Rollback: supabase/seeds/intake-follows-the-client-rollback.sql

begin;

-- The portion the client reported, as a multiple of the portion the coach wrote.
-- Null override is "as prescribed" and returns 1. The override is counted in the
-- unit the client is shown (display_quantity), which is what the field beside it
-- is labelled in.
create or replace function public.meal_item_intake_factor(
  p_display_quantity numeric, p_amount numeric, p_override numeric
) returns numeric
language sql immutable set search_path = public as $$
  select case
    when p_override is null then 1::numeric
    when coalesce(nullif(p_display_quantity, 0), nullif(p_amount, 0)) is null then 1::numeric
    else p_override / coalesce(nullif(p_display_quantity, 0), p_amount)
  end
$$;

-- Rewrites the recorded intake for one meal from its current selections.
--
-- Called from every function that can change what the sentence "I ate this much
-- of that" means. It is deliberately whole-meal rather than per-row: deleting
-- and re-inserting the meal's rows is the only version that cannot drift, and a
-- meal holds at most a handful of them.
--
-- Does nothing unless the meal is marked eaten. A meal that is unmarked, skipped
-- or substituted has no intake by definition, and clearing it is already the job
-- of set_meal_day_status.
create or replace function public.refresh_meal_intake(p_meal_id uuid, p_date date)
returns void
language plpgsql security invoker set search_path = public as $$
declare v_log_id uuid;
begin
  if not exists(
    select 1 from public.meal_day_status
    where client_id = auth.uid() and meal_id = p_meal_id and status_date = p_date and status = 'eaten'
  ) then return; end if;

  select id into v_log_id from public.nutrition_logs
    where client_id = auth.uid() and log_date = p_date;
  if v_log_id is null then return; end if;

  delete from public.eaten_meal_items e
  using public.meal_items i
  where e.nutrition_log_id = v_log_id and e.meal_item_id = i.id and i.meal_id = p_meal_id;

  insert into public.eaten_meal_items(nutrition_log_id, meal_item_id, food_id, food_name, amount,
    calculated_calories, calculated_protein, calculated_carbohydrates, calculated_fat)
  select v_log_id, i.id, i.food_id, f.name,
    round(i.amount * factor.value, 2),
    round(i.calculated_calories * factor.value, 2),
    round(i.calculated_protein * factor.value, 2),
    round(i.calculated_carbohydrates * factor.value, 2),
    round(i.calculated_fat * factor.value, 2)
  from public.meal_group_selections s
  join public.meal_items i on i.id = s.meal_item_id
  join public.foods f on f.id = i.food_id
  cross join lateral (
    select public.meal_item_intake_factor(i.display_quantity, i.amount, s.amount_override) as value
  ) factor
  where s.client_id = auth.uid() and s.selection_date = p_date and i.meal_id = p_meal_id
    -- "I ate none of it" is an answer, and the answer is no intake. It is also
    -- the only one eaten_meal_items cannot hold: amount is constrained positive,
    -- so a zero row would raise rather than record.
    and round(i.amount * factor.value, 2) > 0;
end $$;

create or replace function public.set_meal_day_status(
  p_meal_id uuid, p_date date, p_status text, p_note text default null
)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare
  v_assignment public.client_meal_plan_assignments;
  v_log_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_status not in ('eaten','not_eaten','other','none') then raise exception 'invalid_meal_status'; end if;
  if v_note is not null and p_status <> 'other' then raise exception 'note_requires_other_status'; end if;
  if p_status = 'other' and v_note is null then raise exception 'substitution_requires_note'; end if;
  if length(coalesce(v_note, '')) > 500 then raise exception 'note_too_long'; end if;

  select a.* into v_assignment
  from public.client_meal_plan_assignments a
  join public.meals m on m.meal_plan_id = a.meal_plan_id
  where m.id = p_meal_id and a.client_id = auth.uid() and a.status = 'active'
    and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date);
  if not found then raise exception 'meal_not_assigned'; end if;

  insert into public.nutrition_logs(client_id, assignment_id, meal_plan_id, log_date)
  values (auth.uid(), v_assignment.id, v_assignment.meal_plan_id, p_date)
  on conflict (client_id, log_date) do update
    set assignment_id = excluded.assignment_id, meal_plan_id = excluded.meal_plan_id
  returning id into v_log_id;

  if p_status = 'eaten' then
    -- Unchanged rule: every group must have a chosen alternative first.
    if exists(select 1 from public.meal_food_groups where meal_id = p_meal_id) and exists(
      select 1 from public.meal_food_groups g where g.meal_id = p_meal_id and not exists(
        select 1 from public.meal_group_selections s
        where s.client_id = auth.uid() and s.group_id = g.id and s.selection_date = p_date
      )
    ) then raise exception 'select_one_alternative_per_group'; end if;
  else
    -- 'not_eaten', 'other' and 'none' all remove any recorded intake for the
    -- meal. For 'other' this is the point: the planned foods were not eaten, and
    -- the substitution has no approved nutrition values to put in their place.
    delete from public.eaten_meal_items e
    using public.meal_items i
    where e.nutrition_log_id = v_log_id and e.meal_item_id = i.id and i.meal_id = p_meal_id;
  end if;

  if p_status = 'none' then
    delete from public.meal_day_status
    where client_id = auth.uid() and meal_id = p_meal_id and status_date = p_date;
  else
    insert into public.meal_day_status(client_id, meal_id, status_date, status, note)
    values (auth.uid(), p_meal_id, p_date, p_status, v_note)
    on conflict (client_id, meal_id, status_date)
      do update set status = excluded.status, note = excluded.note, updated_at = now();
  end if;

  -- After the mark is stored, not before: refresh_meal_intake reads the mark to
  -- decide whether there is any intake to record.
  if p_status = 'eaten' then perform public.refresh_meal_intake(p_meal_id, p_date); end if;

  return v_log_id;
end $$;

create or replace function public.set_meal_group_amount(p_group_id uuid, p_date date, p_quantity numeric)
returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_meal_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  -- Zero is allowed; below zero is not a portion.
  if p_quantity is not null and p_quantity < 0 then raise exception 'invalid_quantity'; end if;

  select g.meal_id into v_meal_id
  from public.meal_food_groups g
  join public.meals m on m.id = g.meal_id
  join public.client_meal_plan_assignments a on a.meal_plan_id = m.meal_plan_id
  where g.id = p_group_id and a.client_id = auth.uid() and a.status = 'active'
    and a.assigned_from <= p_date and (a.assigned_until is null or a.assigned_until >= p_date);
  if v_meal_id is null then raise exception 'group_not_assigned'; end if;

  update public.meal_group_selections
    set amount_override = p_quantity, updated_at = now()
    where client_id = auth.uid() and group_id = p_group_id and selection_date = p_date
    returning id into v_id;
  if v_id is null then raise exception 'select_one_alternative_per_group'; end if;

  -- The amount is part of what "eaten" means, so saying it after the mark has
  -- to move the recorded intake with it. Before this, an amount typed after the
  -- meal was marked changed the client's screen and nothing else.
  perform public.refresh_meal_intake(v_meal_id, p_date);
  return v_id;
end $$;

create or replace function public.select_meal_group_alternative(p_group_id uuid,p_meal_item_id uuid,p_date date) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_meal_id uuid; v_previous uuid;
begin
  if public.current_role()<>'client' then raise exception 'client_required'; end if;
  select g.meal_id into v_meal_id
  from public.meal_food_groups g join public.meal_items i on i.group_id=g.id
  join public.meals m on m.id=g.meal_id join public.client_meal_plan_assignments a on a.meal_plan_id=m.meal_plan_id
  where g.id=p_group_id and i.id=p_meal_item_id and a.client_id=auth.uid() and a.status='active'
    and a.assigned_from<=p_date and (a.assigned_until is null or a.assigned_until>=p_date);
  if v_meal_id is null then raise exception 'alternative_not_assigned'; end if;

  select meal_item_id into v_previous from public.meal_group_selections
    where client_id=auth.uid() and group_id=p_group_id and selection_date=p_date;

  insert into public.meal_group_selections(client_id,group_id,meal_item_id,selection_date)
  values(auth.uid(),p_group_id,p_meal_item_id,p_date)
  on conflict(client_id,group_id,selection_date) do update set
    meal_item_id=excluded.meal_item_id,
    -- An override is a quantity of one particular food, in that food's own unit.
    -- Carrying it onto a different food turns "2 pitas" into "2 grams of rice"
    -- without anyone saying so, so choosing something else clears it.
    amount_override=case when meal_group_selections.meal_item_id is distinct from excluded.meal_item_id
      then null else meal_group_selections.amount_override end,
    updated_at=now()
  returning id into v_id;

  -- Changing the choice after the meal was marked eaten used to leave the
  -- previous food standing as what was eaten.
  if v_previous is distinct from p_meal_item_id then perform public.refresh_meal_intake(v_meal_id, p_date); end if;
  return v_id;
end $$;

revoke all on function public.refresh_meal_intake(uuid,date) from public;
revoke all on function public.refresh_meal_intake(uuid,date) from anon;
grant execute on function public.refresh_meal_intake(uuid,date) to authenticated;
grant execute on function public.meal_item_intake_factor(numeric,numeric,numeric) to authenticated;

notify pgrst, 'reload schema';
commit;
