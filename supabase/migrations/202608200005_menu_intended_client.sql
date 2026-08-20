-- A menu remembers who it is for, even before it is served.
--
-- meal_plans has never held a client. A plan's client existed only as an ACTIVE
-- assignment, and save_meal_plan_tree only writes an assignment when the status
-- is 'active' - so a draft made for someone stored the client nowhere and came
-- back unassigned.
--
-- "שכפול ללקוח" is exactly that shape: it copies a menu onto a client, scales
-- the portions to their calorie target, and deliberately leaves the copy a
-- draft so a machine-scaled menu never reaches a person unreviewed. The client
-- was then silently dropped, and the coach opened the copy to find "ללא שיוך",
-- no goal and no macros - all of which the editor derives from the client. It
-- had to be picked by hand to get back what had already been chosen.
--
-- intended_client_id records who the plan is for. It is independent of whether
-- anyone is eating it today, which stays the assignment's job: a plan can be a
-- draft for Dana, published for Dana, or actively served to Dana, and only the
-- last is an assignment.
--
-- Impact: one nullable column, one function body, and a backfill from the
-- assignments that already exist. RLS is unchanged - a plan is coach-owned.
-- Rollback: supabase/seeds/menu-intended-client-rollback.sql

begin;

alter table public.meal_plans
  add column if not exists intended_client_id uuid references public.profiles(id) on delete set null;

create index if not exists meal_plans_intended_client_idx
  on public.meal_plans(intended_client_id) where intended_client_id is not null;

-- Plans already assigned know their client; carry it across so nothing that
-- exists today reads as unassigned after this runs.
update public.meal_plans p
set intended_client_id = a.client_id
from public.client_meal_plan_assignments a
where a.meal_plan_id = p.id
  and a.status = 'active'
  and p.intended_client_id is null;

create or replace function public.save_meal_plan_tree(p_plan jsonb) returns uuid
language plpgsql security invoker set search_path=public as $function$
declare
  v_plan_id uuid:=coalesce(nullif(p_plan->>'id','')::uuid,gen_random_uuid());
  v_client_id uuid:=nullif(p_plan->>'clientId','')::uuid;
  v_status public.menu_status:=coalesce(nullif(p_plan->>'status','')::public.menu_status,'draft');
  v_day jsonb; v_meal jsonb; v_group jsonb; v_item jsonb;
  v_meal_id uuid; v_group_id uuid; v_food public.foods;
  v_title text; v_role text; v_unit text;
