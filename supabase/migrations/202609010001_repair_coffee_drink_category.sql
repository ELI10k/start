-- One Open Food Facts row arrived with its Hebrew category decoded as symbols.
-- Repair the stored value so filters, cards and search all use the same title.
update public.foods
set category = 'משקאות', updated_at = now()
where id = 'barcode-7290119387472'
  and category = '◊°◊®◊ô◊ß◊î';
