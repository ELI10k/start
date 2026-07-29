begin;

create type public.content_publication_status as enum ('draft', 'published', 'archived');

create table public.content_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index content_categories_name_unique_idx on public.content_categories(lower(trim(name)));
create unique index content_categories_slug_unique_idx on public.content_categories(lower(slug));
create index content_categories_active_order_idx on public.content_categories(active, sort_order, name);

insert into public.content_categories(name, slug, sort_order)
select distinct trim(category), 'legacy-' || substring(md5(lower(trim(category))), 1, 16), 100
from public.content_items
where length(trim(category)) > 0
on conflict do nothing;

do $$
begin
  if not exists(select 1 from public.content_items) then
    insert into public.content_categories(id, name, slug, description, sort_order) values
      ('20000000-0000-4000-8000-000000000001', 'היכרות עם START', 'start-guide', 'היכרות ושימוש במערכת', 10),
      ('20000000-0000-4000-8000-000000000002', 'הרגלים ומעקב', 'habits-progress', 'כלים כלליים למעקב והתמדה', 20),
      ('20000000-0000-4000-8000-000000000003', 'תזונה ואימונים', 'nutrition-training', 'תכנים מקצועיים שהמאמן מפרסם', 30)
    on conflict do nothing;
  end if;
end $$;

alter table public.content_items
  add column category_id uuid references public.content_categories(id) on delete restrict,
  add column created_by uuid references public.profiles(id) on delete set null,
  add column status public.content_publication_status not null default 'draft',
  add column published_at timestamptz,
  add column estimated_minutes smallint check (estimated_minutes is null or estimated_minutes between 1 and 1440);

update public.content_items i
set category_id = c.id,
    status = case when i.published then 'published'::public.content_publication_status else 'draft'::public.content_publication_status end,
    published_at = case when i.published then i.created_at else null end
from public.content_categories c
where lower(trim(c.name)) = lower(trim(i.category));

alter table public.content_items alter column category_id set not null;
alter table public.content_items add constraint content_items_published_payload_check
  check (status <> 'published' or body is not null or media_url is not null);
create index content_items_status_category_order_idx on public.content_items(status, category_id, sort_order, published_at desc);
create index content_items_created_by_status_idx on public.content_items(created_by, status, updated_at desc);

create table public.content_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (length(trim(slug)) > 0),
  created_at timestamptz not null default now()
);
create unique index content_tags_name_unique_idx on public.content_tags(lower(trim(name)));
create unique index content_tags_slug_unique_idx on public.content_tags(lower(trim(slug)));

create table public.content_item_tags (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  tag_id uuid not null references public.content_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(content_item_id, tag_id)
);
create index content_item_tags_tag_idx on public.content_item_tags(tag_id, content_item_id);

create table public.content_progress (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, content_item_id)
);
create index content_progress_client_viewed_idx on public.content_progress(client_id, last_viewed_at desc);
create index content_progress_item_completed_idx on public.content_progress(content_item_id, completed_at);

create table public.content_favorites (
  client_id uuid not null references public.profiles(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(client_id, content_item_id)
);
create index content_favorites_client_created_idx on public.content_favorites(client_id, created_at desc);

create or replace function public.sync_content_item_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  select name into new.category from public.content_categories where id = new.category_id;
  if not found then raise exception 'unknown_content_category'; end if;
  new.published = new.status = 'published';
  if new.status = 'published' then new.published_at = coalesce(new.published_at, now()); end if;
  if new.status = 'draft' then new.published_at = null; end if;
  return new;
end $$;
create trigger content_items_sync before insert or update on public.content_items
for each row execute function public.sync_content_item_fields();
create trigger content_categories_touch before update on public.content_categories
for each row execute function public.touch_updated_at();
create trigger content_progress_touch before update on public.content_progress
for each row execute function public.touch_updated_at();

alter table public.content_categories enable row level security;
alter table public.content_tags enable row level security;
alter table public.content_item_tags enable row level security;
alter table public.content_progress enable row level security;
alter table public.content_favorites enable row level security;

drop policy if exists content_published_read on public.content_items;
create policy content_items_published_read on public.content_items for select to authenticated
  using (status = 'published');
create policy content_items_coach_all on public.content_items for all to authenticated
  using (public.current_role() = 'coach')
  with check (public.current_role() = 'coach' and (created_by is null or created_by = (select auth.uid())));

create policy content_categories_read on public.content_categories for select to authenticated
  using (active or public.current_role() = 'coach');
create policy content_categories_coach_all on public.content_categories for all to authenticated
  using (public.current_role() = 'coach') with check (public.current_role() = 'coach');

create policy content_tags_read on public.content_tags for select to authenticated using (true);
create policy content_tags_coach_all on public.content_tags for all to authenticated
  using (public.current_role() = 'coach') with check (public.current_role() = 'coach');

create policy content_item_tags_read on public.content_item_tags for select to authenticated
  using (exists(select 1 from public.content_items i where i.id = content_item_id and (i.status = 'published' or public.current_role() = 'coach')));
create policy content_item_tags_coach_all on public.content_item_tags for all to authenticated
  using (public.current_role() = 'coach') with check (public.current_role() = 'coach');

create policy content_progress_self_all on public.content_progress for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and exists(select 1 from public.content_items i where i.id = content_item_id and i.status = 'published'));
create policy content_progress_coach_select on public.content_progress for select to authenticated
  using (public.is_coach_for(client_id));

