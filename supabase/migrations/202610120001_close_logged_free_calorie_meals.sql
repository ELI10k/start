-- A food recorded inside a free-calorie frame is the answer to that frame, not
-- an addition beside an unanswered meal. New writes mark it eaten in the
-- server action; this backfills rows recorded before that correction so the
-- live day no longer shows consumed calories and an open allowance together.
begin;

insert into public.meal_day_status(client_id, meal_id, status_date, status, note)
select distinct log.client_id, log.meal_id, log.log_date, 'eaten', null
from public.client_food_log log
join public.meals meal on meal.id = log.meal_id
where log.meal_id is not null
  and meal.free_calorie_target is not null
  and not exists (
    select 1
    from public.meal_day_status mark
    where mark.client_id = log.client_id
      and mark.meal_id = log.meal_id
      and mark.status_date = log.log_date
  )
on conflict (client_id, meal_id, status_date) do nothing;

commit;
