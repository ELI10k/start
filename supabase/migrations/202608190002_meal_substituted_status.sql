-- "I ate something else."
--
-- A meal had three states: unmarked, eaten, not eaten. A client who ate, but ate
-- something other than the plan, had to choose between two answers that were both
-- untrue - and almost always chose "not eaten", because they had not eaten the
-- planned meal. The coach then read a skipped meal, and the adherence figures
-- that feed the weekly risk score read it the same way.
--
-- The fourth state records what actually happened, with the client's own words
-- attached. It is deliberately NOT counted as intake: the planned items are not
-- logged, because they are not what was eaten, and START does not invent
-- nutrition values for free text. What it buys is a true signal - the coach can
-- see the difference between "skipped breakfast" and "had eggs on toast instead".
--
-- Impact: additive. One value added to a CHECK constraint, one nullable column,
-- and one function gains a parameter with a default. The existing three-argument
-- call sites keep working unchanged, because the new argument is optional.
--
-- Backward compatibility: the status constraint is only widened, so every row
-- already stored still validates. An older build reading this table sees 'other'
-- as an unknown status; the repository maps anything it does not recognise to
-- "unmarked", which is the safe reading.
--
-- Rollback: supabase/seeds/meal-substituted-status-rollback.sql

begin;

alter table public.meal_day_status drop constraint if exists meal_day_status_status_check;
alter table public.meal_day_status
  add constraint meal_day_status_status_check check (status in ('eaten', 'not_eaten', 'other'));

-- What they ate instead. Only ever set alongside status 'other'.
alter table public.meal_day_status
  add column if not exists note text check (note is null or length(btrim(note)) between 1 and 500);

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
  -- The note belongs to the substitution and to nothing else: a note on "eaten"
  -- would be a second, quieter way of saying the plan was not followed.
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

    insert into public.eaten_meal_items(nutrition_log_id, meal_item_id, food_id, food_name, amount,
      calculated_calories, calculated_protein, calculated_carbohydrates, calculated_fat)
    select v_log_id, i.id, i.food_id, f.name, i.amount, i.calculated_calories, i.calculated_protein,
      i.calculated_carbohydrates, i.calculated_fat
    from public.meal_group_selections s
    join public.meal_items i on i.id = s.meal_item_id
    join public.foods f on f.id = i.food_id
    where s.client_id = auth.uid() and s.selection_date = p_date and i.meal_id = p_meal_id
    on conflict (nutrition_log_id, meal_item_id) where meal_item_id is not null
      do update set eaten_at = now();
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

  return v_log_id;
end $$;

-- The three-argument signature is what set_meal_eaten and every existing caller
-- use. Dropping it would break them mid-deploy, so it stays as a wrapper.
create or replace function public.set_meal_day_status(p_meal_id uuid, p_date date, p_status text)
returns uuid
language plpgsql security invoker set search_path=public as $$
begin
  return public.set_meal_day_status(p_meal_id, p_date, p_status, null);
end $$;

revoke all on function public.set_meal_day_status(uuid,date,text,text) from public;
revoke all on function public.set_meal_day_status(uuid,date,text,text) from anon;
grant execute on function public.set_meal_day_status(uuid,date,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
