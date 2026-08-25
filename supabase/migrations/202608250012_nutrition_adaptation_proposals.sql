-- The menu answers back.
--
-- The workout side has had this since 202608240005: a closed cycle produces a
-- coach-only draft, the coach approves it, and the client's programme moves. The
-- nutrition side has been collecting far more signal than the workout side ever
-- did - every portion the client corrected, every meal they refused, every
-- weigh-in - and doing nothing with any of it. A client who has halved the
-- carbohydrate at dinner nine days out of fourteen has said so nine times, and
-- tomorrow they are handed the menu written a month ago.
--
-- Same shape, same guarantees. A proposal is a draft. Nothing reaches a client
-- until a coach approves it, the coach can edit the number first, and rejecting
-- one is a normal outcome that is recorded rather than hidden.
--
-- What approval actually does is deliberately small, and is arithmetic on values
-- that already exist rather than anything invented:
--
--   * a portion proposal scales every row in that one food group by the ratio
--     between the new quantity and the old. The group's alternatives were
--     written to be equivalent to its primary, so scaling all of them together
--     is what keeps them equivalent. `amount` (grams) and the four calculated
--     macro columns move with it; the food itself, its unit and the coach's note
--     do not.
--   * a calorie-target proposal writes one number on the plan.
--   * a missed-meal proposal cannot be approved at all. It carries no change -
--     it is the engine saying "this meal is not happening" and handing the
--     question to a person. Only 'acknowledge' closes it.
--
-- Impact: one new table, one function. Nothing existing is altered, and no
-- existing row changes meaning. The generator writes nothing until a client has
-- at least six observed days, so an empty week produces an empty table.
--
-- Rollback: drop function public.review_nutrition_proposal(uuid,text,numeric,text);
--           drop table public.nutrition_adaptation_proposals;
--           and remove the generator call from /api/cron/daily-coach.

begin;

create table if not exists public.nutrition_adaptation_proposals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  -- The fortnight the evidence was read from. Part of the identity, so a second
  -- run on the same day updates rather than duplicates.
  window_start date not null,
  window_end date not null,
  kind text not null check (kind in ('portion','calorie_target','meal_missed')),
  -- Set on portion proposals; null on the other two.
  meal_id uuid references public.meals(id) on delete cascade,
  group_id uuid references public.meal_food_groups(id) on delete cascade,
  title text not null,
  -- What was, what is proposed, and the unit both are counted in.
  current_value numeric(10,2),
  proposed_value numeric(10,2),
  unit text,
  -- The numbers behind it, in the product's own words. Never a bare verdict.
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','acknowledged')),
  coach_note text,
  -- What the coach actually applied, which may not be what was proposed.
  applied_value numeric(10,2),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- group_id is null on the two plan-wide kinds, and null is not equal to null
  -- in a unique constraint - so a second run would write a second calorie-target
  -- row every evening. A stored column carries the coalesce instead, which also
  -- keeps the constraint on plain columns: PostgREST's on_conflict can name
  -- those and cannot name an expression index.
  group_key uuid not null generated always as
    (coalesce(group_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  unique (client_id, window_start, kind, group_key)
);

create index if not exists nutrition_proposals_coach_status_idx
  on public.nutrition_adaptation_proposals(coach_id, status, created_at desc);

alter table public.nutrition_adaptation_proposals enable row level security;

-- Coach-only, and only for their own clients. A proposal is a draft about a
-- person; the person does not read the draft.
drop policy if exists nutrition_proposals_coach_read on public.nutrition_adaptation_proposals;
create policy nutrition_proposals_coach_read on public.nutrition_adaptation_proposals
  for select to authenticated
  using (coach_id = (select auth.uid()) and public.is_coach_for(client_id));

revoke all on public.nutrition_adaptation_proposals from anon, authenticated;
grant select on public.nutrition_adaptation_proposals to authenticated;

create or replace function public.review_nutrition_proposal(
  p_id uuid,
  p_decision text,
  p_value numeric default null,
  p_note text default ''
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v public.nutrition_adaptation_proposals%rowtype;
  v_applied numeric;
  v_ratio numeric;
begin
  select * into v from public.nutrition_adaptation_proposals where id = p_id for update;
  if v.id is null
     or v.status <> 'pending'
     or public.current_role() <> 'coach'
     or v.coach_id <> auth.uid()
     or not public.is_coach_for(v.client_id) then
    raise exception 'not_authorized';
  end if;

  if p_decision = 'reject' then
    update public.nutrition_adaptation_proposals
      set status = 'rejected', coach_note = nullif(trim(p_note), ''), reviewed_at = now()
      where id = p_id;
    return;
  end if;

  -- A missed meal has nothing to apply. Acknowledging it is how it leaves the
  -- list, and it is the only decision other than reject that it accepts.
  if v.kind = 'meal_missed' then
    if p_decision <> 'acknowledge' then raise exception 'invalid_decision'; end if;
    update public.nutrition_adaptation_proposals
      set status = 'acknowledged', coach_note = nullif(trim(p_note), ''), reviewed_at = now()
      where id = p_id;
    return;
  end if;

  if p_decision <> 'approve' then raise exception 'invalid_decision'; end if;

  -- The coach may approve a different number than the one proposed. Absent, the
  -- proposal's own figure stands.
  v_applied := coalesce(p_value, v.proposed_value);
  if v_applied is null or v_applied <= 0 then raise exception 'invalid_value'; end if;

  if v.kind = 'calorie_target' then
    update public.meal_plans
      set calorie_target = round(v_applied), updated_at = now()
      where id = v.meal_plan_id and coach_id = auth.uid();
    if not found then raise exception 'not_authorized'; end if;

  elsif v.kind = 'portion' then
    if v.group_id is null or v.current_value is null or v.current_value <= 0 then
      raise exception 'invalid_value';
    end if;
    v_ratio := v_applied / v.current_value;
    -- Every row in the group moves together: the alternatives were written to be
    -- equivalent to the primary, and scaling one without the others is what
    -- would make them disagree.
    update public.meal_items i
      set display_quantity = round(i.display_quantity * v_ratio, 2),
          amount = round(i.amount * v_ratio, 2),
          calculated_calories = round(i.calculated_calories * v_ratio, 2),
          calculated_protein = round(i.calculated_protein * v_ratio, 2),
          calculated_carbohydrates = round(i.calculated_carbohydrates * v_ratio, 2),
          calculated_fat = round(i.calculated_fat * v_ratio, 2)
      from public.meals m
      join public.meal_plans p on p.id = m.meal_plan_id
      where i.group_id = v.group_id
        and m.id = i.meal_id
        and p.id = v.meal_plan_id
        and p.coach_id = auth.uid();
    if not found then raise exception 'not_authorized'; end if;
  end if;

  update public.nutrition_adaptation_proposals
    set status = 'approved',
        applied_value = v_applied,
        coach_note = nullif(trim(p_note), ''),
        reviewed_at = now()
    where id = p_id;
end $$;

revoke all on function public.review_nutrition_proposal(uuid, text, numeric, text) from public, anon;
grant execute on function public.review_nutrition_proposal(uuid, text, numeric, text) to authenticated;

notify pgrst,'reload schema';

commit;
