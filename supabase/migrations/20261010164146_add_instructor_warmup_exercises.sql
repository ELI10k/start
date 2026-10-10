begin;

-- Complete the public instructor.co.il exercise inventory with the four
-- mobility entries that are not part of its resistance or bodyweight archives.
-- The source supplies movement names only. Coaching copy and media are original.

update public.workout_exercises
set category = 'חימום לפני אימון', updated_at = now()
where id = 'exercise-155pu7s';

insert into public.workout_exercises (
  id, name, normalized_name, aliases, category, primary_muscle_group,
  secondary_muscle_groups, equipment, difficulty, video, execution_notes,
  source_workbooks, source_references, status, image_url, how_to, cues,
  common_mistakes
) values
(
  'warmup-lat-ball-stretch',
  'מתיחה לרחב גבי על כדור',
  'מתיחה לרחב גבי על כדור',
  '{}'::text[],
  'חימום לפני אימון',
  'חימום',
  array['גב', 'רחב גבי', 'כתפיים']::text[],
  'כדור פיזיו',
  'מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/warmup/lat-ball-stretch.mp4","provider":"self-hosted","title":"מתיחה לרחב גבי על כדור"}'::jsonb,
  'מתחילים בעמידת שש כשיד אחת מונחת על כדור פיזיו. מגלגלים את הכדור קדימה, מאריכים את היד ומורידים בעדינות את בית החזה עד שמרגישים מתיחה נוחה בצד הגב. חוזרים בשליטה ומחליפים יד.',
  array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"חימום ותנועתיות","cell":"https://www.instructor.co.il/excercise/%d7%9e%d7%aa%d7%99%d7%97%d7%94-%d7%9c%d7%a8%d7%97%d7%91-%d7%92%d7%91%d7%99-%d7%a2%d7%9c-%d7%9b%d7%93%d7%95%d7%a8/","name":"מתיחה לרחב גבי על כדור"}]'::jsonb,
  'active',
  'https://start.elicohenfitness.co.il/exercises/warmup/lat-ball-stretch.jpg',
  'מתחילים בעמידת שש כשיד אחת מונחת על כדור פיזיו. מגלגלים את הכדור קדימה, מאריכים את היד ומורידים בעדינות את בית החזה עד שמרגישים מתיחה נוחה בצד הגב. חוזרים בשליטה ומחליפים יד.',
  array['האגן נשאר מעל הברכיים', 'היד מתארכת בלי להרים את הכתף', 'עובדים בטווח נעים ונושמים ברציפות']::text[],
  array['שקיעה חדה בגב התחתון', 'הסטת האגן לאחור במקום הארכת היד', 'לחיצה בכוח אל קצה הטווח']::text[]
),
(
  'warmup-shoulder-circles-ball',
  'סיבובי כתף עם כדור פיזיו',
  'סיבובי כתף עם כדור פיזיו',
  '{}'::text[],
  'חימום לפני אימון',
  'חימום',
  array['כתפיים', 'שכמה']::text[],
  'כדור פיזיו וקיר',
  'מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/warmup/shoulder-circles-ball.mp4","provider":"self-hosted","title":"סיבובי כתף עם כדור פיזיו"}'::jsonb,
  'עומדים מול קיר ומצמידים אליו כדור פיזיו בכף יד ישרה בגובה הכתף. מציירים עם הכדור מעגלים קטנים ומבוקרים לשני הכיוונים, בזמן שהגו נשאר יציב.',
  array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"חימום ותנועתיות","cell":"https://www.instructor.co.il/excercise/circles-arm-shoulders-ball/","name":"סיבובי כתף עם כדור פיזיו"}]'::jsonb,
  'active',
  'https://start.elicohenfitness.co.il/exercises/warmup/shoulder-circles-ball.jpg',
  'עומדים מול קיר ומצמידים אליו כדור פיזיו בכף יד ישרה בגובה הכתף. מציירים עם הכדור מעגלים קטנים ומבוקרים לשני הכיוונים, בזמן שהגו נשאר יציב.',
  array['לחץ קל ורציף על הכדור', 'כתף רחוקה מהאוזן', 'מעגל קטן ואחיד לכל כיוון']::text[],
  array['סיבוב של כל הגו', 'דחיפה חזקה מדי לקיר', 'משיכת הכתף למעלה']::text[]
),
(
  'warmup-bent-arm-shoulder-circles',
  'סיבובי כתף בזרוע כפופה',
  'סיבובי כתף בזרוע כפופה',
  '{}'::text[],
  'חימום לפני אימון',
  'חימום',
  array['כתפיים', 'שכמה']::text[],
  'משקל גוף',
  'מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/warmup/bent-arm-shoulder-circles.mp4","provider":"self-hosted","title":"סיבובי כתף בזרוע כפופה"}'::jsonb,
  'עומדים זקוף ומניחים את קצות האצבעות על הכתפיים. מובילים את המרפקים במעגל רחב ונוח לפנים, ולאחר מספר חזרות משנים כיוון ומסובבים לאחור.',
  array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"חימום ותנועתיות","cell":"https://www.instructor.co.il/excercise/circles-arm-shoulders/","name":"סיבובי כתף בזרוע כפופה"}]'::jsonb,
  'active',
  'https://start.elicohenfitness.co.il/exercises/warmup/bent-arm-shoulder-circles.jpg',
  'עומדים זקוף ומניחים את קצות האצבעות על הכתפיים. מובילים את המרפקים במעגל רחב ונוח לפנים, ולאחר מספר חזרות משנים כיוון ומסובבים לאחור.',
  array['קצות האצבעות נשארים על הכתפיים', 'המרפקים מובילים את המעגל', 'הגו והאגן נשארים יציבים']::text[],
  array['תנועה מהירה ומתנדנדת', 'הקשתת הגב כדי להגדיל טווח', 'עבודה בתוך כאב בכתף']::text[]
),
(
  'warmup-straight-arm-shoulder-circles',
  'סיבובי כתף ביד ישרה',
  'סיבובי כתף ביד ישרה',
  '{}'::text[],
  'חימום לפני אימון',
  'חימום',
  array['כתפיים', 'שכמה']::text[],
  'משקל גוף',
  'מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/warmup/straight-arm-shoulder-circles.mp4","provider":"self-hosted","title":"סיבובי כתף ביד ישרה"}'::jsonb,
  'עומדים זקוף ופורשים ידיים ישרות לצדדים בגובה הכתפיים. מציירים מעגלים קטנים ומבוקרים לפנים, שומרים את הגו יציב ולאחר מכן מבצעים באותו אופן לאחור.',
  array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"חימום ותנועתיות","cell":"https://www.instructor.co.il/excercise/circles-straight-arm-shoulders/","name":"סיבובי כתף ביד ישרה"}]'::jsonb,
  'active',
  'https://start.elicohenfitness.co.il/exercises/warmup/straight-arm-shoulder-circles.jpg',
  'עומדים זקוף ופורשים ידיים ישרות לצדדים בגובה הכתפיים. מציירים מעגלים קטנים ומבוקרים לפנים, שומרים את הגו יציב ולאחר מכן מבצעים באותו אופן לאחור.',
  array['מרפקים ישרים אך רכים', 'כתפיים רחוקות מהאוזניים', 'מתחילים במעגלים קטנים']::text[],
  array['הרמת כתפיים לכיוון האוזניים', 'תנופה מהגב או מהאגן', 'מעגל גדול שמאבד שליטה']::text[]
)
on conflict (id) do nothing;

commit;
