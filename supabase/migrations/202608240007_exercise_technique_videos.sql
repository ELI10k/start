begin;

create table if not exists public.exercise_technique_videos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  exercise_id text not null,
  exercise_name text not null,
  storage_path text not null unique,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists exercise_technique_videos_client_created_idx
  on public.exercise_technique_videos(client_id,created_at desc);
alter table public.exercise_technique_videos enable row level security;

create policy technique_video_client_insert on public.exercise_technique_videos
  for insert to authenticated with check(client_id=auth.uid() and public.current_role()='client');
create policy technique_video_client_read on public.exercise_technique_videos
  for select to authenticated using(client_id=auth.uid());
create policy technique_video_coach_read on public.exercise_technique_videos
  for select to authenticated using(public.is_coach_for(client_id));
grant select,insert on public.exercise_technique_videos to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('technique-videos','technique-videos',false,104857600,array['video/mp4','video/quicktime','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy technique_video_client_upload on storage.objects
  for insert to authenticated with check(bucket_id='technique-videos' and (storage.foldername(name))[1]=auth.uid()::text and public.current_role()='client');
create policy technique_video_client_storage_read on storage.objects
  for select to authenticated using(bucket_id='technique-videos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy technique_video_coach_storage_read on storage.objects
  for select to authenticated using(bucket_id='technique-videos' and exists(
    select 1 from public.exercise_technique_videos v where v.storage_path=name and public.is_coach_for(v.client_id)
  ));

create or replace function public.notify_exercise_technique_video() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_coach_id uuid;
begin
  for v_coach_id in select coach_id from public.coach_client_relationships where client_id=new.client_id and status='active' loop
    perform public.create_in_app_notification(v_coach_id,new.client_id,'workouts','coach_message','נשלח סרטון טכניקה','תרגיל: '||new.exercise_name,'/coach/technique-videos/'||new.id::text,'exercise_technique_videos',new.id::text,'technique-video-'||new.id::text||'-'||v_coach_id::text);
  end loop;
  return new;
end $$;
drop trigger if exists exercise_technique_video_notify on public.exercise_technique_videos;
create trigger exercise_technique_video_notify after insert on public.exercise_technique_videos
for each row execute function public.notify_exercise_technique_video();

commit;
