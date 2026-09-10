-- Production authentication checks publish temporary content to verify RLS and
-- persistence. Test content must never be visible to, or notify, real clients.

begin;

delete from public.notifications
where type = 'content_published'
  and (
    body ilike 'Auth E2E %'
    or source_id in (
      select id::text from public.content_items where title ilike 'Auth E2E %'
    )
  );

delete from public.content_items where title ilike 'Auth E2E %';

create or replace function public.notify_published_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
  v_is_test_content boolean := false;
begin
  select coalesce(p.is_test_account, false)
    into v_is_test_content
  from public.profiles p
  where p.id = new.created_by;

  v_is_test_content := coalesce(v_is_test_content, false)
    or new.title ilike 'Auth E2E %';

  if not v_is_test_content
    and new.status = 'published'
    and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    for v_client_id in
      select id
      from public.profiles
      where role = 'client'
        and status = 'active'
        and not is_test_account
    loop
      perform public.create_in_app_notification(
        v_client_id, new.created_by, 'content', 'content_published',
        'תוכן חדש פורסם', new.title, '/content/' || new.id::text,
        'content_items', new.id::text, 'content-published-' || new.id::text
      );
    end loop;
  end if;
  return new;
end $$;

commit;
