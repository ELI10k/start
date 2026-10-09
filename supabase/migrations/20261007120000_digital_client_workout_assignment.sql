begin;

alter table public.workout_programs
  add column if not exists created_for_client_id uuid references public.profiles(id) on delete cascade;

alter table public.workout_programs drop constraint if exists workout_programs_check;
alter table public.workout_programs
  add constraint workout_programs_owner_check
  check (official or coach_id is not null or created_for_client_id is not null);

-- Service-role-only entry point for a client who bought the digital product and
-- has no coach relationship. It deliberately refuses medical-review profiles;
-- the server cannot turn a disclaimer into an individual clinical decision.
create or replace function public.assign_digital_intake_workout(
  p_client_id uuid,
  p_program jsonb,
  p_start_date date,
  p_location text,
  p_equipment text[]
)
returns text language plpgsql security invoker set search_path=public as $function$
declare d jsonb; x jsonb; s jsonb; assignment_id uuid;
begin
  if not exists(
    select 1 from public.profiles
    where id=p_client_id and role='client' and status='active'
  ) then raise exception 'active_client_required'; end if;
  if exists(
    select 1 from public.coach_client_relationships
    where client_id=p_client_id and status='active'
  ) then raise exception 'digital_client_required'; end if;
  if not exists(
    select 1 from public.client_profiles
    where user_id=p_client_id
      and coalesce(preferences->>'medical_review','') = 'no'
  ) then raise exception 'medical_clearance_required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_client_id::text,0));
  insert into public.workout_preferences(client_id,training_types,equipment,training_location,preferred_days)
  values(p_client_id,array[p_program->>'programType'],p_equipment,p_location,'{}')
  on conflict(client_id) do update set
    training_types=excluded.training_types,
    equipment=excluded.equipment,
    training_location=excluded.training_location;
  if exists(select 1 from public.workout_assignments where client_id=p_client_id and status='active') then return 'already_active'; end if;
  if exists(select 1 from public.workout_sessions where client_id=p_client_id and status='active') then return 'already_active'; end if;
  if not exists(select 1 from public.workout_programs where id=p_program->>'duplicatedFromId' and official and status='active') then raise exception 'template_required'; end if;

  insert into public.workout_programs(id,coach_id,created_for_client_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,status,official,duplicated_from_id)
  values(p_program->>'id',null,p_client_id,p_program->>'name',p_program->>'description',p_program->>'programType',p_program->>'difficulty',(p_program->>'trainingFrequency')::smallint,array(select jsonb_array_elements_text(p_program->'equipment')),p_program->>'sourceWorkbook','active',false,p_program->>'duplicatedFromId');
  for d in select * from jsonb_array_elements(p_program->'days') loop
    insert into public.workout_program_days(id,program_id,name,sort_order) values(d->>'id',p_program->>'id',d->>'name',(d->>'order')::smallint);
    for x in select * from jsonb_array_elements(d->'exercises') loop
      insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes)
      values(x->>'id',d->>'id',x->>'exerciseId',(x->>'order')::smallint,x->>'sets',x->>'reps',x->>'rest',x->>'notes');
      for s in select * from jsonb_array_elements(coalesce(x->'setPrescriptions','[]'::jsonb)) loop
        insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions)
        values(s->>'id',x->>'id',(s->>'order')::smallint,s->>'repetitions');
      end loop;
    end loop;
  end loop;
  insert into public.workout_assignments(client_id,program_id,assigned_by,start_date,weekly_frequency,status,coach_note)
  values(p_client_id,p_program->>'id',p_client_id,p_start_date,(p_program->>'trainingFrequency')::smallint,'active','תוכנית דיגיטלית שהותאמה אוטומטית לפי שאלון האפיון.') returning id into assignment_id;
  return assignment_id::text;
end $function$;

revoke all on function public.assign_digital_intake_workout(uuid,jsonb,date,text,text[]) from public,anon,authenticated;
grant execute on function public.assign_digital_intake_workout(uuid,jsonb,date,text,text[]) to service_role;

-- Dietary safety is data, not a guess made from a food's display name. Only
-- rows explicitly reviewed below (or reviewed later by an administrator) are
-- eligible for automatic menus.
alter table public.foods
  add column if not exists vegan boolean not null default false,
  add column if not exists vegetarian boolean not null default false,
  add column if not exists pescatarian boolean not null default false,
  add column if not exists contains_gluten boolean not null default false,
  add column if not exists contains_lactose boolean not null default false,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists dietary_metadata_verified boolean not null default false;
