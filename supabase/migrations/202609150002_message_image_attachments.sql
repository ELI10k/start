-- Private image attachments for the direct coach/client conversation.
begin;

alter table public.coach_client_messages
  add column if not exists image_path text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('message-images','message-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists message_images_client_write on storage.objects;
create policy message_images_client_write on storage.objects for insert to authenticated
  with check(bucket_id='message-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists message_images_client_read on storage.objects;
create policy message_images_client_read on storage.objects for select to authenticated
  using(bucket_id='message-images' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists message_images_coach_write on storage.objects;
create policy message_images_coach_write on storage.objects for insert to authenticated
  with check(bucket_id='message-images' and public.is_coach_for(((storage.foldername(name))[1])::uuid));

drop policy if exists message_images_coach_read on storage.objects;
create policy message_images_coach_read on storage.objects for select to authenticated
  using(bucket_id='message-images' and public.is_coach_for(((storage.foldername(name))[1])::uuid));

drop policy if exists message_images_sender_delete on storage.objects;
create policy message_images_sender_delete on storage.objects for delete to authenticated
  using(bucket_id='message-images' and (
    (storage.foldername(name))[1]=auth.uid()::text or
    public.is_coach_for(((storage.foldername(name))[1])::uuid)
  ));

create or replace function public.send_coach_client_message_with_image(
  p_body text, p_topic text default 'general', p_client_id uuid default null,
  p_image_path text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_role text:=public.current_role(); v_coach_id uuid; v_client_id uuid;
  v_id uuid; v_sender_name text; v_href text; v_recipient uuid; v_body text;
begin
  v_body:=btrim(coalesce(p_body,''));
  if length(v_body)=0 and p_image_path is null then raise exception 'empty_message'; end if;
  if length(v_body)>4000 then raise exception 'message_too_long'; end if;
  if coalesce(p_topic,'general') not in ('general','support','profile_update') then raise exception 'invalid_topic'; end if;
  if v_role='client' then
    v_client_id:=auth.uid();
    select coach_id into v_coach_id from public.coach_client_relationships where client_id=v_client_id and status='active' limit 1;
    if v_coach_id is null then raise exception 'no_active_coach'; end if;
    v_recipient:=v_coach_id;
  elsif v_role='coach' then
    if p_client_id is null then raise exception 'client_required'; end if;
    if not public.is_coach_for(p_client_id) then raise exception 'not_authorized'; end if;
    v_coach_id:=auth.uid(); v_client_id:=p_client_id; v_recipient:=v_client_id;
  else raise exception 'not_authorized'; end if;
  if p_image_path is not null and split_part(p_image_path,'/',1)<>v_client_id::text then raise exception 'invalid_image_path'; end if;
  insert into public.coach_client_messages(coach_id,client_id,sender_id,topic,body,image_path)
  values(v_coach_id,v_client_id,auth.uid(),coalesce(p_topic,'general'),coalesce(nullif(v_body,''),'📷 תמונה'),p_image_path)
  returning id into v_id;
  select full_name into v_sender_name from public.profiles where id=auth.uid();
  v_href:=case when v_recipient=v_client_id then '/messages' else '/coach/clients/'||v_client_id::text||'?tab=messages' end;
  perform public.create_in_app_notification(v_recipient,auth.uid(),'system','direct_message',coalesce(v_sender_name,'הודעה חדשה'),
    case when length(v_body)>0 then left(v_body,160) else '📷 נשלחה תמונה' end,
    v_href,'coach_client_messages',v_id::text,null);
  return v_id;
end $$;

revoke all on function public.send_coach_client_message_with_image(text,text,uuid,text) from public;
grant execute on function public.send_coach_client_message_with_image(text,text,uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
