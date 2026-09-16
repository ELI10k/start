begin;

update public.foods
set category = 'יוגורט חלבון', updated_at = now()
where id in (
  '31','340','341','342','343','344','345','346','347','348','349',
  '350','351','352','353','354','355','356','357','358'
);

do $$
begin
  if (select count(*) from public.foods where id in (
    '31','340','341','342','343','344','345','346','347','348','349',
    '350','351','352','353','354','355','356','357','358'
  ) and category = 'יוגורט חלבון') <> 20 then
    raise exception 'protein_yogurt_category_update_failed';
  end if;
end $$;

commit;
