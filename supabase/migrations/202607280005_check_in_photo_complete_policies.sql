begin;

create policy check_in_photos_client_update on public.check_in_photos
for update to authenticated
using (client_id = auth.uid())
with check (
  client_id = auth.uid()
  and exists (
    select 1 from public.check_ins c
    where c.id = check_in_id and c.client_id = auth.uid()
  )
);

create policy check_in_photos_client_delete on public.check_in_photos
for delete to authenticated using (client_id = auth.uid());

create policy check_in_photos_coach_insert on public.check_in_photos
for insert to authenticated
with check (
  public.is_coach_for(client_id)
  and exists (
    select 1 from public.check_ins c
    where c.id = check_in_id and c.client_id = check_in_photos.client_id
  )
);

create policy check_in_photos_coach_update on public.check_in_photos
for update to authenticated
using (public.is_coach_for(client_id))
with check (
  public.is_coach_for(client_id)
  and exists (
    select 1 from public.check_ins c
    where c.id = check_in_id and c.client_id = check_in_photos.client_id
  )
);

create policy check_in_photos_coach_delete on public.check_in_photos
for delete to authenticated using (public.is_coach_for(client_id));

create policy check_in_photo_coach_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'check-in-photos'
  and exists (
    select 1 from public.coach_client_relationships r
    where r.coach_id = auth.uid()
      and r.client_id = ((storage.foldername(name))[1])::uuid
      and r.status = 'active'
  )
);

create policy check_in_photo_coach_update on storage.objects
for update to authenticated
using (
  bucket_id = 'check-in-photos'
  and exists (
    select 1 from public.coach_client_relationships r
    where r.coach_id = auth.uid()
      and r.client_id = ((storage.foldername(name))[1])::uuid
      and r.status = 'active'
  )
)
with check (
  bucket_id = 'check-in-photos'
  and exists (
    select 1 from public.coach_client_relationships r
    where r.coach_id = auth.uid()
      and r.client_id = ((storage.foldername(name))[1])::uuid
      and r.status = 'active'
  )
);

create policy check_in_photo_coach_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'check-in-photos'
  and exists (
    select 1 from public.coach_client_relationships r
    where r.coach_id = auth.uid()
      and r.client_id = ((storage.foldername(name))[1])::uuid
      and r.status = 'active'
  )
);

commit;
