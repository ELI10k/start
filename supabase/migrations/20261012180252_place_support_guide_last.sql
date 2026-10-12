-- Keep the in-app course in the same sequence as the public guide landing page:
-- device connection first, then messages and support as the final lesson.
-- Only ordering changes; lesson IDs and progress records stay untouched.
begin;

update public.content_items
set sort_order = case id
  when '10000000-0000-4000-8000-000000000011'::uuid then 70
  when '10000000-0000-4000-8000-000000000012'::uuid then 80
  when '10000000-0000-4000-8000-000000000010'::uuid then 90
end
where category_id = '20000000-0000-4000-8000-000000000001'::uuid
  and id in (
    '10000000-0000-4000-8000-000000000010'::uuid,
    '10000000-0000-4000-8000-000000000011'::uuid,
    '10000000-0000-4000-8000-000000000012'::uuid
  );

notify pgrst, 'reload schema';

commit;
