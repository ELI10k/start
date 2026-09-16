begin;

-- The full existing "יוגורט חלבון" category is curated as master protein food.
-- Clear any historical opt-out rows so every coach sees these products in
-- Favorites, including inside the client menu food picker.
update public.coach_food_usage
set manual_favorite = true
where food_id in (
  '31','32','340','341','342','343','344','345','346','347','348','349',
  '350','351','352','353','354','355','356','357','358'
);

commit;