create policy content_favorites_self_all on public.content_favorites for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and exists(select 1 from public.content_items i where i.id = content_item_id and i.status = 'published'));

grant select on public.content_categories, public.content_items, public.content_tags, public.content_item_tags, public.content_progress, public.content_favorites to authenticated;
grant insert, update, delete on public.content_categories, public.content_items, public.content_tags, public.content_item_tags, public.content_progress, public.content_favorites to authenticated;

create or replace function public.save_content_item(p_item jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := coalesce(nullif(p_item->>'id','')::uuid, gen_random_uuid());
  v_category_id uuid := nullif(p_item->>'categoryId','')::uuid;
  v_status public.content_publication_status := coalesce(nullif(p_item->>'status','')::public.content_publication_status, 'draft');
  v_type public.content_type := coalesce(nullif(p_item->>'contentType','')::public.content_type, 'article');
  v_tag_name text;
  v_tag_id uuid;
  v_tag_slug text;
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if length(trim(coalesce(p_item->>'title',''))) = 0 then raise exception 'title_required'; end if;
  if not exists(select 1 from public.content_categories where id = v_category_id and active) then raise exception 'category_required'; end if;
  if v_status = 'published' and nullif(trim(coalesce(p_item->>'body','')), '') is null and nullif(trim(coalesce(p_item->>'mediaUrl','')), '') is null then
    raise exception 'published_content_requires_payload';
  end if;

  insert into public.content_items(id, title, description, category_id, category, content_type, thumbnail_url, body, media_url, published, status, sort_order, created_by, estimated_minutes)
  values(
    v_id, trim(p_item->>'title'), nullif(trim(p_item->>'description'), ''), v_category_id, '', v_type,
    nullif(trim(p_item->>'thumbnailUrl'), ''), nullif(trim(p_item->>'body'), ''), nullif(trim(p_item->>'mediaUrl'), ''),
    v_status = 'published', v_status, coalesce(nullif(p_item->>'sortOrder','')::integer, 0), auth.uid(),
    nullif(p_item->>'estimatedMinutes','')::smallint
  )
  on conflict(id) do update set
    title = excluded.title, description = excluded.description, category_id = excluded.category_id,
    content_type = excluded.content_type, thumbnail_url = excluded.thumbnail_url, body = excluded.body,
    media_url = excluded.media_url, status = excluded.status, sort_order = excluded.sort_order,
    estimated_minutes = excluded.estimated_minutes
  where public.current_role() = 'coach';
  if not found then raise exception 'content_item_not_saved'; end if;

  delete from public.content_item_tags where content_item_id = v_id;
  for v_tag_name in select trim(value) from jsonb_array_elements_text(coalesce(p_item->'tags','[]'::jsonb)) where length(trim(value)) > 0 loop
    v_tag_slug := 'tag-' || substring(md5(lower(v_tag_name)), 1, 20);
    insert into public.content_tags(name, slug) values(v_tag_name, v_tag_slug)
    on conflict(slug) do update set name = excluded.name returning id into v_tag_id;
    insert into public.content_item_tags(content_item_id, tag_id) values(v_id, v_tag_id) on conflict do nothing;
  end loop;
  return v_id;
end $$;

create or replace function public.set_content_item_status(p_content_item_id uuid, p_status public.content_publication_status) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if public.current_role() <> 'coach' then raise exception 'coach_required'; end if;
  if p_status = 'published' and exists(select 1 from public.content_items where id = p_content_item_id and body is null and media_url is null) then
    raise exception 'published_content_requires_payload';
  end if;
  update public.content_items set status = p_status where id = p_content_item_id;
  if not found then raise exception 'content_item_not_found'; end if;
end $$;

create or replace function public.record_content_view(p_content_item_id uuid) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if not exists(select 1 from public.content_items where id = p_content_item_id and status = 'published') then raise exception 'content_not_available'; end if;
  insert into public.content_progress(client_id, content_item_id, progress_percent, last_viewed_at)
  values(auth.uid(), p_content_item_id, 0, now())
  on conflict(client_id, content_item_id) do update set last_viewed_at = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.save_content_progress(p_content_item_id uuid, p_progress_percent smallint, p_last_position_seconds integer default 0) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if p_progress_percent < 0 or p_progress_percent > 100 or p_last_position_seconds < 0 then raise exception 'invalid_content_progress'; end if;
  if not exists(select 1 from public.content_items where id = p_content_item_id and status = 'published') then raise exception 'content_not_available'; end if;
  insert into public.content_progress(client_id, content_item_id, progress_percent, last_position_seconds, last_viewed_at, completed_at)
  values(auth.uid(), p_content_item_id, p_progress_percent, p_last_position_seconds, now(), case when p_progress_percent = 100 then now() else null end)
  on conflict(client_id, content_item_id) do update set
    progress_percent = excluded.progress_percent,
    last_position_seconds = excluded.last_position_seconds,
    last_viewed_at = now(),
    completed_at = case when excluded.progress_percent = 100 then coalesce(public.content_progress.completed_at, now()) else null end
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.set_content_favorite(p_content_item_id uuid, p_favorite boolean) returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if public.current_role() <> 'client' then raise exception 'client_required'; end if;
  if not exists(select 1 from public.content_items where id = p_content_item_id and status = 'published') then raise exception 'content_not_available'; end if;
  if p_favorite then
    insert into public.content_favorites(client_id, content_item_id) values(auth.uid(), p_content_item_id) on conflict do nothing;
  else
    delete from public.content_favorites where client_id = auth.uid() and content_item_id = p_content_item_id;
  end if;
  return p_favorite;
end $$;

revoke all on function public.save_content_item(jsonb) from public;
revoke all on function public.set_content_item_status(uuid,public.content_publication_status) from public;
revoke all on function public.record_content_view(uuid) from public;
revoke all on function public.save_content_progress(uuid,smallint,integer) from public;
revoke all on function public.set_content_favorite(uuid,boolean) from public;
grant execute on function public.save_content_item(jsonb) to authenticated;
grant execute on function public.set_content_item_status(uuid,public.content_publication_status) to authenticated;
grant execute on function public.record_content_view(uuid) to authenticated;
grant execute on function public.save_content_progress(uuid,smallint,integer) to authenticated;
grant execute on function public.set_content_favorite(uuid,boolean) to authenticated;

do $$
begin
  if not exists(select 1 from public.content_items) then
    insert into public.content_items(id, title, description, category_id, category, content_type, body, published, status, sort_order, estimated_minutes) values
      ('10000000-0000-4000-8000-000000000001', 'ברוכים הבאים לספריית START', 'היכרות קצרה עם ספריית התוכן', '20000000-0000-4000-8000-000000000001', '', 'article', 'בספרייה הזו יופיעו תכנים שהמאמן פרסם עבורך. אפשר לסמן מועדפים ולעדכן את ההתקדמות בכל תוכן.', true, 'published', 10, 2),
      ('10000000-0000-4000-8000-000000000002', 'איך להשתמש בספריית התוכן', 'חיפוש, קטגוריות, מועדפים והתקדמות', '20000000-0000-4000-8000-000000000001', '', 'article', 'בחרו קטגוריה, פתחו תוכן וסמנו את ההתקדמות. תוכן שסומן כמועדף נשמר בחשבון וזמין גם לאחר רענון.', true, 'published', 20, 3),
      ('10000000-0000-4000-8000-000000000003', 'מעקב אחר התקדמות תוכן', 'שמירת נקודת הצפייה והשלמת תוכן', '20000000-0000-4000-8000-000000000002', '', 'article', 'פתיחת תוכן מעדכנת את הצפייה האחרונה. אפשר לשמור התקדמות באחוזים ולחזור אליה בהתחברות הבאה.', true, 'published', 30, 2);

    insert into public.content_tags(id, name, slug) values
      ('30000000-0000-4000-8000-000000000001', 'היכרות', 'getting-started'),
      ('30000000-0000-4000-8000-000000000002', 'שימוש במערכת', 'using-start'),
      ('30000000-0000-4000-8000-000000000003', 'התקדמות', 'progress')
    on conflict do nothing;
    insert into public.content_item_tags(content_item_id, tag_id) values
      ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001'),
      ('10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002'),
      ('10000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003')
    on conflict do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
