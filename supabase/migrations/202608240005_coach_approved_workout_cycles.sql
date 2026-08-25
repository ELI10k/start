begin;

create table public.workout_cycle_proposals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  assignment_id uuid not null references public.workout_assignments(id) on delete cascade,
  current_program_id text not null references public.workout_programs(id) on delete restrict,
  cycle_start date not null,
  cycle_end date not null,
  completed_workouts smallint not null,
  expected_workouts smallint not null,
  completion_percent smallint not null check(completion_percent between 0 and 100),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  proposed_program jsonb not null,
  changes jsonb not null default '[]'::jsonb,
  coach_note text,
  reviewed_at timestamptz,
  activated_program_id text references public.workout_programs(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(assignment_id,cycle_start)
);
create index workout_cycle_proposals_coach_status_idx on public.workout_cycle_proposals(coach_id,status,created_at desc);
alter table public.workout_cycle_proposals enable row level security;
create policy workout_cycle_proposals_coach_read on public.workout_cycle_proposals for select to authenticated using(coach_id=auth.uid() and public.is_coach_for(client_id));
revoke all on public.workout_cycle_proposals from anon,authenticated;
grant select on public.workout_cycle_proposals to authenticated;

create or replace function public.review_workout_cycle_proposal(p_id uuid,p_decision text,p_program jsonb,p_note text default '') returns text
language plpgsql security definer set search_path=public as $$
declare v public.workout_cycle_proposals%rowtype; d jsonb; e jsonb; s jsonb; new_id text; new_assignment uuid;
begin
 select * into v from public.workout_cycle_proposals where id=p_id for update;
 if v.id is null or v.status<>'pending' or public.current_role()<>'coach' or v.coach_id<>auth.uid() or not public.is_coach_for(v.client_id) then raise exception 'not_authorized'; end if;
 if p_decision='reject' then update public.workout_cycle_proposals set status='rejected',coach_note=nullif(trim(p_note),''),reviewed_at=now() where id=p_id; return null; end if;
 if p_decision<>'approve' or jsonb_typeof(p_program->'days')<>'array' then raise exception 'invalid_review'; end if;
 new_id='cycle-'||replace(p_id::text,'-','');
 insert into public.workout_programs(id,coach_id,name,description,program_type,difficulty,training_frequency,equipment,source_workbook,source_sheet,status,official,duplicated_from_id)
 values(new_id,auth.uid(),trim(p_program->>'name'),nullif(p_program->>'description',''),nullif(p_program->>'programType',''),nullif(p_program->>'difficulty',''),greatest(1,ceil(v.expected_workouts::numeric/4)::smallint),array(select jsonb_array_elements_text(coalesce(p_program->'equipment','[]'::jsonb))),'מחזור אוטומטי מאושר',null,'active',false,v.current_program_id);
 for d in select * from jsonb_array_elements(p_program->'days') loop
  insert into public.workout_program_days(id,program_id,name,sort_order) values(new_id||'-d-'||(d->>'order'),new_id,d->>'name',(d->>'order')::smallint);
  for e in select * from jsonb_array_elements(d->'exercises') loop
   insert into public.workout_program_exercises(id,day_id,exercise_id,sort_order,sets_text,reps_text,rest_text,notes)
   values(new_id||'-e-'||(d->>'order')||'-'||(e->>'order'),new_id||'-d-'||(d->>'order'),e->>'exerciseId',(e->>'order')::smallint,e->>'sets',e->>'reps',e->>'rest',e->>'notes');
   for s in select * from jsonb_array_elements(coalesce(e->'setPrescriptions','[]'::jsonb)) loop
    insert into public.workout_set_prescriptions(id,program_exercise_id,sort_order,repetitions) values(new_id||'-s-'||(d->>'order')||'-'||(e->>'order')||'-'||(s->>'order'),new_id||'-e-'||(d->>'order')||'-'||(e->>'order'),(s->>'order')::smallint,s->>'repetitions');
   end loop;
  end loop;
 end loop;
 update public.workout_assignments set status='completed',end_date=current_date where id=v.assignment_id and status='active';
 insert into public.workout_assignments(client_id,program_id,assigned_by,start_date,weekly_frequency,coach_note) values(v.client_id,new_id,auth.uid(),current_date,greatest(1,ceil(v.expected_workouts::numeric/4)::smallint),nullif(trim(p_note),'')) returning id into new_assignment;
 update public.workout_cycle_proposals set status='approved',proposed_program=p_program,coach_note=nullif(trim(p_note),''),reviewed_at=now(),activated_program_id=new_id where id=p_id;
 return new_id;
end $$;
revoke all on function public.review_workout_cycle_proposal(uuid,text,jsonb,text) from public;
grant execute on function public.review_workout_cycle_proposal(uuid,text,jsonb,text) to authenticated;

notify pgrst,'reload schema';
commit;
