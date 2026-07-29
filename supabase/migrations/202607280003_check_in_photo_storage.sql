begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('check-in-photos','check-in-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy check_in_photo_client_upload on storage.objects for insert to authenticated with check (bucket_id='check-in-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy check_in_photo_client_read on storage.objects for select to authenticated using (bucket_id='check-in-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy check_in_photo_coach_read on storage.objects for select to authenticated using (bucket_id='check-in-photos' and exists(select 1 from public.coach_client_relationships r where r.coach_id=auth.uid() and r.client_id=((storage.foldername(name))[1])::uuid and r.status='active'));
create policy check_in_photo_client_delete on storage.objects for delete to authenticated using (bucket_id='check-in-photos' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
