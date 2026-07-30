begin;

insert into public.meal_food_groups(meal_id,group_type,sort_order)
select distinct i.meal_id,
  case
    when i.calculated_carbohydrates>i.calculated_protein and i.calculated_carbohydrates>=i.calculated_fat then 'carbohydrate'
    when i.calculated_fat>i.calculated_protein and i.calculated_fat>i.calculated_carbohydrates then 'fat'
    else 'protein'
  end,
  case
    when i.calculated_carbohydrates>i.calculated_protein and i.calculated_carbohydrates>=i.calculated_fat then 1
    when i.calculated_fat>i.calculated_protein and i.calculated_fat>i.calculated_carbohydrates then 2
    else 0
  end
from public.meal_items i
join public.meals m on m.id=i.meal_id
join public.meal_plans p on p.id=m.meal_plan_id
where not p.is_system_template
on conflict(meal_id,group_type) do nothing;

update public.meal_items i set group_id=g.id
from public.meal_food_groups g
join public.meals m on m.id=g.meal_id
join public.meal_plans p on p.id=m.meal_plan_id
where i.meal_id=g.meal_id and not p.is_system_template
and g.group_type=case
  when i.calculated_carbohydrates>i.calculated_protein and i.calculated_carbohydrates>=i.calculated_fat then 'carbohydrate'
  when i.calculated_fat>i.calculated_protein and i.calculated_fat>i.calculated_carbohydrates then 'fat'
  else 'protein'
end;

delete from public.meal_food_groups g
where not exists(select 1 from public.meal_items i where i.group_id=g.id);

commit;
