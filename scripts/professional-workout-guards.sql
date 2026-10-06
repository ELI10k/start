-- Keep professional recovery rules on the server as well as in the UI.
create or replace function public.professional_workout_slots(p_frequency integer,p_fbw boolean,p_preferred smallint[])
returns smallint[] language plpgsql immutable set search_path=public as $function$
declare slots smallint[]; i integer;
begin
 if p_fbw and p_frequency>3 then return '{}'; end if;
 select array_agg(distinct d order by d) into slots from unnest(p_preferred) d where d between 0 and 6;
 if cardinality(slots)=p_frequency then
  if not p_fbw and p_frequency>3 then return slots; end if;
  for i in 1..cardinality(slots) loop
   if (case when i=cardinality(slots) then slots[1]+7 else slots[i+1] end)-slots[i]<2 then slots=null; exit; end if;
  end loop;
  if slots is not null then return slots; end if;
 end if;
 return case p_frequency when 1 then array[0] when 2 then array[0,3] when 3 then array[0,2,4] when 4 then array[0,1,3,4] when 5 then array[0,1,2,4,5] when 6 then array[0,1,2,3,4,5] else '{}'::integer[] end::smallint[];
end $function$;
revoke all on function public.professional_workout_slots(integer,boolean,smallint[]) from public,anon;
grant execute on function public.professional_workout_slots(integer,boolean,smallint[]) to authenticated,service_role;

create or replace function public.validate_professional_workout_start()
returns trigger language plpgsql security invoker set search_path=public as $function$
declare p public.workout_programs%rowtype; a public.workout_assignments%rowtype;
 latest public.workout_sessions%rowtype; today date := timezone('Asia/Jerusalem',now())::date;
 week_start date; slots smallint[]; preferred smallint[]; quota integer; answered integer; skipped integer;
begin
 if new.status<>'active' then return new; end if;
 -- Autosave/resume must remain available, including on a subsequent day.
 if exists(select 1 from public.workout_sessions where id=new.id and status='active' and client_id=new.client_id and assignment_id=new.assignment_id and program_id=new.program_id and day_id=new.day_id) then return new; end if;
 select * into p from public.workout_programs where id=new.program_id;
 if p.source_workbook !~ '^LIFE FIT — מקצועי v[0-9]+' then return new; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.client_id::text,0));
 select * into a from public.workout_assignments where id=new.assignment_id and client_id=new.client_id and program_id=new.program_id and status='active';
 if not found or today<a.start_date or (a.end_date is not null and today>a.end_date) then raise exception 'assignment_not_active'; end if;
 select preferred_days into preferred from public.workout_preferences where client_id=new.client_id;
 slots=public.professional_workout_slots(a.weekly_frequency,p.program_type='FBW',preferred);
 if cardinality(slots)=0 or (p.program_type='A-B' and a.weekly_frequency>4) then raise exception 'workout_frequency_requires_review'; end if;
 week_start=today-extract(dow from today)::integer;
 select count(*) into quota from unnest(slots) d where week_start+d>=a.start_date;
 select count(*) into answered from public.workout_sessions where assignment_id=a.id and client_id=new.client_id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date between week_start and today;
 select count(*) into skipped from public.workout_schedule_changes where assignment_id=a.id and status='skipped' and original_date between week_start and today;
 if answered+skipped>=quota then raise exception 'workout_week_complete'; end if;
 select * into latest from public.workout_sessions where client_id=new.client_id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date<=today order by completed_at desc limit 1;
 if found and today<(latest.completed_at at time zone 'Asia/Jerusalem')::date+(case when p.program_type='FBW' or a.weekly_frequency<=3 or (latest.program_id=new.program_id and latest.day_id=new.day_id) then 2 else 1 end) then raise exception 'workout_recovery_required'; end if;
 return new;
end $function$;
revoke all on function public.validate_professional_workout_start() from public,anon,authenticated;
create or replace trigger validate_professional_workout_start before insert or update on public.workout_sessions for each row execute function public.validate_professional_workout_start();

-- Reminder dates follow the same Sunday-based, spaced schedule. Legacy plans
-- retain their original behaviour. Suppress reminders during actual recovery.
create or replace function public.workout_is_planned_on(p_assignment public.workout_assignments,p_date date)
returns boolean language plpgsql stable security definer set search_path=public as $function$
declare preferred smallint[]; p public.workout_programs%rowtype; latest public.workout_sessions%rowtype; slots smallint[]; answered integer; skipped integer; quota integer; week_start date;
begin
 if p_assignment.status<>'active' or p_date<p_assignment.start_date or (p_assignment.end_date is not null and p_date>p_assignment.end_date) then return false; end if;
 select preferred_days into preferred from public.workout_preferences where client_id=p_assignment.client_id;
 select * into p from public.workout_programs where id=p_assignment.program_id;
 if p.source_workbook ~ '^LIFE FIT — מקצועי v[0-9]+' then
  slots=public.professional_workout_slots(p_assignment.weekly_frequency,p.program_type='FBW',preferred);
  week_start=p_date-extract(dow from p_date)::integer;
  select count(*) into quota from unnest(slots) d where week_start+d>=p_assignment.start_date;
  select count(*) into answered from public.workout_sessions where assignment_id=p_assignment.id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date between week_start and p_date;
  select count(*) into skipped from public.workout_schedule_changes where assignment_id=p_assignment.id and status='skipped' and original_date between week_start and p_date;
  if answered+skipped>=quota then return false; end if;
  select * into latest from public.workout_sessions where client_id=p_assignment.client_id and status='completed' and (completed_at at time zone 'Asia/Jerusalem')::date<=p_date order by completed_at desc limit 1;
  if found and p_date<(latest.completed_at at time zone 'Asia/Jerusalem')::date+(case when p.program_type='FBW' or p_assignment.weekly_frequency<=3 then 2 else 1 end) then return false; end if;
  return extract(dow from p_date)::smallint=any(slots);
 end if;
 if coalesce(cardinality(preferred),0)>0 then return extract(dow from p_date)::smallint=any(preferred); end if;
 return mod(p_date-p_assignment.start_date,7)<p_assignment.weekly_frequency;
end $function$;
