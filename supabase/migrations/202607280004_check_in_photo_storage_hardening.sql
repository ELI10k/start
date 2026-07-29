begin;
create policy check_in_photo_client_update on storage.objects for update to authenticated using (bucket_id='check-in-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='check-in-photos' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
