-- START beta-test seed. Run manually in Supabase SQL Editor as postgres.
-- Safe scope: only the existing client/coach emails declared below and IDs prefixed beta-test-.
begin;

do $$
declare
  v_client uuid;
  v_coach uuid;
  v_assignment uuid;
  v_program text;
  v_existing_program_is_complete boolean := false;
  v_plan uuid := '70000000-0000-4000-8000-000000000101';
  v_day text;
  v_content uuid;
begin
  select id into v_client from auth.users where lower(email) = lower('elicohenyou@gmail.com');
  select id into v_coach from auth.users where lower(email) = lower('elicohenib@gmail.com');
  if v_client is null or v_coach is null then
    raise exception 'Expected test users were not found. Check elicohenyou@gmail.com and elicohenib@gmail.com.';
  end if;
  if not exists (select 1 from public.coach_client_relationships where coach_id=v_coach and client_id=v_client and status='active') then
    raise exception 'The active coach-client relationship is missing.';
  end if;
  select a.id,a.program_id into v_assignment,v_program from public.workout_assignments a where a.client_id=v_client and a.status='active' order by a.assigned_at desc limit 1;
  if v_assignment is not null then
    select count(*)=3 and bool_and(exercise_count>=5) into v_existing_program_is_complete
    from (select d.id,count(e.id) as exercise_count from public.workout_program_days d left join public.workout_program_exercises e on e.day_id=d.id where d.program_id=v_program group by d.id) days;
  end if;
  if not coalesce(v_existing_program_is_complete,false) then v_program := 'beta-test-program-v1'; end if;

  insert into public.workout_exercises(id,name,normalized_name,category,primary_muscle_group,equipment,difficulty,execution_notes,source_workbooks,status)
  values
    ('beta-test-exercise-01','לחיצת חזה במכונה','לחיצת חזה במכונה','כוח','חזה','מכונה','מתחיל','שליטה מלאה בטווח התנועה',array['Beta test'],'active'),
    ('beta-test-exercise-02','חתירה בישיבה','חתירה בישיבה','כוח','גב','כבל','מתחיל','לשמור על גב ניטרלי',array['Beta test'],'active'),
    ('beta-test-exercise-03','לחיצת כתפיים','לחיצת כתפיים','כוח','כתפיים','משקולות','מתחיל','ללא נעילת מרפקים',array['Beta test'],'active'),
    ('beta-test-exercise-04','פשיטת מרפקים בכבל','פשיטת מרפקים בכבל','כוח','יד אחורית','כבל','מתחיל','מרפקים קרובים לגוף',array['Beta test'],'active'),
    ('beta-test-exercise-05','כפיפת מרפקים','כפיפת מרפקים','כוח','יד קדמית','משקולות','מתחיל','תנועה מבוקרת',array['Beta test'],'active'),
    ('beta-test-exercise-06','סקוואט גביע','סקוואט גביע','כוח','רגליים','משקולת','מתחיל','ברכיים בקו אצבעות',array['Beta test'],'active'),
    ('beta-test-exercise-07','דדליפט רומני','דדליפט רומני','כוח','רגליים','משקולות','מתחיל','ציר ירך יציב',array['Beta test'],'active'),
    ('beta-test-exercise-08','לחיצת רגליים','לחיצת רגליים','כוח','רגליים','מכונה','מתחיל','טווח נוח ומבוקר',array['Beta test'],'active'),
    ('beta-test-exercise-09','כפיפת ברך במכונה','כפיפת ברך במכונה','כוח','רגליים','מכונה','מתחיל','עצירה קצרה בכיווץ',array['Beta test'],'active'),
    ('beta-test-exercise-10','הרמת תאומים','הרמת תאומים','כוח','תאומים','מכונה','מתחיל','טווח מלא',array['Beta test'],'active'),
    ('beta-test-exercise-11','פלאנק','פלאנק','ליבה','ליבה','משקל גוף','מתחיל','נשימה רציפה',array['Beta test'],'active'),
    ('beta-test-exercise-12','פול דאון','פול דאון','כוח','גב','כבל','מתחיל','להוריד מרפקים מטה',array['Beta test'],'active'),
    ('beta-test-exercise-13','שכיבות סמיכה מוגבהות','שכיבות סמיכה מוגבהות','כוח','חזה','משקל גוף','מתחיל','גוף בקו אחד',array['Beta test'],'active'),
    ('beta-test-exercise-14','לאנג׳ אחורי','לאנג׳ אחורי','כוח','רגליים','משקל גוף','מתחיל','צעדים יציבים',array['Beta test'],'active'),
    ('beta-test-exercise-15','הרחקת כתף לצדדים','הרחקת כתף לצדדים','כוח','כתפיים','משקולות','מתחיל','משקל קל ושליטה',array['Beta test'],'active')
  on conflict(id) do update set name=excluded.name, normalized_name=excluded.normalized_name, status='active', updated_at=now();

  insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,status,official)
  values ('beta-test-program-v1',v_coach,'תוכנית בטא · 3 אימונים','תוכנית בדיקה ל-30 ימים. לא לשימוש עם לקוחות אמיתיים.','Full body','מתחיל',3,array['משקולות','כבל','מכונה'],'Beta test seed','active',false)
  on conflict(id) do update set coach_id=excluded.coach_id,name=excluded.name,description=excluded.description,status='active',training_frequency=3,updated_at=now();

  insert into public.workout_program_days(id,program_id,name,sort_order)
  values ('beta-test-day-a','beta-test-program-v1','אימון A · פלג גוף עליון',0),('beta-test-day-b','beta-test-program-v1','אימון B · רגליים וליבה',1),('beta-test-day-c','beta-test-program-v1','אימון C · גוף מלא',2)
  on conflict(id) do update set name=excluded.name,sort_order=excluded.sort_order;

  insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes)
  select 'beta-test-px-'||d.day_key||'-'||lpad(e.ordinality::text,2,'0'),d.day_id,e.exercise_id,e.ordinality-1,'3','10–12','60–90 שניות','תיעוד בטא בלבד'
  from (values
    ('a','beta-test-day-a',array['beta-test-exercise-01','beta-test-exercise-02','beta-test-exercise-03','beta-test-exercise-04','beta-test-exercise-05']),
    ('b','beta-test-day-b',array['beta-test-exercise-06','beta-test-exercise-07','beta-test-exercise-08','beta-test-exercise-09','beta-test-exercise-10']),
    ('c','beta-test-day-c',array['beta-test-exercise-11','beta-test-exercise-12','beta-test-exercise-13','beta-test-exercise-14','beta-test-exercise-15'])
  ) as d(day_key,day_id,exercise_ids)
  cross join unnest(d.exercise_ids) with ordinality as e(exercise_id,ordinality)
  on conflict(id) do update set exercise_id=excluded.exercise_id,sets_text=excluded.sets_text,reps_text=excluded.reps_text,rest_text=excluded.rest_text,notes=excluded.notes;

  insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions)
  select 'beta-test-set-'||right(id,4)||'-'||s::text,id,s-1,'10–12' from public.workout_program_exercises cross join generate_series(1,3) s where id like 'beta-test-px-%'
  on conflict(id) do update set repetitions=excluded.repetitions;

  if not v_existing_program_is_complete then
    select id into v_assignment from public.workout_assignments where client_id=v_client and program_id='beta-test-program-v1' order by assigned_at desc limit 1;
    if v_assignment is null then
      insert into public.workout_assignments(client_id,program_id,assigned_by,start_date,weekly_frequency,coach_note,status)
      values(v_client,'beta-test-program-v1',v_coach,current_date-29,3,'תוכנית טסט להיסטוריה בלבד; השיוך הפעיל הקיים לא שונה','paused') returning id into v_assignment;
    end if;
  end if;

  insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions)
  select 'beta-test-prescription-'||md5(p.id||':'||x.n::text),p.id,x.n,'10–12'
  from public.workout_program_exercises p
  cross join generate_series(0,2) x(n)
  where p.day_id in (select id from public.workout_program_days where program_id=v_program)
    and not exists (
      select 1 from public.workout_set_prescriptions sp
      where sp.program_exercise_id=p.id and sp.sort_order=x.n
    )
  on conflict(id) do nothing;

  insert into public.workout_sessions(id,completion_id,client_id,assignment_id,program_id,day_id,status,started_at,completed_at,current_exercise_index,workout_note,perceived_difficulty,energy,duration_seconds,total_volume)
  select 'beta-test-session-'||n::text,'beta-test-completion-'||n::text,v_client,v_assignment,v_program,(select id from public.workout_program_days where program_id=v_program order by sort_order offset ((n-1)%3) limit 1),'completed',now()-(n*interval '3 days')-interval '75 minutes',now()-(n*interval '3 days'),5,'אימון טסט הושלם',3,4,2700,4500+n*120
  from generate_series(1,10) n
  on conflict(id) do update set completed_at=excluded.completed_at,status='completed',total_volume=excluded.total_volume;

  insert into public.workout_session_exercises(session_id,workout_exercise_id,exercise_id,completed,sort_order)
  select s.id,p.id,p.exercise_id,true,p.sort_order from public.workout_sessions s join public.workout_program_exercises p on p.day_id=s.day_id where s.id like 'beta-test-session-%'
  on conflict(session_id,workout_exercise_id) do update set completed=true;
  insert into public.workout_sets(session_id,workout_exercise_id,id,prescription_id,sort_order,weight_kg,repetitions,completed,completed_at)
  select s.id,p.id,'beta-test-workset-'||s.id||'-'||p.sort_order||'-'||x.n,sp.id,x.n-1,20+p.sort_order*2+x.n,10+x.n,true,s.completed_at
  from public.workout_sessions s
  join public.workout_program_exercises p on p.day_id=s.day_id
  cross join generate_series(1,3) x(n)
  join public.workout_set_prescriptions sp on sp.program_exercise_id=p.id and sp.sort_order=x.n-1
  where s.id like 'beta-test-session-%'
  on conflict(session_id,id) do update set prescription_id=excluded.prescription_id,completed=true,completed_at=excluded.completed_at,weight_kg=excluded.weight_kg,repetitions=excluded.repetitions;

  if exists (
    select 1
    from public.workout_sets ws
    left join public.workout_set_prescriptions sp on sp.id=ws.prescription_id
    where ws.id like 'beta-test-workset-%' and ws.prescription_id is not null and sp.id is null
  ) then
    raise exception 'Seed foreign-key validation failed: workout_sets references a missing prescription.';
  end if;
  if exists (
    select 1
    from public.workout_session_exercises se
    join public.workout_sessions s on s.id=se.session_id
    where s.id like 'beta-test-session-%'
      and 3 <> (select count(*) from public.workout_set_prescriptions sp where sp.program_exercise_id=se.workout_exercise_id and sp.sort_order between 0 and 2)
  ) then
    raise exception 'Seed foreign-key validation failed: a workout exercise is missing required prescriptions.';
  end if;

  insert into public.progress_entries(client_id,date,weight,waist,chest,hips,notes)
  select v_client,current_date-n,82.8-(n*0.045),90-(n*0.06),104-(n*0.03),101-(n*0.03),'נתון טסט' from generate_series(0,29) n
  on conflict(client_id,date) do update set weight=excluded.weight,waist=excluded.waist,chest=excluded.chest,hips=excluded.hips,notes=excluded.notes;
  insert into public.check_ins(client_id,submitted_at,adherence,hunger,energy,sleep,training,notes,status)
  select v_client,now()-(n*interval '7 days'),4,3,4,4,true,'צ׳ק-אין טסט שבועי','submitted'::public.check_in_status
  from generate_series(1,4) n
  where not exists (
    select 1 from public.check_ins c
    where c.client_id=v_client
      and c.notes='צ׳ק-אין טסט שבועי'
      and (c.submitted_at at time zone 'Asia/Jerusalem')::date=(current_date-n)
  );

  insert into public.meal_plans(id,coach_id,title,description,status,calorie_target,protein_target,carbohydrate_target,fat_target)
  values(v_plan,v_coach,'תפריט טסט שבועי','תפריט בדיקה ללקוח הטסט בלבד','active',2200,160,220,70)
  on conflict(id) do update set status='active',title=excluded.title,updated_at=now();
  insert into public.client_meal_plan_assignments(meal_plan_id,client_id,assigned_by,status,assigned_from)
  select v_plan,v_client,v_coach,'active',current_date-29 where not exists(select 1 from public.client_meal_plan_assignments where client_id=v_client and status='active');
  insert into public.meals(id,meal_plan_id,day_index,title,sort_order)
  values ('71000000-0000-4000-8000-000000000101',v_plan,0,'ארוחת בוקר',0),('71000000-0000-4000-8000-000000000102',v_plan,0,'ארוחת צהריים',1),('71000000-0000-4000-8000-000000000103',v_plan,0,'ארוחת ערב',2)
  on conflict(id) do update set title=excluded.title;
  insert into public.meal_items(id,meal_id,food_id,amount,measurement_unit,calculated_calories,calculated_protein,calculated_carbohydrates,calculated_fat,sort_order)
  select '72000000-0000-4000-8000-00000000010'||row_number() over(),m.id,f.id,100,'g',f.calories,coalesce(f.protein,0),coalesce(f.carbs,0),coalesce(f.fat,0),0 from (select id from public.meals where id in ('71000000-0000-4000-8000-000000000101','71000000-0000-4000-8000-000000000102','71000000-0000-4000-8000-000000000103')) m cross join lateral (select id,calories,protein,carbs,fat from public.foods order by id limit 1) f
  on conflict(id) do nothing;
  insert into public.meal_completion_logs(client_id,meal_id,completion_date,completed_at,status)
  select v_client,m.id,current_date-n,(current_date-n)+time '12:00','completed'::public.completion_status from public.meals m cross join generate_series(0,29) n where m.meal_plan_id=v_plan
  on conflict(client_id,meal_id,completion_date) do update set completed_at=excluded.completed_at,status=excluded.status;

  insert into public.notifications(recipient_id,actor_id,category,type,title,body,href,dedupe_key)
  values (v_client,v_coach,'nutrition','meal_plan_assigned','תפריט הטסט מוכן','תפריט שבועי פעיל לצורך בדיקה.','/nutrition','beta-test-menu'),(v_client,v_coach,'workouts','workout_assigned','תוכנית אימונים פעילה','שלושה אימונים בשבוע זמינים עבורך.','/workouts','beta-test-workout'),(v_client,v_coach,'check_ins','check_in_reviewed','נבדק הצ׳ק-אין האחרון','המאמן השאיר משוב לצורך בדיקה.','/check-in/history','beta-test-checkin')
  on conflict(recipient_id,dedupe_key) where dedupe_key is not null do update set read_at=null,created_at=now();
  select id into v_content from public.content_items where status='published' order by created_at limit 1;
  if v_content is not null then insert into public.content_favorites(client_id,content_item_id) values(v_client,v_content) on conflict do nothing; end if;
  insert into public.free_menu_days(client_id,coach_id,enabled_by,menu_date,calorie_target,protein_target,status) values(v_client,v_coach,v_coach,current_date-2,2200,160,'active') on conflict(client_id,menu_date) do update set status='active';
  insert into public.free_menu_entries(free_menu_day_id,name,quantity,unit,meal_label,eaten_at,calories,protein,carbohydrates,fat,has_nutrition)
  select id,'ארוחת סוף שבוע',250,'g','ערב',now()-interval '2 days',620,32,70,22,true from public.free_menu_days where client_id=v_client and menu_date=current_date-2 and not exists(select 1 from public.free_menu_entries e where e.free_menu_day_id=free_menu_days.id and e.name='ארוחת סוף שבוע');
end $$;

commit;