create index if not exists foods_verified_dietary_idx on public.foods(dietary_metadata_verified) where dietary_metadata_verified;

-- Small, explicit reviewed starter catalogue. Adding foods to automation is an
-- editorial operation: it must set every flag and metadata_verified=true.
update public.foods set vegan=true,vegetarian=true,pescatarian=true,contains_gluten=false,contains_lactose=false,allergens='{}',dietary_tags='{carbohydrate}',dietary_metadata_verified=true where id in ('121','122','124');
update public.foods set vegan=true,vegetarian=true,pescatarian=true,contains_gluten=false,contains_lactose=false,allergens='{}',dietary_tags='{protein,carbohydrate}',dietary_metadata_verified=true where id in ('131','135');
update public.foods set vegan=true,vegetarian=true,pescatarian=true,contains_gluten=false,contains_lactose=false,allergens='{soy}',dietary_tags='{protein,fat}',dietary_metadata_verified=true where id in ('206','207','211');
update public.foods set vegan=true,vegetarian=true,pescatarian=true,contains_gluten=false,contains_lactose=false,allergens='{}',dietary_tags='{fat}',dietary_metadata_verified=true where id in ('188','191');
update public.foods set vegan=false,vegetarian=true,pescatarian=true,contains_gluten=false,contains_lactose=false,allergens='{egg}',dietary_tags='{protein,fat}',dietary_metadata_verified=true where id in ('293','298');
update public.foods set vegan=false,vegetarian=true,pescatarian=true,contains_gluten=false,contains_lactose=true,allergens='{milk}',dietary_tags='{protein}',dietary_metadata_verified=true where id in ('1','29');
update public.foods set vegan=false,vegetarian=false,pescatarian=true,contains_gluten=false,contains_lactose=false,allergens='{fish}',dietary_tags='{protein,fat}',dietary_metadata_verified=true where id in ('127','282','283');
update public.foods set vegan=false,vegetarian=false,pescatarian=false,contains_gluten=false,contains_lactose=false,allergens='{}',dietary_tags='{protein}',dietary_metadata_verified=true where id in ('276','277');

alter table public.meal_plans alter column coach_id drop not null;
alter table public.meal_plans
  add column if not exists generated_for_client_id uuid references public.profiles(id) on delete cascade,
  add column if not exists generated_from_template_id uuid references public.meal_plans(id) on delete set null,
  add column if not exists generation_source text,
  add column if not exists personalization_rules_version text,
  add column if not exists digital_template_key text;
alter table public.meal_plans drop constraint if exists meal_plans_owner_check;
alter table public.meal_plans add constraint meal_plans_owner_check
  check (coach_id is not null or generated_for_client_id is not null or is_system_template);
create unique index if not exists meal_plans_one_digital_onboarding_per_client
  on public.meal_plans(generated_for_client_id,generation_source)
  where generation_source='digital_onboarding';
create unique index if not exists meal_plans_digital_template_key_idx
  on public.meal_plans(digital_template_key) where digital_template_key is not null and is_system_template;

insert into public.meal_plans(coach_id,title,description,status,is_system_template,digital_template_key)
values
  (null,'תבנית DIGITAL מאוזנת','תבנית מערכת מאושרת לחלוקת מאקרו מאוזנת. המזונות נבחרים רק מהקטלוג המתויג.','published',true,'balanced'),
  (null,'תבנית DIGITAL דלת פחמימה','תבנית מערכת מאושרת לחלוקה דלת פחמימה.','published',true,'low_carb'),
  (null,'תבנית DIGITAL קטוגנית','תבנית מערכת מאושרת לחלוקה קטוגנית ייעודית.','published',true,'keto'),
  (null,'תבנית DIGITAL מן הצומח','תבנית מערכת מאושרת לטבעונות, צמחונות ופסקטריאניות עם סינון נפרד.','published',true,'plant_based')
on conflict(digital_template_key) where digital_template_key is not null and is_system_template do nothing;

alter table public.client_profiles
  add column if not exists carbohydrate_target numeric(8,2) check(carbohydrate_target is null or carbohydrate_target>0),
  add column if not exists fat_target numeric(8,2) check(fat_target is null or fat_target>0),
  add column if not exists onboarding_generation_results jsonb not null default '{}'::jsonb;