begin
  if public.current_role()<>'coach' then raise exception 'coach_required'; end if;
  if length(trim(coalesce(p_plan->>'title','')))=0 then raise exception 'title_required'; end if;
  if v_client_id is not null and not public.is_coach_for(v_client_id) then raise exception 'client_not_assigned'; end if;
  if v_status='active' and v_client_id is null then raise exception 'active_menu_requires_client'; end if;

  insert into public.meal_plans(
    id,coach_id,title,description,status,intended_client_id,calorie_target,protein_target,carbohydrate_target,fat_target,
    protein_target_source,carbohydrate_target_source,fat_target_source
  )
  values(
    v_plan_id,auth.uid(),trim(p_plan->>'title'),nullif(p_plan->>'description',''),v_status,v_client_id,
    nullif(p_plan->>'calorieTarget','')::numeric,nullif(p_plan->>'proteinTarget','')::numeric,
    nullif(p_plan->>'carbohydrateTarget','')::numeric,nullif(p_plan->>'fatTarget','')::numeric,
    case when p_plan->>'proteinTargetSource'='auto' then 'auto' else 'manual' end,
    case when p_plan->>'carbohydrateTargetSource'='auto' then 'auto' else 'manual' end,
    case when p_plan->>'fatTargetSource'='auto' then 'auto' else 'manual' end
  )
  on conflict(id) do update set
    title=excluded.title,description=excluded.description,status=excluded.status,
    intended_client_id=excluded.intended_client_id,
    calorie_target=excluded.calorie_target,protein_target=excluded.protein_target,
    carbohydrate_target=excluded.carbohydrate_target,fat_target=excluded.fat_target,
    protein_target_source=excluded.protein_target_source,
    carbohydrate_target_source=excluded.carbohydrate_target_source,
    fat_target_source=excluded.fat_target_source
  where public.meal_plans.coach_id=auth.uid();
  if not found then raise exception 'meal_plan_not_owned'; end if;

  delete from public.meals where meal_plan_id=v_plan_id;
  for v_day in select * from jsonb_array_elements(coalesce(p_plan->'days','[]'::jsonb)) loop
    for v_meal in select * from jsonb_array_elements(coalesce(v_day->'meals','[]'::jsonb)) loop
      v_title:=v_meal->>'title';
      if v_title not in ('ארוחת בוקר','ארוחת ביניים 1','ארוחת צהריים','ארוחת ביניים 2','ארוחת ערב','קלוריות חופשיות')
        then raise exception 'invalid_meal_type';
      end if;
      insert into public.meals(meal_plan_id,day_index,title,meal_type,notes,free_calorie_target,sort_order)
      values(
        v_plan_id,coalesce((v_day->>'dayIndex')::smallint,0),v_title,v_title,nullif(v_meal->>'notes',''),
        case when v_title='קלוריות חופשיות' then nullif(v_meal->>'freeCalorieTarget','')::numeric end,
        coalesce((v_meal->>'sortOrder')::smallint,0)
      ) returning id into v_meal_id;
      if v_title<>'קלוריות חופשיות' then
        for v_group in select * from jsonb_array_elements(coalesce(v_meal->'groups','[]'::jsonb)) loop
          if v_group->>'type' not in ('protein','carbohydrate','fat','vegetables') then raise exception 'invalid_group_type'; end if;
          insert into public.meal_food_groups(meal_id,group_type,sort_order)
          values(v_meal_id,v_group->>'type',coalesce((v_group->>'sortOrder')::smallint,0))
          returning id into v_group_id;
          for v_item in select * from jsonb_array_elements(coalesce(v_group->'items','[]'::jsonb)) loop
            select * into v_food from public.foods where id=v_item->>'foodId';
            if not found then raise exception 'unknown_food:%',v_item->>'foodId'; end if;
            if (v_item->>'amount')::numeric<=0 then raise exception 'invalid_amount'; end if;
            v_role:=case when v_item->>'itemRole'='primary' then 'primary' else 'alternative' end;
            -- The unit the coach actually wrote, kept as written. It used to be
            -- collapsed to 'גרם' unless it was the literal word 'יחידות', so a
            -- pita, a slice or an egg white all reached the client labelled
            -- "גרם" beside a number that counted units - "10 גרם" for ten egg
            -- whites. Amount stays in grams; this is only how it is said.
            v_unit:=coalesce(nullif(trim(coalesce(v_item->>'measurementUnit','')),''),'גרם');
            if length(v_unit)>24 then raise exception 'measurement_unit_too_long'; end if;
            insert into public.meal_items(
              meal_id,group_id,food_id,amount,display_quantity,measurement_unit,amount_source,item_role,note,
              calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order
            )
            values(
              v_meal_id,v_group_id,v_food.id,(v_item->>'amount')::numeric,
              coalesce(nullif(v_item->>'displayQuantity','')::numeric,(v_item->>'amount')::numeric),
              v_unit,case when v_item->>'amountSource'='auto' then 'auto' else 'manual' end,v_role,nullif(trim(coalesce(v_item->>'note','')),''),
              round(v_food.calories*(v_item->>'amount')::numeric/100,2),
              round(coalesce(v_food.protein,0)*(v_item->>'amount')::numeric/100,2),
              round(coalesce(v_food.carbs,0)*(v_item->>'amount')::numeric/100,2),
              round(coalesce(v_food.fat,0)*(v_item->>'amount')::numeric/100,2),
              coalesce((v_item->>'sortOrder')::smallint,0)
            );
          end loop;
        end loop;
      end if;
    end loop;
  end loop;

  update public.client_meal_plan_assignments
    set status='ended',assigned_until=greatest(assigned_from,current_date),updated_at=now()
    where meal_plan_id=v_plan_id and status='active' and (v_status<>'active' or client_id<>v_client_id);
  if v_status='active' then
    update public.meal_plans p set status='published'
      from public.client_meal_plan_assignments a
      where a.meal_plan_id=p.id and a.client_id=v_client_id and a.status='active' and p.id<>v_plan_id;
    update public.client_meal_plan_assignments
      set status='ended',assigned_until=greatest(assigned_from,current_date),updated_at=now()
      where client_id=v_client_id and status='active' and meal_plan_id<>v_plan_id;
    if exists(
      select 1 from public.client_meal_plan_assignments
      where client_id=v_client_id and meal_plan_id=v_plan_id and status='active'
    ) then
      update public.client_meal_plan_assignments
        set assigned_by=auth.uid(),assigned_from=coalesce(nullif(p_plan->>'activeFrom','')::date,current_date),
          assigned_until=nullif(p_plan->>'activeUntil','')::date,updated_at=now()
        where client_id=v_client_id and meal_plan_id=v_plan_id and status='active';
    else
      insert into public.client_meal_plan_assignments(meal_plan_id,client_id,assigned_by,assigned_from,assigned_until)
      values(
        v_plan_id,v_client_id,auth.uid(),coalesce(nullif(p_plan->>'activeFrom','')::date,current_date),
        nullif(p_plan->>'activeUntil','')::date
      );
    end if;
  end if;
  return v_plan_id;
end $function$;

notify pgrst, 'reload schema';
commit;
