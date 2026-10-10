-- Free-calorie meals may also carry coach-prescribed foods and alternatives.
-- Keep the existing save implementation intact, then persist the groups it
-- intentionally skipped before this feature existed.
begin;

alter function public.save_meal_plan_tree(jsonb)
  rename to save_meal_plan_tree_without_free_foods;

create or replace function public.save_meal_plan_tree(p_plan jsonb) returns uuid
language plpgsql security invoker set search_path=public as $function$
declare
  v_plan_id uuid;
  v_day jsonb; v_meal jsonb; v_group jsonb; v_item jsonb;
  v_meal_id uuid; v_group_id uuid; v_food public.foods;
  v_role text; v_unit text;
begin
  v_plan_id := public.save_meal_plan_tree_without_free_foods(p_plan);
  for v_day in select * from jsonb_array_elements(coalesce(p_plan->'days','[]'::jsonb)) loop
    for v_meal in select * from jsonb_array_elements(coalesce(v_day->'meals','[]'::jsonb)) loop
      continue when v_meal->>'title' <> 'קלוריות חופשיות';
      select id into strict v_meal_id from public.meals
      where meal_plan_id=v_plan_id
        and day_index=coalesce((v_day->>'dayIndex')::smallint,0)
        and title='קלוריות חופשיות'
        and sort_order=coalesce((v_meal->>'sortOrder')::smallint,0);
      for v_group in select * from jsonb_array_elements(coalesce(v_meal->'groups','[]'::jsonb)) loop
        if v_group->>'type' not in ('protein','carbohydrate','fat','vegetables') then raise exception 'invalid_group_type'; end if;
        insert into public.meal_food_groups(meal_id,group_type,sort_order)
        values(v_meal_id,v_group->>'type',coalesce((v_group->>'sortOrder')::smallint,0)) returning id into v_group_id;
        for v_item in select * from jsonb_array_elements(coalesce(v_group->'items','[]'::jsonb)) loop
          select * into v_food from public.foods where id=v_item->>'foodId';
          if not found then raise exception 'unknown_food:%',v_item->>'foodId'; end if;
          if (v_item->>'amount')::numeric<=0 then raise exception 'invalid_amount'; end if;
          v_role:=case when v_item->>'itemRole'='primary' then 'primary' else 'alternative' end;
          v_unit:=case when v_item->>'measurementUnit'='יחידות' then 'יחידות' else 'גרם' end;
          insert into public.meal_items(
            meal_id,group_id,food_id,amount,display_quantity,measurement_unit,amount_source,item_role,note,
            calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order
          ) values(
            v_meal_id,v_group_id,v_food.id,(v_item->>'amount')::numeric,
            coalesce(nullif(v_item->>'displayQuantity','')::numeric,(v_item->>'amount')::numeric),
            v_unit,case when v_item->>'amountSource'='auto' then 'auto' else 'manual' end,v_role,
            nullif(trim(coalesce(v_item->>'note','')),''),
            round(v_food.calories*(v_item->>'amount')::numeric/100,2),
            round(coalesce(v_food.protein,0)*(v_item->>'amount')::numeric/100,2),
            round(coalesce(v_food.carbs,0)*(v_item->>'amount')::numeric/100,2),
            round(coalesce(v_food.fat,0)*(v_item->>'amount')::numeric/100,2),
            coalesce((v_item->>'sortOrder')::smallint,0)
          );
        end loop;
      end loop;
    end loop;
  end loop;
  return v_plan_id;
end $function$;

commit;