create or replace function public.assign_digital_intake_meal_plan(
  p_client_id uuid,
  p_plan jsonb,
  p_rules_version text
)
returns uuid language plpgsql security invoker set search_path=public as $function$
declare
  v_plan_id uuid;
  v_template_id uuid;
  v_day jsonb; v_meal jsonb; v_group jsonb; v_item jsonb;
  v_meal_id uuid; v_group_id uuid; v_food public.foods;
begin
  perform pg_advisory_xact_lock(hashtextextended('digital-menu:'||p_client_id::text,0));
  select meal_plan_id into v_plan_id from public.client_meal_plan_assignments
    where client_id=p_client_id and status='active' limit 1;
  if v_plan_id is not null then return v_plan_id; end if;
  if not exists(select 1 from public.profiles where id=p_client_id and role='client' and status='active') then raise exception 'active_client_required'; end if;
  if exists(select 1 from public.coach_client_relationships where client_id=p_client_id and status='active') then raise exception 'digital_client_required'; end if;
  if jsonb_array_length(coalesce(p_plan->'days','[]'::jsonb))<>7 then raise exception 'seven_days_required'; end if;
  select id into v_template_id from public.meal_plans
    where is_system_template and status in ('published','active') and digital_template_key=p_plan->>'templateKey' limit 1;
  if v_template_id is null then raise exception 'approved_template_required'; end if;
  v_plan_id:=gen_random_uuid();
  insert into public.meal_plans(id,coach_id,title,description,status,calorie_target,protein_target,carbohydrate_target,fat_target,
    generated_for_client_id,generated_from_template_id,generation_source,personalization_rules_version)
  values(v_plan_id,null,trim(p_plan->>'title'),p_plan->>'description','active',(p_plan->>'calorieTarget')::numeric,
    (p_plan->>'proteinTarget')::numeric,(p_plan->>'carbohydrateTarget')::numeric,(p_plan->>'fatTarget')::numeric,
    p_client_id,v_template_id,'digital_onboarding',p_rules_version);
  for v_day in select * from jsonb_array_elements(p_plan->'days') loop
    for v_meal in select * from jsonb_array_elements(coalesce(v_day->'meals','[]'::jsonb)) loop
      insert into public.meals(meal_plan_id,day_index,title,meal_type,sort_order)
      values(v_plan_id,(v_day->>'dayIndex')::smallint,v_meal->>'title',v_meal->>'title',(v_meal->>'sortOrder')::smallint)
      returning id into v_meal_id;
      for v_group in select * from jsonb_array_elements(coalesce(v_meal->'groups','[]'::jsonb)) loop
        insert into public.meal_food_groups(meal_id,group_type,sort_order)
        values(v_meal_id,v_group->>'type',(v_group->>'sortOrder')::smallint) returning id into v_group_id;
        for v_item in select * from jsonb_array_elements(coalesce(v_group->'items','[]'::jsonb)) loop
          select * into v_food from public.foods where id=v_item->>'foodId' and dietary_metadata_verified;
          if not found then raise exception 'unverified_food'; end if;
          insert into public.meal_items(meal_id,group_id,food_id,amount,display_quantity,measurement_unit,amount_source,item_role,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
          values(v_meal_id,v_group_id,v_food.id,(v_item->>'amount')::numeric,(v_item->>'amount')::numeric,'g','auto',
            case when (v_item->>'sortOrder')::smallint=0 then 'primary' else 'alternative' end,
            round(v_food.calories*(v_item->>'amount')::numeric/100,2),round(coalesce(v_food.protein,0)*(v_item->>'amount')::numeric/100,2),
            round(coalesce(v_food.carbs,0)*(v_item->>'amount')::numeric/100,2),round(coalesce(v_food.fat,0)*(v_item->>'amount')::numeric/100,2),
            (v_item->>'sortOrder')::smallint);
        end loop;
      end loop;
    end loop;
  end loop;
  insert into public.client_meal_plan_assignments(meal_plan_id,client_id,assigned_by,status,assigned_from)
  values(v_plan_id,p_client_id,p_client_id,'active',current_date);
  return v_plan_id;
end $function$;
revoke all on function public.assign_digital_intake_meal_plan(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.assign_digital_intake_meal_plan(uuid,jsonb,text) to service_role;

grant select on public.foods,public.meal_plans,public.meals,public.meal_food_groups,public.meal_items,public.client_meal_plan_assignments to service_role;
grant insert,update on public.meal_plans,public.meals,public.meal_food_groups,public.meal_items,public.client_meal_plan_assignments to service_role;

notify pgrst, 'reload schema';

commit;
