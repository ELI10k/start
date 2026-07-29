-- Removes only rows created by beta-test-client.sql. Run manually in Supabase SQL Editor.
begin;
do $$ declare v_client uuid; begin
  select id into v_client from auth.users where lower(email)=lower('elicohenyou@gmail.com');
  if v_client is null then raise exception 'Test client not found.'; end if;
  delete from public.notifications where recipient_id=v_client and dedupe_key like 'beta-test-%';
  delete from public.workout_sessions where client_id=v_client and id like 'beta-test-session-%';
  delete from public.workout_assignments where client_id=v_client and program_id='beta-test-program-v1';
  delete from public.workout_programs where id='beta-test-program-v1';
  delete from public.workout_exercises where id like 'beta-test-exercise-%';
  delete from public.progress_entries where client_id=v_client and notes='נתון טסט';
  delete from public.check_ins where client_id=v_client and notes='צ׳ק-אין טסט שבועי';
  delete from public.meal_completion_logs where client_id=v_client and meal_id::text like '71000000-0000-4000-8000-00000000010%';
  delete from public.client_meal_plan_assignments where client_id=v_client and meal_plan_id='70000000-0000-4000-8000-000000000101';
  delete from public.meal_plans where id='70000000-0000-4000-8000-000000000101';
  delete from public.free_menu_days where client_id=v_client and menu_date=current_date-2;
end $$;
commit;
