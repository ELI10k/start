begin;

update public.meals set title=meal_type
where meal_plan_id is not null
  and meal_type in ('ארוחת בוקר','ארוחת ביניים 1','ארוחת צהריים','ארוחת ביניים 2','ארוחת ערב','קלוריות חופשיות')
  and title is distinct from meal_type;

commit;
