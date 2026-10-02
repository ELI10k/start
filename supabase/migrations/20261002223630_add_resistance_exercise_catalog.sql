begin;

-- Original male-only media and catalogue records for the resistance exercise index.
insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-360','שלוש מאות שישים','שלוש מאות שישים','{}'::text[],
  'סטיל מייס','שרירי ליבה',array['כתפיים','גב','יד אחורית']::text[],
  'סטיל מייס','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/360.mp4","provider":"self-hosted","title":"שלוש מאות שישים"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שלוש מאות שישים, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/360/","name":"שלוש מאות שישים"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/360.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שלוש מאות שישים, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-ball-dips','מקבילים על כדור פיזיו','מקבילים על כדור פיזיו','{}'::text[],
  'כדור פיזיו','יד אחורית',array[]::text[],
  'כדור פיזיו','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/ball-dips.mp4","provider":"self-hosted","title":"מקבילים על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מקבילים על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/ball-dips/","name":"מקבילים על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/ball-dips.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מקבילים על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-lying-biceps-curl','בשכיבה, כפיפת מרפקים וכפיפת כתף בפולי','בשכיבה כפיפת מרפקים וכפיפת כתף בפולי','{}'::text[],
  'כבל פולי','יד קדמית',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-lying-biceps-curl.mp4","provider":"self-hosted","title":"בשכיבה, כפיפת מרפקים וכפיפת כתף בפולי"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת מרפקים וכפיפת כתף בפולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-lying-biceps-curl/","name":"בשכיבה, כפיפת מרפקים וכפיפת כתף בפולי"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-lying-biceps-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת מרפקים וכפיפת כתף בפולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-pendulum','מטוטלת ברצועות','מטוטלת ברצועות','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-pendulum.mp4","provider":"self-hosted","title":"מטוטלת ברצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מטוטלת ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-pendulum/","name":"מטוטלת ברצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-pendulum.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מטוטלת ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-reverse-plank','פלאנק הפוך','פלאנק הפוך','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/reverse-plank.mp4","provider":"self-hosted","title":"פלאנק הפוך"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פלאנק הפוך, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/reverse-plank/","name":"פלאנק הפוך"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/reverse-plank.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פלאנק הפוך, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-star-pushup','סמיכת כוכב','סמיכת כוכב','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-star-pushup.mp4","provider":"self-hosted","title":"סמיכת כוכב"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל סמיכת כוכב, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-star-pushup/","name":"סמיכת כוכב"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-star-pushup.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל סמיכת כוכב, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-hip-abduction','בעמידה, הרחקת ירך כנגד גומיה','בעמידה הרחקת ירך כנגד גומיה','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-hip-abduction.mp4","provider":"self-hosted","title":"בעמידה, הרחקת ירך כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, הרחקת ירך כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-hip-abduction/","name":"בעמידה, הרחקת ירך כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-hip-abduction.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, הרחקת ירך כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-hang-clean','קלין בקטלבל','קלין בקטלבל','{}'::text[],
  'קטלבל','חזה',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/hang-clean.mp4","provider":"self-hosted","title":"קלין בקטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל קלין בקטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/hang-clean/","name":"קלין בקטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/hang-clean.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל קלין בקטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-one-arm-kettlebell-snatch','הנפה סנאצ'' ביד אחת כנגד קטלבל','הנפה סנאצ ביד אחת כנגד קטלבל','{}'::text[],
  'קטלבל','כתפיים',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/one-arm-kettlebell-snatch.mp4","provider":"self-hosted","title":"הנפה סנאצ'' ביד אחת כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל הנפה סנאצ'' ביד אחת כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/one-arm-kettlebell-snatch/","name":"הנפה סנאצ'' ביד אחת כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/one-arm-kettlebell-snatch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל הנפה סנאצ'' ביד אחת כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-squat','שפיפה – סקוואט כנגד גומיית התנגדות','שפיפה סקוואט כנגד גומיית התנגדות','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-squat.mp4","provider":"self-hosted","title":"שפיפה – סקוואט כנגד גומיית התנגדות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-squat/","name":"שפיפה – סקוואט כנגד גומיית התנגדות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-battling-rope-power-slam','הטחה בחבל קרב','הטחה בחבל קרב','{}'::text[],
  'חבל קרב','רגליים',array[]::text[],
  'חבל קרב','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/battling-rope-power-slam.mp4","provider":"self-hosted","title":"הטחה בחבל קרב"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל הטחה בחבל קרב, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/battling-rope-power-slam/","name":"הטחה בחבל קרב"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/battling-rope-power-slam.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל הטחה בחבל קרב, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-wide-grip-shoulder-press','בעמידה, לחיצת כתפיים באחיזה רחבה כנגד גומיה','בעמידה לחיצת כתפיים באחיזה רחבה כנגד גומיה','{}'::text[],
  'גומיית התנגדות','כתפיים',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-wide-grip-shoulder-press.mp4","provider":"self-hosted","title":"בעמידה, לחיצת כתפיים באחיזה רחבה כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, לחיצת כתפיים באחיזה רחבה כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-wide-grip-shoulder-press/","name":"בעמידה, לחיצת כתפיים באחיזה רחבה כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-wide-grip-shoulder-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, לחיצת כתפיים באחיזה רחבה כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-incline-two-arms-extenstion','בישיבה בשיפוע, פשיטת מרפקים כנגד משקולת','בישיבה בשיפוע פשיטת מרפקים כנגד משקולת','{}'::text[],
  'משקולות יד','יד אחורית',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-incline-two-arms-extenstion.mp4","provider":"self-hosted","title":"בישיבה בשיפוע, פשיטת מרפקים כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה בשיפוע, פשיטת מרפקים כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-incline-two-arms-extenstion/","name":"בישיבה בשיפוע, פשיטת מרפקים כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-incline-two-arms-extenstion.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה בשיפוע, פשיטת מרפקים כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-arm-skull-crasher','בשכיבה פשיטת מרפקים כנגד גומייה','בשכיבה פשיטת מרפקים כנגד גומייה','{}'::text[],
  'גומיית התנגדות','יד אחורית',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-arm-skull-crasher.mp4","provider":"self-hosted","title":"בשכיבה פשיטת מרפקים כנגד גומייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פשיטת מרפקים כנגד גומייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-arm-skull-crasher/","name":"בשכיבה פשיטת מרפקים כנגד גומייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-arm-skull-crasher.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פשיטת מרפקים כנגד גומייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-seated-dips','מקבילים באחיזה צרה במכונה ייעודית','מקבילים באחיזה צרה במכונה ייעודית','{}'::text[],
  'מכונה ייעודית','יד אחורית',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-dips.mp4","provider":"self-hosted","title":"מקבילים באחיזה צרה במכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מקבילים באחיזה צרה במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-seated-dips/","name":"מקבילים באחיזה צרה במכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-dips.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מקבילים באחיזה צרה במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-incline-arm-extension','פשיטת מרפקים במכונה ייעודית','פשיטת מרפקים במכונה ייעודית','{}'::text[],
  'מכונה ייעודית','יד אחורית',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-incline-arm-extension.mp4","provider":"self-hosted","title":"פשיטת מרפקים במכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-incline-arm-extension/","name":"פשיטת מרפקים במכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-incline-arm-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-arm-extension','פשיטת מרפקים כנגד גומייה','פשיטת מרפקים כנגד גומייה','{}'::text[],
  'גומיית התנגדות','יד אחורית',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-arm-extension.mp4","provider":"self-hosted","title":"פשיטת מרפקים כנגד גומייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים כנגד גומייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-arm-extension/","name":"פשיטת מרפקים כנגד גומייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-arm-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים כנגד גומייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-kickback','בהטיית גו, פשיטת מרפק ביד אחת כנגד גומיה','בהטיית גו פשיטת מרפק ביד אחת כנגד גומיה','{}'::text[],
  'גומיית התנגדות','יד אחורית',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-kickback.mp4","provider":"self-hosted","title":"בהטיית גו, פשיטת מרפק ביד אחת כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו, פשיטת מרפק ביד אחת כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-kickback/","name":"בהטיית גו, פשיטת מרפק ביד אחת כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-kickback.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו, פשיטת מרפק ביד אחת כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-arm-curl','כפיפת מרפק ברצועות תלייה','כפיפת מרפק ברצועות תלייה','{}'::text[],
  'רצועות תלייה','יד קדמית',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-arm-curl.mp4","provider":"self-hosted","title":"כפיפת מרפק ברצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפק ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-arm-curl/","name":"כפיפת מרפק ברצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפק ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-waist-side-bend','כפיפת גו אלכסונית ברצועות תליה','כפיפת גו אלכסונית ברצועות תליה','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-waist-side-bend.mp4","provider":"self-hosted","title":"כפיפת גו אלכסונית ברצועות תליה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת גו אלכסונית ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-waist-side-bend/","name":"כפיפת גו אלכסונית ברצועות תליה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-waist-side-bend.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת גו אלכסונית ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-standing-waist-twist','בעמידה פיתול מותן כנגד גומייה','בעמידה פיתול מותן כנגד גומייה','{}'::text[],
  'גומיית התנגדות','שרירי ליבה',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-standing-waist-twist.mp4","provider":"self-hosted","title":"בעמידה פיתול מותן כנגד גומייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה פיתול מותן כנגד גומייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-standing-waist-twist/","name":"בעמידה פיתול מותן כנגד גומייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-standing-waist-twist.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה פיתול מותן כנגד גומייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-wide-grip-shoulder-press','בעמידה, לחיצת כתפיים באחיזה רחבה במכונת סמית','בעמידה לחיצת כתפיים באחיזה רחבה במכונת סמית','{}'::text[],
  'מכונת סמית','כתפיים',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-wide-grip-shoulder-press.mp4","provider":"self-hosted","title":"בעמידה, לחיצת כתפיים באחיזה רחבה במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, לחיצת כתפיים באחיזה רחבה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-wide-grip-shoulder-press/","name":"בעמידה, לחיצת כתפיים באחיזה רחבה במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-wide-grip-shoulder-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, לחיצת כתפיים באחיזה רחבה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-landmine-waist-twist','פיתול אלכסוני כנגד מוט','פיתול אלכסוני כנגד מוט','{}'::text[],
  'מוט','שרירי ליבה',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/landmine-waist-twist.mp4","provider":"self-hosted","title":"פיתול אלכסוני כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פיתול אלכסוני כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/landmine-waist-twist/","name":"פיתול אלכסוני כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/landmine-waist-twist.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פיתול אלכסוני כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-figure-eight','שמיניות עם קטלבל','שמיניות עם קטלבל','{}'::text[],
  'קטלבל','שרירי ליבה',array[]::text[],
  'קטלבל','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-figure-eight.mp4","provider":"self-hosted","title":"שמיניות עם קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שמיניות עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-figure-eight/","name":"שמיניות עם קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-figure-eight.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שמיניות עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-kickback','בהטייה, פשיטת מרפק כנגד משקולת','בהטייה פשיטת מרפק כנגד משקולת','{}'::text[],
  'משקולות יד','יד אחורית',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-kickback.mp4","provider":"self-hosted","title":"בהטייה, פשיטת מרפק כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בהטייה, פשיטת מרפק כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-kickback/","name":"בהטייה, פשיטת מרפק כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-kickback.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בהטייה, פשיטת מרפק כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-rollout-from-bench','כפיפות בטן בגלגול מוט מעל ספסל','כפיפות בטן בגלגול מוט מעל ספסל','{}'::text[],
  'מוט','שרירי ליבה',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-rollout-from-bench.mp4","provider":"self-hosted","title":"כפיפות בטן בגלגול מוט מעל ספסל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפות בטן בגלגול מוט מעל ספסל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-rollout-from-bench/","name":"כפיפות בטן בגלגול מוט מעל ספסל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-rollout-from-bench.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפות בטן בגלגול מוט מעל ספסל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-incline-arm-extension','בישיבה בשיפוע, פשיטת מרפקים כנגד פולי תחתון','בישיבה בשיפוע פשיטת מרפקים כנגד פולי תחתון','{}'::text[],
  'כבל פולי','יד אחורית',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-incline-arm-extension.mp4","provider":"self-hosted","title":"בישיבה בשיפוע, פשיטת מרפקים כנגד פולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה בשיפוע, פשיטת מרפקים כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-incline-arm-extension/","name":"בישיבה בשיפוע, פשיטת מרפקים כנגד פולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-incline-arm-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה בשיפוע, פשיטת מרפקים כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-decline-upper-arm-press','בשכיבה פשיטת מרפקים כנגד מוט','בשכיבה פשיטת מרפקים כנגד מוט','{}'::text[],
  'מוט','יד אחורית',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-decline-upper-arm-press.mp4","provider":"self-hosted","title":"בשכיבה פשיטת מרפקים כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פשיטת מרפקים כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-decline-upper-arm-press/","name":"בשכיבה פשיטת מרפקים כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-decline-upper-arm-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פשיטת מרפקים כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-incline-arm-extension','בישיבה בשיפוע פשיטת מרפקים במכונת סמית','בישיבה בשיפוע פשיטת מרפקים במכונת סמית','{}'::text[],
  'מכונת סמית','יד אחורית',array[]::text[],
  'מכונת סמית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-incline-arm-extension.mp4","provider":"self-hosted","title":"בישיבה בשיפוע פשיטת מרפקים במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה בשיפוע פשיטת מרפקים במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-incline-arm-extension/","name":"בישיבה בשיפוע פשיטת מרפקים במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-incline-arm-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה בשיפוע פשיטת מרפקים במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-wide-grip-cable-arm-curl','כפיפת מרפקים כנגד פולי באחיזה רחבה','כפיפת מרפקים כנגד פולי באחיזה רחבה','{}'::text[],
  'כבל פולי','יד קדמית',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/wide-grip-cable-arm-curl.mp4","provider":"self-hosted","title":"כפיפת מרפקים כנגד פולי באחיזה רחבה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים כנגד פולי באחיזה רחבה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wide-grip-cable-arm-curl/","name":"כפיפת מרפקים כנגד פולי באחיזה רחבה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/wide-grip-cable-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים כנגד פולי באחיזה רחבה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-preacher-curl','כפיפת מרפקים בתנוחת כומר כנגד מכונה יעודית','כפיפת מרפקים בתנוחת כומר כנגד מכונה יעודית','{}'::text[],
  'מכונה ייעודית','יד קדמית',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-preacher-curl.mp4","provider":"self-hosted","title":"כפיפת מרפקים בתנוחת כומר כנגד מכונה יעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים בתנוחת כומר כנגד מכונה יעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-preacher-curl/","name":"כפיפת מרפקים בתנוחת כומר כנגד מכונה יעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-preacher-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים בתנוחת כומר כנגד מכונה יעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-stability-ball-crunch','כפיפות גו על כדור פיזיו','כפיפות גו על כדור פיזיו','{}'::text[],
  'כדור פיזיו','שרירי ליבה',array[]::text[],
  'כדור פיזיו','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-crunch.mp4","provider":"self-hosted","title":"כפיפות גו על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפות גו על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/stability-ball-crunch/","name":"כפיפות גו על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפות גו על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-handstand-pushup','לחיצת כתפיים בסמיכה על הידיים ברצועות תלייה','לחיצת כתפיים בסמיכה על הידיים ברצועות תלייה','{}'::text[],
  'רצועות תלייה','כתפיים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-handstand-pushup.mp4","provider":"self-hosted","title":"לחיצת כתפיים בסמיכה על הידיים ברצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים בסמיכה על הידיים ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-handstand-pushup/","name":"לחיצת כתפיים בסמיכה על הידיים ברצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-handstand-pushup.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים בסמיכה על הידיים ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-triceps-kickback','פשיטת מרפקים ברצועות תלייה','פשיטת מרפקים ברצועות תלייה','{}'::text[],
  'רצועות תלייה','יד אחורית',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-triceps-kickback.mp4","provider":"self-hosted","title":"פשיטת מרפקים ברצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-triceps-kickback/","name":"פשיטת מרפקים ברצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-triceps-kickback.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-arm-extension','פשיטת מרפקים בסמיכה ברצועות תליה','פשיטת מרפקים בסמיכה ברצועות תליה','{}'::text[],
  'רצועות תלייה','יד אחורית',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-arm-extension.mp4","provider":"self-hosted","title":"פשיטת מרפקים בסמיכה ברצועות תליה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים בסמיכה ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-arm-extension/","name":"פשיטת מרפקים בסמיכה ברצועות תליה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-arm-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים בסמיכה ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-standing-crunch','בעמידה, כפיפת גו כנגד גומיה','בעמידה כפיפת גו כנגד גומיה','{}'::text[],
  'גומיית התנגדות','שרירי ליבה',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-standing-crunch.mp4","provider":"self-hosted","title":"בעמידה, כפיפת גו כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת גו כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-standing-crunch/","name":"בעמידה, כפיפת גו כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-standing-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת גו כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-seated-waist-twist','בישיבה, פיתול גו אלכסוני כנגד גומיה','בישיבה פיתול גו אלכסוני כנגד גומיה','{}'::text[],
  'גומיית התנגדות','שרירי ליבה',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-seated-waist-twist.mp4","provider":"self-hosted","title":"בישיבה, פיתול גו אלכסוני כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, פיתול גו אלכסוני כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-seated-waist-twist/","name":"בישיבה, פיתול גו אלכסוני כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-seated-waist-twist.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, פיתול גו אלכסוני כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-windmill','תחנת רוח עם קטלבל','תחנת רוח עם קטלבל','{}'::text[],
  'קטלבל','שרירי ליבה',array['כתפיים','יד אחורית']::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-windmill.mp4","provider":"self-hosted","title":"תחנת רוח עם קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל תחנת רוח עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-windmill/","name":"תחנת רוח עם קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-windmill.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל תחנת רוח עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-alternating-press','לחיצת כתפיים לסירוגין כנגד קטלבל','לחיצת כתפיים לסירוגין כנגד קטלבל','{}'::text[],
  'קטלבל','כתפיים',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-alternating-press.mp4","provider":"self-hosted","title":"לחיצת כתפיים לסירוגין כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים לסירוגין כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-alternating-press/","name":"לחיצת כתפיים לסירוגין כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-alternating-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים לסירוגין כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-military-press','לחיצת כתפיים כנגד קטלבל','לחיצת כתפיים כנגד קטלבל','{}'::text[],
  'קטלבל','כתפיים',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-military-press.mp4","provider":"self-hosted","title":"לחיצת כתפיים כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-military-press/","name":"לחיצת כתפיים כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-military-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-forward-y-raise','בעמידה, כפיפה והרחקת כתף כנגד רצועת תלייה','בעמידה כפיפה והרחקת כתף כנגד רצועת תלייה','{}'::text[],
  'רצועות תלייה','כתפיים',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-forward-y-raise.mp4","provider":"self-hosted","title":"בעמידה, כפיפה והרחקת כתף כנגד רצועת תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפה והרחקת כתף כנגד רצועת תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-forward-y-raise/","name":"בעמידה, כפיפה והרחקת כתף כנגד רצועת תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-forward-y-raise.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפה והרחקת כתף כנגד רצועת תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-forward-raise','בעמידה, כפיפת כתף כנגד רצועת תלייה','בעמידה כפיפת כתף כנגד רצועת תלייה','{}'::text[],
  'רצועות תלייה','כתפיים',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-forward-raise.mp4","provider":"self-hosted","title":"בעמידה, כפיפת כתף כנגד רצועת תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת כתף כנגד רצועת תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-forward-raise/","name":"בעמידה, כפיפת כתף כנגד רצועת תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-forward-raise.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת כתף כנגד רצועת תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-stability-ball-pushups','שכיבת סמיכה באחיזה צרה על כדור פיזיו','שכיבת סמיכה באחיזה צרה על כדור פיזיו','{}'::text[],
  'כדור פיזיו','יד אחורית',array[]::text[],
  'כדור פיזיו','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-pushups.mp4","provider":"self-hosted","title":"שכיבת סמיכה באחיזה צרה על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שכיבת סמיכה באחיזה צרה על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/stability-ball-pushups/","name":"שכיבת סמיכה באחיזה צרה על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-pushups.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שכיבת סמיכה באחיזה צרה על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-forward-raise','בעמידה, כפיפת כתף כנגד פולי','בעמידה כפיפת כתף כנגד פולי','{}'::text[],
  'כבל פולי','כתפיים',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-forward-raise.mp4","provider":"self-hosted","title":"בעמידה, כפיפת כתף כנגד פולי"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת כתף כנגד פולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-forward-raise/","name":"בעמידה, כפיפת כתף כנגד פולי"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-forward-raise.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת כתף כנגד פולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-one-arm-lateral-raise','בעמידה הרחקת כתף בזרוע אחת כנגד פולי תחתון','בעמידה הרחקת כתף בזרוע אחת כנגד פולי תחתון','{}'::text[],
  'כבל פולי','כתפיים',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-one-arm-lateral-raise.mp4","provider":"self-hosted","title":"בעמידה הרחקת כתף בזרוע אחת כנגד פולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקת כתף בזרוע אחת כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-one-arm-lateral-raise/","name":"בעמידה הרחקת כתף בזרוע אחת כנגד פולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-one-arm-lateral-raise.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקת כתף בזרוע אחת כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-cuban-press','לחיצה קובאנית נגד משקולות יד','לחיצה קובאנית נגד משקולות יד','{}'::text[],
  'משקולות יד','שכמה',array['כתפיים','גב','יד אחורית']::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-cuban-press.mp4","provider":"self-hosted","title":"לחיצה קובאנית נגד משקולות יד"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצה קובאנית נגד משקולות יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-cuban-press/","name":"לחיצה קובאנית נגד משקולות יד"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-cuban-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצה קובאנית נגד משקולות יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-machine-shoulder-press','לחיצת כתפיים במכונה באחיזה רחבה','לחיצת כתפיים במכונה באחיזה רחבה','{}'::text[],
  'מכונה ייעודית','גב',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/machine-shoulder-press.mp4","provider":"self-hosted","title":"לחיצת כתפיים במכונה באחיזה רחבה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים במכונה באחיזה רחבה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/machine-shoulder-press/","name":"לחיצת כתפיים במכונה באחיזה רחבה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/machine-shoulder-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים במכונה באחיזה רחבה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-flys','פרפר בתלייה ברצועות','פרפר בתלייה ברצועות','{}'::text[],
  'רצועות תלייה','חזה',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-flys.mp4","provider":"self-hosted","title":"פרפר בתלייה ברצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פרפר בתלייה ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-flys/","name":"פרפר בתלייה ברצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-flys.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פרפר בתלייה ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-stability-ball-push-up','שכיבת סמיכה בשיפוע שלילי על כדור פיזיו','שכיבת סמיכה בשיפוע שלילי על כדור פיזיו','{}'::text[],
  'כדור פיזיו','חזה',array[]::text[],
  'כדור פיזיו','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-push-up.mp4","provider":"self-hosted","title":"שכיבת סמיכה בשיפוע שלילי על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שכיבת סמיכה בשיפוע שלילי על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/stability-ball-push-up/","name":"שכיבת סמיכה בשיפוע שלילי על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-push-up.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שכיבת סמיכה בשיפוע שלילי על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-chest-press','לחיצות חזה בסמיכה על רצועות','לחיצות חזה בסמיכה על רצועות','{}'::text[],
  'רצועות תלייה','חזה',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-chest-press.mp4","provider":"self-hosted","title":"לחיצות חזה בסמיכה על רצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצות חזה בסמיכה על רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-chest-press/","name":"לחיצות חזה בסמיכה על רצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-chest-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצות חזה בסמיכה על רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-one-arm-press','בשכיבה, לחיצת חזה ביד אחת עם קטלבל','בשכיבה לחיצת חזה ביד אחת עם קטלבל','{}'::text[],
  'קטלבל','חזה',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-one-arm-press.mp4","provider":"self-hosted","title":"בשכיבה, לחיצת חזה ביד אחת עם קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, לחיצת חזה ביד אחת עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-one-arm-press/","name":"בשכיבה, לחיצת חזה ביד אחת עם קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-one-arm-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, לחיצת חזה ביד אחת עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-legs-pushups','שכיבות סמיכה בתלייה מהרגליים','שכיבות סמיכה בתלייה מהרגליים','{}'::text[],
  'רצועות תלייה','חזה',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-legs-pushups.mp4","provider":"self-hosted","title":"שכיבות סמיכה בתלייה מהרגליים"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שכיבות סמיכה בתלייה מהרגליים, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-legs-pushups/","name":"שכיבות סמיכה בתלייה מהרגליים"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-legs-pushups.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שכיבות סמיכה בתלייה מהרגליים, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-stability-ball-hip-thrust','פשיטת ירך על כדור פיזיו','פשיטת ירך על כדור פיזיו','{}'::text[],
  'כדור פיזיו','רגליים',array[]::text[],
  'כדור פיזיו','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-hip-thrust.mp4","provider":"self-hosted","title":"פשיטת ירך על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/stability-ball-hip-thrust/","name":"פשיטת ירך על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-hip-thrust.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-lateral-walk','הליכת סרטן','הליכת סרטן','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-lateral-walk.mp4","provider":"self-hosted","title":"הליכת סרטן"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל הליכת סרטן, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-lateral-walk/","name":"הליכת סרטן"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-lateral-walk.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל הליכת סרטן, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-machine-row','חתירה אנכית במכונת סמית','חתירה אנכית במכונת סמית','{}'::text[],
  'מכונת סמית','גב',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-row.mp4","provider":"self-hosted","title":"חתירה אנכית במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה אנכית במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-machine-row/","name":"חתירה אנכית במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה אנכית במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-machine-row-2','חתירה במכונת סמית','חתירה במכונת סמית','{}'::text[],
  'מכונת סמית','גב',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-row-2.mp4","provider":"self-hosted","title":"חתירה במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-machine-row-2/","name":"חתירה במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-row-2.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-pullups','עליית מתח ברצועות','עליית מתח ברצועות','{}'::text[],
  'רצועות תלייה','גב',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-pullups.mp4","provider":"self-hosted","title":"עליית מתח ברצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל עליית מתח ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-pullups/","name":"עליית מתח ברצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-pullups.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל עליית מתח ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-alternate-row','בהטייה חתירה ביד אחת לסירוגין כנגד קטלבל','בהטייה חתירה ביד אחת לסירוגין כנגד קטלבל','{}'::text[],
  'קטלבל','גב',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-alternate-row.mp4","provider":"self-hosted","title":"בהטייה חתירה ביד אחת לסירוגין כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בהטייה חתירה ביד אחת לסירוגין כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-alternate-row/","name":"בהטייה חתירה ביד אחת לסירוגין כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-alternate-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בהטייה חתירה ביד אחת לסירוגין כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-wide-grip-row','בשכיבה בשיפוע חתירה אופקית כנגד מוט','בשכיבה בשיפוע חתירה אופקית כנגד מוט','{}'::text[],
  'מוט','גב',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-wide-grip-row.mp4","provider":"self-hosted","title":"בשכיבה בשיפוע חתירה אופקית כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה בשיפוע חתירה אופקית כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-wide-grip-row/","name":"בשכיבה בשיפוע חתירה אופקית כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-wide-grip-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה בשיפוע חתירה אופקית כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-inverted-row','חתירה הפוכה בתלייה','חתירה הפוכה בתלייה','{}'::text[],
  'רצועות תלייה','גב',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-inverted-row.mp4","provider":"self-hosted","title":"חתירה הפוכה בתלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה הפוכה בתלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-inverted-row/","name":"חתירה הפוכה בתלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-inverted-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה הפוכה בתלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-row','בעמידה בהטיה, חתירה כנגד קטלבל','בעמידה בהטיה חתירה כנגד קטלבל','{}'::text[],
  'קטלבל','גב',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-row.mp4","provider":"self-hosted","title":"בעמידה בהטיה, חתירה כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה בהטיה, חתירה כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-row/","name":"בעמידה בהטיה, חתירה כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה בהטיה, חתירה כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-bellbar-pulover','בשכיבה פולאובר כנגד מוט','בשכיבה פולאובר כנגד מוט','{}'::text[],
  'מוט','גב',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bellbar-pulover.mp4","provider":"self-hosted","title":"בשכיבה פולאובר כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פולאובר כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bellbar-pulover/","name":"בשכיבה פולאובר כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bellbar-pulover.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פולאובר כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-renegate-row','בסמיכה חתירה ביד אחת עם קטלבל','בסמיכה חתירה ביד אחת עם קטלבל','{}'::text[],
  'קטלבל','גב',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-renegate-row.mp4","provider":"self-hosted","title":"בסמיכה חתירה ביד אחת עם קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בסמיכה חתירה ביד אחת עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-renegate-row/","name":"בסמיכה חתירה ביד אחת עם קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-renegate-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בסמיכה חתירה ביד אחת עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-hip-thrust','פשיטת ירך עם גומיה','פשיטת ירך עם גומיה','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-hip-thrust.mp4","provider":"self-hosted","title":"פשיטת ירך עם גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך עם גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-hip-thrust/","name":"פשיטת ירך עם גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-hip-thrust.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך עם גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-pull-through-stiff-legged-deadlift','דדליפט ברגל ישרה כנגד פולי תחתון','דדליפט ברגל ישרה כנגד פולי תחתון','{}'::text[],
  'כבל פולי','רגליים',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-pull-through-stiff-legged-deadlift.mp4","provider":"self-hosted","title":"דדליפט ברגל ישרה כנגד פולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל ישרה כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-pull-through-stiff-legged-deadlift/","name":"דדליפט ברגל ישרה כנגד פולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-pull-through-stiff-legged-deadlift.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל ישרה כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-one-leg-stiff-legged-deadlift','דדליפט ברגל אחת ישרה כנגד גומיית התנגדות','דדליפט ברגל אחת ישרה כנגד גומיית התנגדות','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-one-leg-stiff-legged-deadlift.mp4","provider":"self-hosted","title":"דדליפט ברגל אחת ישרה כנגד גומיית התנגדות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל אחת ישרה כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-one-leg-stiff-legged-deadlift/","name":"דדליפט ברגל אחת ישרה כנגד גומיית התנגדות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-one-leg-stiff-legged-deadlift.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל אחת ישרה כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspenders-squat','סקוואט בעזרת רצועות','סקוואט בעזרת רצועות','{}'::text[],
  'רצועות תלייה','רגליים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspenders-squat.mp4","provider":"self-hosted","title":"סקוואט בעזרת רצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל סקוואט בעזרת רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspenders-squat/","name":"סקוואט בעזרת רצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspenders-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל סקוואט בעזרת רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-lunge-front-kick','מכרעים והנפת רגל בתלייה על רצועה','מכרעים והנפת רגל בתלייה על רצועה','{}'::text[],
  'רצועות תלייה','רגליים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-lunge-front-kick.mp4","provider":"self-hosted","title":"מכרעים והנפת רגל בתלייה על רצועה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים והנפת רגל בתלייה על רצועה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-lunge-front-kick/","name":"מכרעים והנפת רגל בתלייה על רצועה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-lunge-front-kick.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים והנפת רגל בתלייה על רצועה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-pistol','שפיפה סקוואט ברגל אחת ("אקדח") ברצועות תליה','שפיפה סקוואט ברגל אחת אקדח ברצועות תליה','{}'::text[],
  'רצועות תלייה','רגליים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-pistol.mp4","provider":"self-hosted","title":"שפיפה סקוואט ברגל אחת (\"אקדח\") ברצועות תליה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה סקוואט ברגל אחת ("אקדח") ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-pistol/","name":"שפיפה סקוואט ברגל אחת (\"אקדח\") ברצועות תליה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-pistol.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה סקוואט ברגל אחת ("אקדח") ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-bulgarian-suspended-lunges','מכרעים בולגריים ברצועות תלייה','מכרעים בולגריים ברצועות תלייה','{}'::text[],
  'רצועות תלייה','רגליים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bulgarian-suspended-lunges.mp4","provider":"self-hosted","title":"מכרעים בולגריים ברצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים בולגריים ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bulgarian-suspended-lunges/","name":"מכרעים בולגריים ברצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bulgarian-suspended-lunges.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים בולגריים ברצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbarian-squat','סקוואט הברברי','סקוואט הברברי','{}'::text[],
  'סטיל מייס','שרירי ליבה',array['גב','רגליים']::text[],
  'סטיל מייס','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbarian-squat.mp4","provider":"self-hosted","title":"סקוואט הברברי"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל סקוואט הברברי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbarian-squat/","name":"סקוואט הברברי"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbarian-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל סקוואט הברברי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-elastic-band-leg-curl','בעמידה כפיפת ברך כנגד רצועה אלסטית','בעמידה כפיפת ברך כנגד רצועה אלסטית','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/elastic-band-leg-curl.mp4","provider":"self-hosted","title":"בעמידה כפיפת ברך כנגד רצועה אלסטית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה כפיפת ברך כנגד רצועה אלסטית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/elastic-band-leg-curl/","name":"בעמידה כפיפת ברך כנגד רצועה אלסטית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/elastic-band-leg-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה כפיפת ברך כנגד רצועה אלסטית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-straps-aided-lunges','מכרעים בעזרת רצועות תלייה','מכרעים בעזרת רצועות תלייה','{}'::text[],
  'רצועות תלייה','רגליים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/straps-aided-lunges.mp4","provider":"self-hosted","title":"מכרעים בעזרת רצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים בעזרת רצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/straps-aided-lunges/","name":"מכרעים בעזרת רצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/straps-aided-lunges.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים בעזרת רצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-concentration-curl','כפיפת ריכוז כנגד גומיה','כפיפת ריכוז כנגד גומיה','{}'::text[],
  'גומיית התנגדות','יד קדמית',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-concentration-curl.mp4","provider":"self-hosted","title":"כפיפת ריכוז כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת ריכוז כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-concentration-curl/","name":"כפיפת ריכוז כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-concentration-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת ריכוז כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-arm-curl','כפיפת מרפקים כנגד פולי','כפיפת מרפקים כנגד פולי','{}'::text[],
  'כבל פולי','יד קדמית',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-arm-curl.mp4","provider":"self-hosted","title":"כפיפת מרפקים כנגד פולי"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים כנגד פולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-arm-curl/","name":"כפיפת מרפקים כנגד פולי"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים כנגד פולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-mountain-climb','מטפס הרים בתלייה על רצועות','מטפס הרים בתלייה על רצועות','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-mountain-climb.mp4","provider":"self-hosted","title":"מטפס הרים בתלייה על רצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מטפס הרים בתלייה על רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-mountain-climb/","name":"מטפס הרים בתלייה על רצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-mountain-climb.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מטפס הרים בתלייה על רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-hip-thrust','פשיטת ירך ברצועות','פשיטת ירך ברצועות','{}'::text[],
  'רצועות תלייה','רגליים',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-hip-thrust.mp4","provider":"self-hosted","title":"פשיטת ירך ברצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-hip-thrust/","name":"פשיטת ירך ברצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-hip-thrust.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך ברצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-leg-extension','בישיבה פשיטת ברך עם רצועה אלסטית','בישיבה פשיטת ברך עם רצועה אלסטית','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-leg-extension.mp4","provider":"self-hosted","title":"בישיבה פשיטת ברך עם רצועה אלסטית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה פשיטת ברך עם רצועה אלסטית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-leg-extension/","name":"בישיבה פשיטת ברך עם רצועה אלסטית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-leg-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה פשיטת ברך עם רצועה אלסטית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-arm-curl','בעמידה, כפיפת מרפקים לסירוגין כנגד גומיה','בעמידה כפיפת מרפקים לסירוגין כנגד גומיה','{}'::text[],
  'גומיית התנגדות','יד קדמית',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-arm-curl.mp4","provider":"self-hosted","title":"בעמידה, כפיפת מרפקים לסירוגין כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת מרפקים לסירוגין כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-arm-curl/","name":"בעמידה, כפיפת מרפקים לסירוגין כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, כפיפת מרפקים לסירוגין כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-face-pull','משיכה אל הפנים ברצועה','משיכה אל הפנים ברצועה','{}'::text[],
  'רצועות תלייה','כתפיים',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-face-pull.mp4","provider":"self-hosted","title":"משיכה אל הפנים ברצועה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה אל הפנים ברצועה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-face-pull/","name":"משיכה אל הפנים ברצועה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-face-pull.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה אל הפנים ברצועה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-face-pull','משיכה אל הפנים','משיכה אל הפנים','{}'::text[],
  'כבל פולי','כתפיים',array[]::text[],
  'כבל פולי ו-גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/face-pull.mp4","provider":"self-hosted","title":"משיכה אל הפנים"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה אל הפנים, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/face-pull/","name":"משיכה אל הפנים"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/face-pull.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה אל הפנים, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-machine-scapula-elevation','בעמידה, הרמת שכמות במכונת סמית','בעמידה הרמת שכמות במכונת סמית','{}'::text[],
  'מכונת סמית','שכמה',array[]::text[],
  'מכונת סמית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-scapula-elevation.mp4","provider":"self-hosted","title":"בעמידה, הרמת שכמות במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, הרמת שכמות במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-machine-scapula-elevation/","name":"בעמידה, הרמת שכמות במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-scapula-elevation.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, הרמת שכמות במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspension-crunch','כפיפת בטן בתלייה על רצועות','כפיפת בטן בתלייה על רצועות','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspension-crunch.mp4","provider":"self-hosted","title":"כפיפת בטן בתלייה על רצועות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת בטן בתלייה על רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspension-crunch/","name":"כפיפת בטן בתלייה על רצועות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspension-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת בטן בתלייה על רצועות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-seated-twist','פיתול אלכסוני במכונה ייעודית','פיתול אלכסוני במכונה ייעודית','{}'::text[],
  'מכונה ייעודית','שרירי ליבה',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-twist.mp4","provider":"self-hosted","title":"פיתול אלכסוני במכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פיתול אלכסוני במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-seated-twist/","name":"פיתול אלכסוני במכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-twist.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פיתול אלכסוני במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-side-bend','בעמידה כפיפת בטן צדית כנגד משקולת','בעמידה כפיפת בטן צדית כנגד משקולת','{}'::text[],
  'משקולות יד','שרירי ליבה',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-side-bend.mp4","provider":"self-hosted","title":"בעמידה כפיפת בטן צדית כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה כפיפת בטן צדית כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-side-bend/","name":"בעמידה כפיפת בטן צדית כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-side-bend.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה כפיפת בטן צדית כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-russian-twist-stability-ball','פיתול רוסי על כדור פיזיו','פיתול רוסי על כדור פיזיו','{}'::text[],
  'כדור פיזיו','שרירי ליבה',array[]::text[],
  'כדור פיזיו','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/russian-twist-stability-ball.mp4","provider":"self-hosted","title":"פיתול רוסי על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פיתול רוסי על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/russian-twist-stability-ball/","name":"פיתול רוסי על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/russian-twist-stability-ball.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פיתול רוסי על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-arm-curls','כפיפת מרפקים כנגד רצועות תלייה','כפיפת מרפקים כנגד רצועות תלייה','{}'::text[],
  'רצועות תלייה','יד קדמית',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-arm-curls.mp4","provider":"self-hosted","title":"כפיפת מרפקים כנגד רצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים כנגד רצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-arm-curls/","name":"כפיפת מרפקים כנגד רצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-arm-curls.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים כנגד רצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-side-plank','פלאנק צדי ברצועות תליה','פלאנק צדי ברצועות תליה','{}'::text[],
  'רצועות תלייה','שרירי ליבה',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-side-plank.mp4","provider":"self-hosted","title":"פלאנק צדי ברצועות תליה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פלאנק צדי ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-side-plank/","name":"פלאנק צדי ברצועות תליה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-side-plank.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פלאנק צדי ברצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-stability-ball-plank','בטן סטטית – פלאנק עם כדור פיזו','בטן סטטית פלאנק עם כדור פיזו','{}'::text[],
  'כדור פיזיו','שרירי ליבה',array[]::text[],
  'כדור פיזיו','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-plank.mp4","provider":"self-hosted","title":"בטן סטטית – פלאנק עם כדור פיזו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בטן סטטית – פלאנק עם כדור פיזו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/stability-ball-plank/","name":"בטן סטטית – פלאנק עם כדור פיזו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/stability-ball-plank.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בטן סטטית – פלאנק עם כדור פיזו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-machine-hip-lift','הרמת אגן אנכית  במכונת סמית','הרמת אגן אנכית במכונת סמית','{}'::text[],
  'מכונת סמית','שרירי ליבה',array[]::text[],
  'מכונת סמית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-hip-lift.mp4","provider":"self-hosted","title":"הרמת אגן אנכית  במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל הרמת אגן אנכית  במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-machine-hip-lift/","name":"הרמת אגן אנכית  במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-hip-lift.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל הרמת אגן אנכית  במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-band-kneeling-crunch','בכריעה על העקבים כפיפת בטן כנגד גומיית התנגדות','בכריעה על העקבים כפיפת בטן כנגד גומיית התנגדות','{}'::text[],
  'גומיית התנגדות','שרירי ליבה',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-kneeling-crunch.mp4","provider":"self-hosted","title":"בכריעה על העקבים כפיפת בטן כנגד גומיית התנגדות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בכריעה על העקבים כפיפת בטן כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/band-kneeling-crunch/","name":"בכריעה על העקבים כפיפת בטן כנגד גומיית התנגדות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/band-kneeling-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בכריעה על העקבים כפיפת בטן כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-kneeling-crunch','בכריעה על העקבים כפיפת בטן כנגד פולי עליון','בכריעה על העקבים כפיפת בטן כנגד פולי עליון','{}'::text[],
  'כבל פולי','שרירי ליבה',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-kneeling-crunch.mp4","provider":"self-hosted","title":"בכריעה על העקבים כפיפת בטן כנגד פולי עליון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בכריעה על העקבים כפיפת בטן כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-kneeling-crunch/","name":"בכריעה על העקבים כפיפת בטן כנגד פולי עליון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-kneeling-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בכריעה על העקבים כפיפת בטן כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-scapula-retraction','בשכיבה קירוב שכמות כנגד משקולות','בשכיבה קירוב שכמות כנגד משקולות','{}'::text[],
  'משקולות יד','שכמה',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/scapula-retraction.mp4","provider":"self-hosted","title":"בשכיבה קירוב שכמות כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה קירוב שכמות כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/scapula-retraction/","name":"בשכיבה קירוב שכמות כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/scapula-retraction.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה קירוב שכמות כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-shrug','בעמידה, הרמת שכמות כנגד משקולות','בעמידה הרמת שכמות כנגד משקולות','{}'::text[],
  'משקולות יד','שכמה',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-shrug.mp4","provider":"self-hosted","title":"בעמידה, הרמת שכמות כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, הרמת שכמות כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-shrug/","name":"בעמידה, הרמת שכמות כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-shrug.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, הרמת שכמות כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-supinated-lever-close-grip-pulldown','משיכה עליונה כנגד מכונה ייעודית באחיזה צרה בסופינציה','משיכה עליונה כנגד מכונה ייעודית באחיזה צרה בסופינציה','{}'::text[],
  'מכונה ייעודית','גב',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/supinated-lever-close-grip-pulldown.mp4","provider":"self-hosted","title":"משיכה עליונה כנגד מכונה ייעודית באחיזה צרה בסופינציה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה עליונה כנגד מכונה ייעודית באחיזה צרה בסופינציה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/supinated-lever-close-grip-pulldown/","name":"משיכה עליונה כנגד מכונה ייעודית באחיזה צרה בסופינציה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/supinated-lever-close-grip-pulldown.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה עליונה כנגד מכונה ייעודית באחיזה צרה בסופינציה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-supinated-band-close-grip-pulldown','משיכה עליונה כנגד גומיה בסופינציה','משיכה עליונה כנגד גומיה בסופינציה','{}'::text[],
  'גומיית התנגדות','גב',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/supinated-band-close-grip-pulldown.mp4","provider":"self-hosted","title":"משיכה עליונה כנגד גומיה בסופינציה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה עליונה כנגד גומיה בסופינציה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/supinated-band-close-grip-pulldown/","name":"משיכה עליונה כנגד גומיה בסופינציה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/supinated-band-close-grip-pulldown.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה עליונה כנגד גומיה בסופינציה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-mid-position-band-close-grip-pulldown','משיכה עליונה כנגד גומיה באחיזה אמצעית','משיכה עליונה כנגד גומיה באחיזה אמצעית','{}'::text[],
  'גומיית התנגדות','גב',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/mid-position-band-close-grip-pulldown.mp4","provider":"self-hosted","title":"משיכה עליונה כנגד גומיה באחיזה אמצעית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה עליונה כנגד גומיה באחיזה אמצעית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/mid-position-band-close-grip-pulldown/","name":"משיכה עליונה כנגד גומיה באחיזה אמצעית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/mid-position-band-close-grip-pulldown.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה עליונה כנגד גומיה באחיזה אמצעית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-one-arm-bent-over-row','בהטיית גו, חתירה ביד אחת כנגד משקולת','בהטיית גו חתירה ביד אחת כנגד משקולת','{}'::text[],
  'משקולות יד','גב',array[]::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-one-arm-bent-over-row.mp4","provider":"self-hosted","title":"בהטיית גו, חתירה ביד אחת כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו, חתירה ביד אחת כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-one-arm-bent-over-row/","name":"בהטיית גו, חתירה ביד אחת כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-one-arm-bent-over-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו, חתירה ביד אחת כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kneeling-leg-curls','בשכיבה, כפיפת ברכיים כנגד מכונה ייעודית','בשכיבה כפיפת ברכיים כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kneeling-leg-curls.mp4","provider":"self-hosted","title":"בשכיבה, כפיפת ברכיים כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת ברכיים כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kneeling-leg-curls/","name":"בשכיבה, כפיפת ברכיים כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kneeling-leg-curls.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת ברכיים כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-swing','סווינג עם קטלבל','סווינג עם קטלבל','{}'::text[],
  'קטלבל','רגליים',array[]::text[],
  'קטלבל','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-swing.mp4","provider":"self-hosted","title":"סווינג עם קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל סווינג עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-swing/","name":"סווינג עם קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-swing.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל סווינג עם קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-resisted-band-seated-chest-press','בישיבה, לחיצת חזה כנגד גומיה','בישיבה לחיצת חזה כנגד גומיה','{}'::text[],
  'גומיית התנגדות','חזה',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/resisted-band-seated-chest-press.mp4","provider":"self-hosted","title":"בישיבה, לחיצת חזה כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, לחיצת חזה כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/resisted-band-seated-chest-press/","name":"בישיבה, לחיצת חזה כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/resisted-band-seated-chest-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, לחיצת חזה כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-shoulder-press','בעמידה לחיצת כתפיים כנגד פולי תחתון','בעמידה לחיצת כתפיים כנגד פולי תחתון','{}'::text[],
  'כבל פולי','כתפיים',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-shoulder-press.mp4","provider":"self-hosted","title":"בעמידה לחיצת כתפיים כנגד פולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה לחיצת כתפיים כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-shoulder-press/","name":"בעמידה לחיצת כתפיים כנגד פולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-shoulder-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה לחיצת כתפיים כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-shoulder-abduction','בעמידה הרחקת כתפיים כנגד משקולות','בעמידה הרחקת כתפיים כנגד משקולות','{}'::text[],
  'משקולות יד','כתפיים',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-shoulder-abduction.mp4","provider":"self-hosted","title":"בעמידה הרחקת כתפיים כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקת כתפיים כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-shoulder-abduction/","name":"בעמידה הרחקת כתפיים כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-shoulder-abduction.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקת כתפיים כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-upright-row','בעמידה חתירה אופקית כנגד מוט','בעמידה חתירה אופקית כנגד מוט','{}'::text[],
  'מוט','כתפיים',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-upright-row.mp4","provider":"self-hosted","title":"בעמידה חתירה אופקית כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה חתירה אופקית כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-upright-row/","name":"בעמידה חתירה אופקית כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-upright-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה חתירה אופקית כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-shoulder-press','לחיצת כתפיים באחיזה צרה כנגד מכונה ייעודית','לחיצת כתפיים באחיזה צרה כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','כתפיים',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-shoulder-press.mp4","provider":"self-hosted","title":"לחיצת כתפיים באחיזה צרה כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים באחיזה צרה כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-shoulder-press/","name":"לחיצת כתפיים באחיזה צרה כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-shoulder-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת כתפיים באחיזה צרה כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-machine-standing-military-press','בישיבה לחיצת כתפיים באחיזה צרה במכונת סמית','בישיבה לחיצת כתפיים באחיזה צרה במכונת סמית','{}'::text[],
  'מכונת סמית','כתפיים',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-standing-military-press.mp4","provider":"self-hosted","title":"בישיבה לחיצת כתפיים באחיזה צרה במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה לחיצת כתפיים באחיזה צרה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-machine-standing-military-press/","name":"בישיבה לחיצת כתפיים באחיזה צרה במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-standing-military-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה לחיצת כתפיים באחיזה צרה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-standing-military-press','בעמידה לחיצת כתפיים באחיזה צרה כנגד מוט','בעמידה לחיצת כתפיים באחיזה צרה כנגד מוט','{}'::text[],
  'מוט','כתפיים',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-standing-military-press.mp4","provider":"self-hosted","title":"בעמידה לחיצת כתפיים באחיזה צרה כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה לחיצת כתפיים באחיזה צרה כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-standing-military-press/","name":"בעמידה לחיצת כתפיים באחיזה צרה כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-standing-military-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה לחיצת כתפיים באחיזה צרה כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-lying-t-bar-row','חתירה כנגד מוט T','חתירה כנגד מוט t','{}'::text[],
  'מכונה ייעודית','גב',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-lying-t-bar-row.mp4","provider":"self-hosted","title":"חתירה כנגד מוט T"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה כנגד מוט T, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-lying-t-bar-row/","name":"חתירה כנגד מוט T"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-lying-t-bar-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה כנגד מוט T, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-row','חתירה כנגד רצועות תליה','חתירה כנגד רצועות תליה','{}'::text[],
  'רצועות תלייה','גב',array[]::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-row.mp4","provider":"self-hosted","title":"חתירה כנגד רצועות תליה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה כנגד רצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-row/","name":"חתירה כנגד רצועות תליה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה כנגד רצועות תליה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-standing-band-row','בעמידה חתירה כנגד גומיית התנגדות','בעמידה חתירה כנגד גומיית התנגדות','{}'::text[],
  'גומיית התנגדות','גב',array[]::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-band-row.mp4","provider":"self-hosted","title":"בעמידה חתירה כנגד גומיית התנגדות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה חתירה כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/standing-band-row/","name":"בעמידה חתירה כנגד גומיית התנגדות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-band-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה חתירה כנגד גומיית התנגדות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-seated-row-back','בישיבה חתירה כנגד כבל פולי','בישיבה חתירה כנגד כבל פולי','{}'::text[],
  'כבל פולי','גב',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-seated-row-back.mp4","provider":"self-hosted","title":"בישיבה חתירה כנגד כבל פולי"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה חתירה כנגד כבל פולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-seated-row-back/","name":"בישיבה חתירה כנגד כבל פולי"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-seated-row-back.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה חתירה כנגד כבל פולי, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-straight-arm-pullover-stability-ball','בשכיבה על כדור פיזיו פולאובר כנגד משקולת','בשכיבה על כדור פיזיו פולאובר כנגד משקולת','{}'::text[],
  'משקולות יד','גב',array[]::text[],
  'משקולות יד ו-כדור פיזיו','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-straight-arm-pullover-stability-ball.mp4","provider":"self-hosted","title":"בשכיבה על כדור פיזיו פולאובר כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה על כדור פיזיו פולאובר כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-straight-arm-pullover-stability-ball/","name":"בשכיבה על כדור פיזיו פולאובר כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-straight-arm-pullover-stability-ball.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה על כדור פיזיו פולאובר כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-straight-arm-pullover','בשכיבה פולאובר כנגד משקולת','בשכיבה פולאובר כנגד משקולת','{}'::text[],
  'משקולות יד','גב',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-straight-arm-pullover.mp4","provider":"self-hosted","title":"בשכיבה פולאובר כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פולאובר כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-straight-arm-pullover/","name":"בשכיבה פולאובר כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-straight-arm-pullover.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה פולאובר כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-stiff-legged-deadlift-copy','דדליפט ברגל ישרה  כנגד משקולות','דדליפט ברגל ישרה כנגד משקולות','{}'::text[],
  'משקולות יד','רגליים',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-stiff-legged-deadlift-copy.mp4","provider":"self-hosted","title":"דדליפט ברגל ישרה  כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל ישרה  כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-stiff-legged-deadlift-copy/","name":"דדליפט ברגל ישרה  כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-stiff-legged-deadlift-copy.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל ישרה  כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-bench-press','לחיצת חזה כנגד כבל','לחיצת חזה כנגד כבל','{}'::text[],
  'כבל פולי','חזה',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-bench-press.mp4","provider":"self-hosted","title":"לחיצת חזה כנגד כבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה כנגד כבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-bench-press/","name":"לחיצת חזה כנגד כבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-bench-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה כנגד כבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-straight-arm-pulldown','בעמידה פולאובר כנגד פולי עליון','בעמידה פולאובר כנגד פולי עליון','{}'::text[],
  'כבל פולי','גב',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-straight-arm-pulldown.mp4","provider":"self-hosted","title":"בעמידה פולאובר כנגד פולי עליון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה פולאובר כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-straight-arm-pulldown/","name":"בעמידה פולאובר כנגד פולי עליון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-straight-arm-pulldown.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה פולאובר כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-seated-leg-raise-crunch','כפיפת ירך ובטן במכונה ייעודית','כפיפת ירך ובטן במכונה ייעודית','{}'::text[],
  'מכונה ייעודית','שרירי ליבה',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-leg-raise-crunch.mp4","provider":"self-hosted","title":"כפיפת ירך ובטן במכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת ירך ובטן במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-seated-leg-raise-crunch/","name":"כפיפת ירך ובטן במכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-leg-raise-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת ירך ובטן במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-lying-crunch','כפיפת בטן במכונה ייעודית','כפיפת בטן במכונה ייעודית','{}'::text[],
  'מכונה ייעודית','שרירי ליבה',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-lying-crunch.mp4","provider":"self-hosted","title":"כפיפת בטן במכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת בטן במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-lying-crunch/","name":"כפיפת בטן במכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-lying-crunch.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת בטן במכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-alternating-dumbbell-arm-curl','בישיבה כפיפת מרפק לסירוגין כנגד משקולת יד','בישיבה כפיפת מרפק לסירוגין כנגד משקולת יד','{}'::text[],
  'משקולות יד','יד קדמית',array[]::text[],
  'משקולות יד ו-כדור פיזיו','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/alternating-dumbbell-arm-curl.mp4","provider":"self-hosted","title":"בישיבה כפיפת מרפק לסירוגין כנגד משקולת יד"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה כפיפת מרפק לסירוגין כנגד משקולת יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/alternating-dumbbell-arm-curl/","name":"בישיבה כפיפת מרפק לסירוגין כנגד משקולת יד"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/alternating-dumbbell-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה כפיפת מרפק לסירוגין כנגד משקולת יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-preacher-bench-arm-curl','כפיפת מרפקים בכסא כומר כנגד משקולות','כפיפת מרפקים בכסא כומר כנגד משקולות','{}'::text[],
  'משקולות יד','יד קדמית',array[]::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-preacher-bench-arm-curl.mp4","provider":"self-hosted","title":"כפיפת מרפקים בכסא כומר כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים בכסא כומר כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-preacher-bench-arm-curl/","name":"כפיפת מרפקים בכסא כומר כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-preacher-bench-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים בכסא כומר כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbbell-bent-over-row','בהטיית גו , חתירה כנגד משקולת יד','בהטיית גו חתירה כנגד משקולת יד','{}'::text[],
  'משקולות יד','גב',array[]::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-bent-over-row.mp4","provider":"self-hosted","title":"בהטיית גו , חתירה כנגד משקולת יד"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו , חתירה כנגד משקולת יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-bent-over-row/","name":"בהטיית גו , חתירה כנגד משקולת יד"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbbell-bent-over-row.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו , חתירה כנגד משקולת יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-bar-preacher-bench-arm-curl','כפיפת מרפקים בכסא כומר כנגד מוט','כפיפת מרפקים בכסא כומר כנגד מוט','{}'::text[],
  'מוט','יד קדמית',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bar-preacher-bench-arm-curl.mp4","provider":"self-hosted","title":"כפיפת מרפקים בכסא כומר כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים בכסא כומר כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bar-preacher-bench-arm-curl/","name":"כפיפת מרפקים בכסא כומר כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bar-preacher-bench-arm-curl.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפת מרפקים בכסא כומר כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-good-morning','בוקר טוב','בוקר טוב','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/good-morning.mp4","provider":"self-hosted","title":"בוקר טוב"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בוקר טוב, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/good-morning/","name":"בוקר טוב"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/good-morning.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בוקר טוב, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspended-one-hand-pull','חתירה ופרפר כנגד רצועה','חתירה ופרפר כנגד רצועה','{}'::text[],
  'רצועות תלייה','גב',array['חזה','רגליים']::text[],
  'רצועות תלייה','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-one-hand-pull.mp4","provider":"self-hosted","title":"חתירה ופרפר כנגד רצועה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה ופרפר כנגד רצועה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspended-one-hand-pull/","name":"חתירה ופרפר כנגד רצועה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspended-one-hand-pull.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל חתירה ופרפר כנגד רצועה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-ab-rollout','כפיפות בטן בגלגול מוט','כפיפות בטן בגלגול מוט','{}'::text[],
  'מוט','שרירי ליבה',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-ab-rollout.mp4","provider":"self-hosted","title":"כפיפות בטן בגלגול מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפות בטן בגלגול מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-ab-rollout/","name":"כפיפות בטן בגלגול מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-ab-rollout.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל כפיפות בטן בגלגול מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-farmer-walk','הליכת האיכר','הליכת האיכר','{}'::text[],
  'משקולות יד','רגליים',array[]::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/farmer-walk.mp4","provider":"self-hosted","title":"הליכת האיכר"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל הליכת האיכר, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/farmer-walk/","name":"הליכת האיכר"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/farmer-walk.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל הליכת האיכר, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-triceps-pushdown','פשיטת מרפקים כנגד פולי עליון','פשיטת מרפקים כנגד פולי עליון','{}'::text[],
  'כבל פולי','יד אחורית',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-triceps-pushdown.mp4","provider":"self-hosted","title":"פשיטת מרפקים כנגד פולי עליון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/%d7%a4%d7%a9%d7%99%d7%98%d7%aa-%d7%9e%d7%a8%d7%a4%d7%a7%d7%99%d7%9d-%d7%9b%d7%a0%d7%92%d7%93-%d7%a4%d7%95%d7%9c%d7%99-%d7%a2%d7%9c%d7%99%d7%95%d7%9f/","name":"פשיטת מרפקים כנגד פולי עליון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-triceps-pushdown.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת מרפקים כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-narrow-grip-pull-up-graviton','עליית מתח באחיזה צרה בגרביטון','עליית מתח באחיזה צרה בגרביטון','{}'::text[],
  'מכונה ייעודית','גב',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/narrow-grip-pull-up-graviton.mp4","provider":"self-hosted","title":"עליית מתח באחיזה צרה בגרביטון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל עליית מתח באחיזה צרה בגרביטון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/narrow-grip-pull-up-graviton/","name":"עליית מתח באחיזה צרה בגרביטון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/narrow-grip-pull-up-graviton.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל עליית מתח באחיזה צרה בגרביטון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-suspender-reverse-flys','בעמידה הרחקה אופקית בכתף כנגד רצועות תלייה','בעמידה הרחקה אופקית בכתף כנגד רצועות תלייה','{}'::text[],
  'רצועות תלייה','כתפיים',array[]::text[],
  'רצועות תלייה','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-reverse-flys.mp4","provider":"self-hosted","title":"בעמידה הרחקה אופקית בכתף כנגד רצועות תלייה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקה אופקית בכתף כנגד רצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/suspender-reverse-flys/","name":"בעמידה הרחקה אופקית בכתף כנגד רצועות תלייה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/suspender-reverse-flys.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקה אופקית בכתף כנגד רצועות תלייה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-seated-reverse-flys','בישיבה הרחקה אופקית בכתף כנגד מכונה ייעודית','בישיבה הרחקה אופקית בכתף כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','כתפיים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-reverse-flys.mp4","provider":"self-hosted","title":"בישיבה הרחקה אופקית בכתף כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה הרחקה אופקית בכתף כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-seated-reverse-flys/","name":"בישיבה הרחקה אופקית בכתף כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-reverse-flys.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה הרחקה אופקית בכתף כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-turkish-getup','קימה טורקית','קימה טורקית','{}'::text[],
  'קטלבל','רגליים',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/turkish-getup.mp4","provider":"self-hosted","title":"קימה טורקית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל קימה טורקית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/turkish-getup/","name":"קימה טורקית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/turkish-getup.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל קימה טורקית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-wide-grip-lat-pull-down-behind-neck','משיכה באמצעות פולי עליון באחיזה רחבה אל מאחורי הראש','משיכה באמצעות פולי עליון באחיזה רחבה אל מאחורי הראש','{}'::text[],
  'כבל פולי','גב',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/wide-grip-lat-pull-down-behind-neck.mp4","provider":"self-hosted","title":"משיכה באמצעות פולי עליון באחיזה רחבה אל מאחורי הראש"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה באמצעות פולי עליון באחיזה רחבה אל מאחורי הראש, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wide-grip-lat-pull-down-behind-neck/","name":"משיכה באמצעות פולי עליון באחיזה רחבה אל מאחורי הראש"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/wide-grip-lat-pull-down-behind-neck.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה באמצעות פולי עליון באחיזה רחבה אל מאחורי הראש, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-narrow-grip-lat-pull-down','משיכה באמצעות פולי עליון באחיזה צרה','משיכה באמצעות פולי עליון באחיזה צרה','{}'::text[],
  'כבל פולי','גב',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/narrow-grip-lat-pull-down.mp4","provider":"self-hosted","title":"משיכה באמצעות פולי עליון באחיזה צרה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה באמצעות פולי עליון באחיזה צרה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/narrow-grip-lat-pull-down/","name":"משיכה באמצעות פולי עליון באחיזה צרה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/narrow-grip-lat-pull-down.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה באמצעות פולי עליון באחיזה צרה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-rope-climbing','טיפוס על חבל','טיפוס על חבל','{}'::text[],
  'חבל קרב','גב',array[]::text[],
  'חבל קרב','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/rope-climbing.mp4","provider":"self-hosted","title":"טיפוס על חבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל טיפוס על חבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/rope-climbing/","name":"טיפוס על חבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/rope-climbing.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל טיפוס על חבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-pulley-narrow-grip-lat-supinated-pull-down','משיכה באמצעות פולי עליון באחיזה צרה בסופינציה','משיכה באמצעות פולי עליון באחיזה צרה בסופינציה','{}'::text[],
  'כבל פולי','גב',array[]::text[],
  'כבל פולי','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/pulley-narrow-grip-lat-supinated-pull-down.mp4","provider":"self-hosted","title":"משיכה באמצעות פולי עליון באחיזה צרה בסופינציה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה באמצעות פולי עליון באחיזה צרה בסופינציה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/pulley-narrow-grip-lat-supinated-pull-down/","name":"משיכה באמצעות פולי עליון באחיזה צרה בסופינציה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/pulley-narrow-grip-lat-supinated-pull-down.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל משיכה באמצעות פולי עליון באחיזה צרה בסופינציה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-crossovers','בהטיית גו, פרפר כנגד פולי עליון','בהטיית גו פרפר כנגד פולי עליון','{}'::text[],
  'כבל פולי','חזה',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-crossovers.mp4","provider":"self-hosted","title":"בהטיית גו, פרפר כנגד פולי עליון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו, פרפר כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-crossovers/","name":"בהטיית גו, פרפר כנגד פולי עליון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-crossovers.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בהטיית גו, פרפר כנגד פולי עליון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-standing-calf-raise-smith-machine','בעמידה הרמת עקבים כנגד מכונת סמית','בעמידה הרמת עקבים כנגד מכונת סמית','{}'::text[],
  'מכונת סמית','רגליים',array[]::text[],
  'מכונת סמית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-calf-raise-smith-machine.mp4","provider":"self-hosted","title":"בעמידה הרמת עקבים כנגד מכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרמת עקבים כנגד מכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/standing-calf-raise-smith-machine/","name":"בעמידה הרמת עקבים כנגד מכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-calf-raise-smith-machine.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרמת עקבים כנגד מכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-flys','בשכיבה, פרפר כנגד משקולות','בשכיבה פרפר כנגד משקולות','{}'::text[],
  'משקולות יד','חזה',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/flys.mp4","provider":"self-hosted","title":"בשכיבה, פרפר כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, פרפר כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/flys/","name":"בשכיבה, פרפר כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/flys.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, פרפר כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-plantar-flexion-dumbbell','הרמת עקבים כנגד משקולת יד','הרמת עקבים כנגד משקולת יד','{}'::text[],
  'משקולות יד','רגליים',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/plantar-flexion-dumbbell.mp4","provider":"self-hosted","title":"הרמת עקבים כנגד משקולת יד"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל הרמת עקבים כנגד משקולת יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/plantar-flexion-dumbbell/","name":"הרמת עקבים כנגד משקולת יד"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/plantar-flexion-dumbbell.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל הרמת עקבים כנגד משקולת יד, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lower-pully-flys','בשכיבה, פרפר עם כבל קרוס מפולי תחתון','בשכיבה פרפר עם כבל קרוס מפולי תחתון','{}'::text[],
  'כבל פולי','חזה',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lower-pully-flys.mp4","provider":"self-hosted","title":"בשכיבה, פרפר עם כבל קרוס מפולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, פרפר עם כבל קרוס מפולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lower-pully-flys/","name":"בשכיבה, פרפר עם כבל קרוס מפולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lower-pully-flys.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, פרפר עם כבל קרוס מפולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-hip-thrust','פשיטת ירך (גשר) כנגד מוט','פשיטת ירך גשר כנגד מוט','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-hip-thrust.mp4","provider":"self-hosted","title":"פשיטת ירך (גשר) כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך (גשר) כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-hip-thrust/","name":"פשיטת ירך (גשר) כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-hip-thrust.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך (גשר) כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-alternate-hip-flexion','בשכיבה, כפיפת ירך לסירוגין','בשכיבה כפיפת ירך לסירוגין','{}'::text[],
  'כבל פולי','רגליים',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/alternate-hip-flexion.mp4","provider":"self-hosted","title":"בשכיבה, כפיפת ירך לסירוגין"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת ירך לסירוגין, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/alternate-hip-flexion/","name":"בשכיבה, כפיפת ירך לסירוגין"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/alternate-hip-flexion.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת ירך לסירוגין, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lever-seated-hip-adduction','בישיבה, קירוב ירך כנגד מכונה ייעודית','בישיבה קירוב ירך כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-hip-adduction.mp4","provider":"self-hosted","title":"בישיבה, קירוב ירך כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, קירוב ירך כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lever-seated-hip-adduction/","name":"בישיבה, קירוב ירך כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lever-seated-hip-adduction.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, קירוב ירך כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-sitting-hip-abduction-machine','בישיבה הרחקת ירך כנגד מכונה ייעודית','בישיבה הרחקת ירך כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/sitting-hip-abduction-machine.mp4","provider":"self-hosted","title":"בישיבה הרחקת ירך כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה הרחקת ירך כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/sitting-hip-abduction-machine/","name":"בישיבה הרחקת ירך כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/sitting-hip-abduction-machine.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה הרחקת ירך כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-deadlift-kettlebell','דדליפט ברגל אחת כנגד קטלבל','דדליפט ברגל אחת כנגד קטלבל','{}'::text[],
  'קטלבל','רגליים',array[]::text[],
  'קטלבל','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/deadlift-kettlebell.mp4","provider":"self-hosted","title":"דדליפט ברגל אחת כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל אחת כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/deadlift-kettlebell/","name":"דדליפט ברגל אחת כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/deadlift-kettlebell.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל אחת כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-decline-bench-press','לחיצת חזה בשיפוע שלילי כנגד מוט','לחיצת חזה בשיפוע שלילי כנגד מוט','{}'::text[],
  'מוט','חזה',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-decline-bench-press.mp4","provider":"self-hosted","title":"לחיצת חזה בשיפוע שלילי כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה בשיפוע שלילי כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-decline-bench-press/","name":"לחיצת חזה בשיפוע שלילי כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-decline-bench-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה בשיפוע שלילי כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-incline-bench-press','לחיצת חזה בשיפוע חיובי כנגד מוט','לחיצת חזה בשיפוע חיובי כנגד מוט','{}'::text[],
  'מוט','חזה',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-incline-bench-press.mp4","provider":"self-hosted","title":"לחיצת חזה בשיפוע חיובי כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה בשיפוע חיובי כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-incline-bench-press/","name":"לחיצת חזה בשיפוע חיובי כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-incline-bench-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה בשיפוע חיובי כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-flys-machine','פרפר כנגד מכונה ייעודית','פרפר כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','חזה',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/flys-machine.mp4","provider":"self-hosted","title":"פרפר כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פרפר כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/flys-machine/","name":"פרפר כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/flys-machine.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פרפר כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-battling-ropes-alternate-arms-squat','גל לסירוגין בשפיפה עם חבל','גל לסירוגין בשפיפה עם חבל','{}'::text[],
  'חבל קרב','רגליים',array[]::text[],
  'חבל קרב','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/battling-ropes-alternate-arms-squat.mp4","provider":"self-hosted","title":"גל לסירוגין בשפיפה עם חבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל גל לסירוגין בשפיפה עם חבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/battling-ropes-alternate-arms-squat/","name":"גל לסירוגין בשפיפה עם חבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/battling-ropes-alternate-arms-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל גל לסירוגין בשפיפה עם חבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-smith-machine-bench-press','לחיצת חזה במכונת סמית','לחיצת חזה במכונת סמית','{}'::text[],
  'מכונת סמית','חזה',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-bench-press.mp4","provider":"self-hosted","title":"לחיצת חזה במכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/smith-machine-bench-press/","name":"לחיצת חזה במכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/smith-machine-bench-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה במכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-dumbell-bench-press','לחיצת חזה כנגד משקולות','לחיצת חזה כנגד משקולות','{}'::text[],
  'משקולות יד','חזה',array[]::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbell-bench-press.mp4","provider":"self-hosted","title":"לחיצת חזה כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbell-bench-press/","name":"לחיצת חזה כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/dumbell-bench-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-seated-machine-chest-press','לחיצת חזה כנגד מכונה ייעודית','לחיצת חזה כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','חזה',array[]::text[],
  'מכונה ייעודית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/seated-machine-chest-press.mp4","provider":"self-hosted","title":"לחיצת חזה כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/seated-machine-chest-press/","name":"לחיצת חזה כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/seated-machine-chest-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-flat-bench-press-narrow-grip','לחיצת חזה באחיזה צרה במוט','לחיצת חזה באחיזה צרה במוט','{}'::text[],
  'מוט','יד אחורית',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/flat-bench-press-narrow-grip.mp4","provider":"self-hosted","title":"לחיצת חזה באחיזה צרה במוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה באחיזה צרה במוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/flat-bench-press-narrow-grip/","name":"לחיצת חזה באחיזה צרה במוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/flat-bench-press-narrow-grip.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת חזה באחיזה צרה במוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-guilliotine-bench-press','לחיצת גיליוטינה כנגד מוט','לחיצת גיליוטינה כנגד מוט','{}'::text[],
  'מוט','חזה',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/guilliotine-bench-press.mp4","provider":"self-hosted","title":"לחיצת גיליוטינה כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת גיליוטינה כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/guilliotine-bench-press/","name":"לחיצת גיליוטינה כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/guilliotine-bench-press.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל לחיצת גיליוטינה כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-bellbar-stiff-legged-deadlift','דדליפט ברגל ישרה כנגד מוט','דדליפט ברגל ישרה כנגד מוט','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bellbar-stiff-legged-deadlift.mp4","provider":"self-hosted","title":"דדליפט ברגל ישרה כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל ישרה כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bellbar-stiff-legged-deadlift/","name":"דדליפט ברגל ישרה כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bellbar-stiff-legged-deadlift.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט ברגל ישרה כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-deadlift','דדליפט כנגד קטלבל','דדליפט כנגד קטלבל','{}'::text[],
  'קטלבל','רגליים',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-deadlift.mp4","provider":"self-hosted","title":"דדליפט כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-deadlift/","name":"דדליפט כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-deadlift.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-bellbar-deadlift','דדליפט כנגד מוט','דדליפט כנגד מוט','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bellbar-deadlift.mp4","provider":"self-hosted","title":"דדליפט כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bellbar-deadlift/","name":"דדליפט כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bellbar-deadlift.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל דדליפט כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-hip-extension','פשיטת ירך כנגד פולי תחתון','פשיטת ירך כנגד פולי תחתון','{}'::text[],
  'כבל פולי','רגליים',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-hip-extension.mp4","provider":"self-hosted","title":"פשיטת ירך כנגד פולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-hip-extension/","name":"פשיטת ירך כנגד פולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-hip-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ירך כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-cable-hip-adduction','קירוב ירך כנגד פולי תחתון','קירוב ירך כנגד פולי תחתון','{}'::text[],
  'כבל פולי','רגליים',array[]::text[],
  'כבל פולי','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-hip-adduction.mp4","provider":"self-hosted","title":"קירוב ירך כנגד פולי תחתון"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל קירוב ירך כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-hip-adduction/","name":"קירוב ירך כנגד פולי תחתון"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/cable-hip-adduction.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל קירוב ירך כנגד פולי תחתון, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-standing-w-machine-hip-adduction','בעמידה, קירוב ירך כנגד מכונה','בעמידה קירוב ירך כנגד מכונה','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-w-machine-hip-adduction.mp4","provider":"self-hosted","title":"בעמידה, קירוב ירך כנגד מכונה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, קירוב ירך כנגד מכונה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/standing-w-machine-hip-adduction/","name":"בעמידה, קירוב ירך כנגד מכונה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-w-machine-hip-adduction.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה, קירוב ירך כנגד מכונה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-standing-hip-abduction-machine','בעמידה הרחקת ירך כנגד מכונה ייעודית','בעמידה הרחקת ירך כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-hip-abduction-machine.mp4","provider":"self-hosted","title":"בעמידה הרחקת ירך כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקת ירך כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/standing-hip-abduction-machine/","name":"בעמידה הרחקת ירך כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/standing-hip-abduction-machine.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בעמידה הרחקת ירך כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-leg-curls-with-resistance-band','בישיבה, כפיפת ברכיים כנגד גומיה','בישיבה כפיפת ברכיים כנגד גומיה','{}'::text[],
  'גומיית התנגדות','רגליים',array[]::text[],
  'גומיית התנגדות','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/leg-curls-with-resistance-band.mp4","provider":"self-hosted","title":"בישיבה, כפיפת ברכיים כנגד גומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, כפיפת ברכיים כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/leg-curls-with-resistance-band/","name":"בישיבה, כפיפת ברכיים כנגד גומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/leg-curls-with-resistance-band.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, כפיפת ברכיים כנגד גומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-leg-curls-with-dumbbells','בשכיבה, כפיפת ברכיים כנגד משקולת','בשכיבה כפיפת ברכיים כנגד משקולת','{}'::text[],
  'משקולות יד','רגליים',array[]::text[],
  'משקולות יד','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/leg-curls-with-dumbbells.mp4","provider":"self-hosted","title":"בשכיבה, כפיפת ברכיים כנגד משקולת"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת ברכיים כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/leg-curls-with-dumbbells/","name":"בשכיבה, כפיפת ברכיים כנגד משקולת"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/leg-curls-with-dumbbells.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בשכיבה, כפיפת ברכיים כנגד משקולת, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-seated-leg-curls-2','בישיבה, כפיפת ברכיים כנגד מכונה ייעודית','בישיבה כפיפת ברכיים כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/seated-leg-curls-2.mp4","provider":"self-hosted","title":"בישיבה, כפיפת ברכיים כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, כפיפת ברכיים כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/seated-leg-curls-2/","name":"בישיבה, כפיפת ברכיים כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/seated-leg-curls-2.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל בישיבה, כפיפת ברכיים כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-leg-extension','פשיטת ברכיים כנגד מכונה ייעודית','פשיטת ברכיים כנגד מכונה ייעודית','{}'::text[],
  'מכונה ייעודית','רגליים',array[]::text[],
  'מכונה ייעודית','מתחילים','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/leg-extension.mp4","provider":"self-hosted","title":"פשיטת ברכיים כנגד מכונה ייעודית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ברכיים כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/leg-extension/","name":"פשיטת ברכיים כנגד מכונה ייעודית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/leg-extension.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל פשיטת ברכיים כנגד מכונה ייעודית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-kettlebell-goblet-squat','שפיפה – סקוואט כנגד קטלבל','שפיפה סקוואט כנגד קטלבל','{}'::text[],
  'קטלבל','רגליים',array[]::text[],
  'קטלבל','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-goblet-squat.mp4","provider":"self-hosted","title":"שפיפה – סקוואט כנגד קטלבל"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kettlebell-goblet-squat/","name":"שפיפה – סקוואט כנגד קטלבל"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/kettlebell-goblet-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד קטלבל, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-0band-thruster','שפיפה – סקוואט ולחיצת כתפיים בגומיה','שפיפה סקוואט ולחיצת כתפיים בגומיה','{}'::text[],
  'גומיית התנגדות','כתפיים',array['רגליים']::text[],
  'גומיית התנגדות','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/0band-thruster.mp4","provider":"self-hosted","title":"שפיפה – סקוואט ולחיצת כתפיים בגומיה"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט ולחיצת כתפיים בגומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/0band-thruster/","name":"שפיפה – סקוואט ולחיצת כתפיים בגומיה"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/0band-thruster.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט ולחיצת כתפיים בגומיה, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-landmind-thrust','שפיפה – סקוואט ולחיצת כתפיים במוט','שפיפה סקוואט ולחיצת כתפיים במוט','{}'::text[],
  'מוט','כתפיים',array['רגליים']::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/landmind-thrust.mp4","provider":"self-hosted","title":"שפיפה – סקוואט ולחיצת כתפיים במוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט ולחיצת כתפיים במוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/landmind-thrust/","name":"שפיפה – סקוואט ולחיצת כתפיים במוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/landmind-thrust.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט ולחיצת כתפיים במוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lunges-with-smith-machine','מכרעים כנגד מכונת סמית','מכרעים כנגד מכונת סמית','{}'::text[],
  'מכונת סמית','רגליים',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lunges-with-smith-machine.mp4","provider":"self-hosted","title":"מכרעים כנגד מכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים כנגד מכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lunges-with-smith-machine/","name":"מכרעים כנגד מכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lunges-with-smith-machine.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים כנגד מכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-lunges-with-dumbells','מכרעים כנגד משקולות','מכרעים כנגד משקולות','{}'::text[],
  'משקולות יד','רגליים',array[]::text[],
  'משקולות יד','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lunges-with-dumbells.mp4","provider":"self-hosted","title":"מכרעים כנגד משקולות"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/lunges-with-dumbells/","name":"מכרעים כנגד משקולות"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/lunges-with-dumbells.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים כנגד משקולות, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-barbell-lunges','מכרעים כנגד מוט','מכרעים כנגד מוט','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-lunges.mp4","provider":"self-hosted","title":"מכרעים כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/barbell-lunges/","name":"מכרעים כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/barbell-lunges.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל מכרעים כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-squat-stability-ball','סקוואט על כדור פיזיו','סקוואט על כדור פיזיו','{}'::text[],
  'כדור פיזיו','רגליים',array[]::text[],
  'כדור פיזיו','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/squat-stability-ball.mp4","provider":"self-hosted","title":"סקוואט על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל סקוואט על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat-stability-ball/","name":"סקוואט על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/squat-stability-ball.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל סקוואט על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-squat-stability-ball-2','שפיפה – סקוואט על כדור פיזיו','שפיפה סקוואט על כדור פיזיו','{}'::text[],
  'כדור פיזיו','רגליים',array[]::text[],
  'כדור פיזיו','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/squat-stability-ball-2.mp4","provider":"self-hosted","title":"שפיפה – סקוואט על כדור פיזיו"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat-stability-ball-2/","name":"שפיפה – סקוואט על כדור פיזיו"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/squat-stability-ball-2.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט על כדור פיזיו, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-squat-smith-machine','שפיפה – סקוואט כנגד מכונת סמית','שפיפה סקוואט כנגד מכונת סמית','{}'::text[],
  'מכונת סמית','רגליים',array[]::text[],
  'מכונת סמית','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/squat-smith-machine.mp4","provider":"self-hosted","title":"שפיפה – סקוואט כנגד מכונת סמית"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד מכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat-smith-machine/","name":"שפיפה – סקוואט כנגד מכונת סמית"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/squat-smith-machine.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד מכונת סמית, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-front-squat','שפיפה – סקוואט קדמי כנגד מוט','שפיפה סקוואט קדמי כנגד מוט','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/front-squat.mp4","provider":"self-hosted","title":"שפיפה – סקוואט קדמי כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט קדמי כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/front-squat/","name":"שפיפה – סקוואט קדמי כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/front-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט קדמי כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'resistance-bar-squat','שפיפה – סקוואט כנגד מוט','שפיפה סקוואט כנגד מוט','{}'::text[],
  'מוט','רגליים',array[]::text[],
  'מוט','בינוני','{"url":"https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bar-squat.mp4","provider":"self-hosted","title":"שפיפה – סקוואט כנגד מוט"}'::jsonb,
  'מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['instructor.co.il']::text[],'[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bar-squat/","name":"שפיפה – סקוואט כנגד מוט"}]'::jsonb,'active',
  'https://bacxfweisncnpjgiqxcp.supabase.co/storage/v1/object/public/exercise-media/resistance/bar-squat.jpg','מתמקמים בעמדת המוצא המתאימה לתרגיל שפיפה – סקוואט כנגד מוט, מייצבים את הגוף ומבצעים את התנועה בטווח נוח ובשליטה. חוזרים לעמדת המוצא ללא תנופה.',array['שמור על מנח גוף יציב','בצע את התנועה בקצב נשלט','התאם את ההתנגדות ליכולת']::text[],array['שימוש בתנופה במקום בשריר המטרה','עבודה בטווח שמייצר כאב','איבוד שליטה בציוד או בעמדת הגוף']::text[]
) on conflict (id) do nothing;

update public.workout_exercises set
  aliases = case when 'בכריעה, פשיטת מרפקים' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'בכריעה, פשיטת מרפקים') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'יד אחורית', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/kneeling-arm-extension/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/kneeling-arm-extension/","name":"בכריעה, פשיטת מרפקים"}]'::jsonb end
where id = 'bodyweight-kneeling-arm-extension';

update public.workout_exercises set
  aliases = case when 'ניתורי שפיפה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'ניתורי שפיפה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/squat-jumps/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat-jumps/","name":"ניתורי שפיפה"}]'::jsonb end
where id = 'bodyweight-jump-squat';

update public.workout_exercises set
  aliases = case when 'ניתורי מכרע' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'ניתורי מכרע') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/split-jumps/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/split-jumps/","name":"ניתורי מכרע"}]'::jsonb end
where id = 'bodyweight-jump-lunge';

update public.workout_exercises set
  aliases = case when 'חתירה אוסטרלית במוט' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'חתירה אוסטרלית במוט') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/inverted-row-2/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/inverted-row-2/","name":"חתירה אוסטרלית במוט"}]'::jsonb end
where id = 'bodyweight-underhand-inverted-row';

update public.workout_exercises set
  aliases = case when 'בישיבה, כפיפת ריכוז כנגד הירך' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'בישיבה, כפיפת ריכוז כנגד הירך') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'יד קדמית', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/leg-concentration-arm-curl/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/leg-concentration-arm-curl/","name":"בישיבה, כפיפת ריכוז כנגד הירך"}]'::jsonb end
where id = 'exercise-1fo5t9c';

update public.workout_exercises set
  aliases = case when 'פשיטת מרפקים על ספסל' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'פשיטת מרפקים על ספסל') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'יד אחורית', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/bench-dip-arm-extension/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bench-dip-arm-extension/","name":"פשיטת מרפקים על ספסל"}]'::jsonb end
where id = 'bodyweight-bench-dip';

update public.workout_exercises set
  aliases = case when 'לחיצת כתפיים כנגד משקולות' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'לחיצת כתפיים כנגד משקולות') end,
  category = 'משקולות יד', equipment = 'משקולות יד',
  primary_muscle_group = 'כתפיים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/dumbbell-military-press/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/dumbbell-military-press/","name":"לחיצת כתפיים כנגד משקולות"}]'::jsonb end
where id = 'exercise-14tz34b';

update public.workout_exercises set
  aliases = case when 'בשכיבה, פשיטת גו' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'בשכיבה, פשיטת גו') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/floor-hyperextension/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/floor-hyperextension/","name":"בשכיבה, פשיטת גו"}]'::jsonb end
where id = 'bodyweight-floor-hyperextension';

update public.workout_exercises set
  aliases = case when 'ציפור-כלב  ברגליים ישרות' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'ציפור-כלב  ברגליים ישרות') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/straight-leg-bird-dog/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/straight-leg-bird-dog/","name":"ציפור-כלב  ברגליים ישרות"}]'::jsonb end
where id = 'bodyweight-straight-leg-bird-dog';

update public.workout_exercises set
  aliases = case when 'ציפור-כלב מול מול קיר' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'ציפור-כלב מול מול קיר') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/wall-bird-dog/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wall-bird-dog/","name":"ציפור-כלב מול מול קיר"}]'::jsonb end
where id = 'bodyweight-wall-bird-dog';

update public.workout_exercises set
  aliases = case when 'ציפור-כלב' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'ציפור-כלב') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/bird-dog/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bird-dog/","name":"ציפור-כלב"}]'::jsonb end
where id = 'bodyweight-bird-dog';

update public.workout_exercises set
  aliases = case when 'כפיפת בטן אלכסונית (אופניים)' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'כפיפת בטן אלכסונית (אופניים)') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/air-bike-crunches/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/air-bike-crunches/","name":"כפיפת בטן אלכסונית (אופניים)"}]'::jsonb end
where id = 'exercise-p2ohuv';

update public.workout_exercises set
  aliases = case when 'בטן סטטית – פלאנק צדי' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'בטן סטטית – פלאנק צדי') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/side-plank/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/side-plank/","name":"בטן סטטית – פלאנק צדי"}]'::jsonb end
where id = 'bodyweight-side-plank';

update public.workout_exercises set
  aliases = case when 'בטן סטטית – פלאנק' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'בטן סטטית – פלאנק') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/front-plank/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/front-plank/","name":"בטן סטטית – פלאנק"}]'::jsonb end
where id = 'bodyweight-front-plank';

update public.workout_exercises set
  aliases = case when 'הרמת אגן אנכית' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'הרמת אגן אנכית') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/hip-lift/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/hip-lift/","name":"הרמת אגן אנכית"}]'::jsonb end
where id = 'bodyweight-vertical-hip-lift';

update public.workout_exercises set
  aliases = case when 'לשון צונחת אחורה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'לשון צונחת אחורה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/curl-up/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/curl-up/","name":"לשון צונחת אחורה"}]'::jsonb end
where id = 'bodyweight-curl-up';

update public.workout_exercises set
  aliases = case when 'כפיפת גו ברגליים ישרות במקבילים' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'כפיפת גו ברגליים ישרות במקבילים') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/captain-chair-straight-leg-raise/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/captain-chair-straight-leg-raise/","name":"כפיפת גו ברגליים ישרות במקבילים"}]'::jsonb end
where id = 'bodyweight-captain-chair-straight-leg-raise';

update public.workout_exercises set
  aliases = case when 'לחיצת שכמות על ספסל' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'לחיצת שכמות על ספסל') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שכמה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/scapula-dips/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/scapula-dips/","name":"לחיצת שכמות על ספסל"}]'::jsonb end
where id = 'bodyweight-scapula-dips';

update public.workout_exercises set
  aliases = case when 'סמוך קום' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'סמוך קום') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/burpees/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/burpees/","name":"סמוך קום"}]'::jsonb end
where id = 'bodyweight-burpee';

update public.workout_exercises set
  aliases = case when 'מקבילים באחיזה צרה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'מקבילים באחיזה צרה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'יד אחורית', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/parallel-bar-narrow-grip-dips/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/parallel-bar-narrow-grip-dips/","name":"מקבילים באחיזה צרה"}]'::jsonb end
where id = 'bodyweight-narrow-grip-dips';

update public.workout_exercises set
  aliases = case when 'שכיבות סמיכה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שכיבות סמיכה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array['יד אחורית']::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/pushups/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/pushups/","name":"שכיבות סמיכה"}]'::jsonb end
where id = 'exercise-hdg3yz';

update public.workout_exercises set
  aliases = case when 'שכיבות סמיכה בשיפוע מתון' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שכיבות סמיכה בשיפוע מתון') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array['יד אחורית']::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/soft-incline-pushups/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/soft-incline-pushups/","name":"שכיבות סמיכה בשיפוע מתון"}]'::jsonb end
where id = 'exercise-dhk3wr';

update public.workout_exercises set
  aliases = case when 'עמידת סמיכה מול קיר' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'עמידת סמיכה מול קיר') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array['יד אחורית']::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/wall-pushups/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wall-pushups/","name":"עמידת סמיכה מול קיר"}]'::jsonb end
where id = 'bodyweight-wall-pushup';

update public.workout_exercises set
  aliases = case when 'שכיבות סמיכה בשיפוע' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שכיבות סמיכה בשיפוע') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array['יד אחורית']::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/incline-pushups/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/incline-pushups/","name":"שכיבות סמיכה בשיפוע"}]'::jsonb end
where id = 'exercise-dhk3wr';

update public.workout_exercises set
  aliases = case when 'שכיבות סמיכה בשיפוע שלילי' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שכיבות סמיכה בשיפוע שלילי') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array['יד אחורית']::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/decline-pushups/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/decline-pushups/","name":"שכיבות סמיכה בשיפוע שלילי"}]'::jsonb end
where id = 'exercise-150pt7l';

update public.workout_exercises set
  aliases = case when 'חתירה אוסטרלית' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'חתירה אוסטרלית') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/inverted-row/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/inverted-row/","name":"חתירה אוסטרלית"}]'::jsonb end
where id = 'bodyweight-inverted-row';

update public.workout_exercises set
  aliases = case when 'כפיפות בטן עם ידיים מאחורי הראש' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'כפיפות בטן עם ידיים מאחורי הראש') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/weighted-crunch-behind-head-waist/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/weighted-crunch-behind-head-waist/","name":"כפיפות בטן עם ידיים מאחורי הראש"}]'::jsonb end
where id = 'exercise-pn4ire';

update public.workout_exercises set
  aliases = case when 'מקבילים באחיזה רחבה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'מקבילים באחיזה רחבה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array['יד אחורית']::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/parallel-bar-dips/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/parallel-bar-dips/","name":"מקבילים באחיזה רחבה"}]'::jsonb end
where id = 'bodyweight-wide-grip-dips';

update public.workout_exercises set
  aliases = case when 'פשיטת ירך על ספסל רומי' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'פשיטת ירך על ספסל רומי') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/hip-extension-roman-chair/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/hip-extension-roman-chair/","name":"פשיטת ירך על ספסל רומי"}]'::jsonb end
where id = 'bodyweight-roman-chair-hip-extension';

update public.workout_exercises set
  aliases = case when 'דדליפט רומני' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'דדליפט רומני') end,
  category = 'מוט', equipment = 'מוט',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/romanian-deadlift/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/romanian-deadlift/","name":"דדליפט רומני"}]'::jsonb end
where id = 'beta-test-exercise-07';

update public.workout_exercises set
  aliases = case when 'כפיפות בטן עם גלגלת' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'כפיפות בטן עם גלגלת') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/abrolls/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/abrolls/","name":"כפיפות בטן עם גלגלת"}]'::jsonb end
where id = 'bodyweight-ab-wheel';

update public.workout_exercises set
  aliases = case when 'עליית מתח באחיזה צרה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'עליית מתח באחיזה צרה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/narrow-grip-pull-up/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/narrow-grip-pull-up/","name":"עליית מתח באחיזה צרה"}]'::jsonb end
where id = 'exercise-say88l';

update public.workout_exercises set
  aliases = case when 'עליית מתח באחיזה רחבה בסיוע גומיית כח' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'עליית מתח באחיזה רחבה בסיוע גומיית כח') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up-copy/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up-copy/","name":"עליית מתח באחיזה רחבה בסיוע גומיית כח"}]'::jsonb end
where id = 'bodyweight-band-assisted-wide-pullup';

update public.workout_exercises set
  aliases = case when 'עליית מתח באחיזה רחבה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'עליית מתח באחיזה רחבה') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up/","name":"עליית מתח באחיזה רחבה"}]'::jsonb end
where id = 'exercise-1igvlte';

update public.workout_exercises set
  aliases = case when 'משיכה באמצעות פולי עליון באחיזה רחבה' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'משיכה באמצעות פולי עליון באחיזה רחבה') end,
  category = 'כבל פולי', equipment = 'כבל פולי',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/wide-grip-lat-pull-down/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/wide-grip-lat-pull-down/","name":"משיכה באמצעות פולי עליון באחיזה רחבה"}]'::jsonb end
where id = 'exercise-1ly3xqh';

update public.workout_exercises set
  aliases = case when 'משיכה באמצעות פולי עליון באחיזה צרה אמצעית' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'משיכה באמצעות פולי עליון באחיזה צרה אמצעית') end,
  category = 'כבל פולי', equipment = 'כבל פולי',
  primary_muscle_group = 'גב', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/narrow-mid-position-grip-lat-pull-down/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/narrow-mid-position-grip-lat-pull-down/","name":"משיכה באמצעות פולי עליון באחיזה צרה אמצעית"}]'::jsonb end
where id = 'exercise-mk9vfe';

update public.workout_exercises set
  aliases = case when 'עליית כח' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'עליית כח') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'יד אחורית', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/single-bar-narrow-grip-dips/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/single-bar-narrow-grip-dips/","name":"עליית כח"}]'::jsonb end
where id = 'bodyweight-muscle-up';

update public.workout_exercises set
  aliases = case when 'שפיפה – סקוואט חופשי' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שפיפה – סקוואט חופשי') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/squat/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat/","name":"שפיפה – סקוואט חופשי"}]'::jsonb end
where id = 'exercise-n1izh5';

update public.workout_exercises set
  aliases = case when 'לחיצת חזה כנגד מוט' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'לחיצת חזה כנגד מוט') end,
  category = 'מוט', equipment = 'מוט',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/bar-bench-press/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bar-bench-press/","name":"לחיצת חזה כנגד מוט"}]'::jsonb end
where id = 'exercise-rr4mtu';

update public.workout_exercises set
  aliases = case when 'הרחקת ירך כנגד פולי' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'הרחקת ירך כנגד פולי') end,
  category = 'כבל פולי', equipment = 'כבל פולי',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/cable-hip-abduction/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/cable-hip-abduction/","name":"הרחקת ירך כנגד פולי"}]'::jsonb end
where id = 'exercise-1oc1t8h';

update public.workout_exercises set
  aliases = case when 'בשכיבה, כפיפת ברכיים עם מגבת' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'בשכיבה, כפיפת ברכיים עם מגבת') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/sliding-leg-curls-with-towel/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/sliding-leg-curls-with-towel/","name":"בשכיבה, כפיפת ברכיים עם מגבת"}]'::jsonb end
where id = 'bodyweight-sliding-leg-curl';

update public.workout_exercises set
  aliases = case when 'שכיבות סמיכה על בוסו' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שכיבות סמיכה על בוסו') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'חזה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/bosu-pushups/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/bosu-pushups/","name":"שכיבות סמיכה על בוסו"}]'::jsonb end
where id = 'bodyweight-bosu-pushup';

update public.workout_exercises set
  aliases = case when 'שפיפה – סקוואט עם כסא' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'שפיפה – סקוואט עם כסא') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/squat-with-chair/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat-with-chair/","name":"שפיפה – סקוואט עם כסא"}]'::jsonb end
where id = 'bodyweight-chair-squat';

update public.workout_exercises set
  aliases = case when 'סקוואט כנגד משקולות יד' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'סקוואט כנגד משקולות יד') end,
  category = 'משקולות יד', equipment = 'משקולות יד',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/squat-dumbbells/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/squat-dumbbells/","name":"סקוואט כנגד משקולות יד"}]'::jsonb end
where id = 'exercise-1w08fkm';

update public.workout_exercises set
  aliases = case when 'לחיצת רגליים כנגד מכונה ייעודית' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'לחיצת רגליים כנגד מכונה ייעודית') end,
  category = 'מכונה ייעודית', equipment = 'מכונה ייעודית',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/leg-press/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/leg-press/","name":"לחיצת רגליים כנגד מכונה ייעודית"}]'::jsonb end
where id = 'exercise-mhdxgx';

update public.workout_exercises set
  aliases = case when 'כפיפה נורדית/רוסית' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'כפיפה נורדית/רוסית') end,
  category = 'משקל גוף', equipment = 'משקל גוף',
  primary_muscle_group = 'רגליים', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/nordic-ham-curl/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/nordic-ham-curl/","name":"כפיפה נורדית/רוסית"}]'::jsonb end
where id = 'bodyweight-nordic-curl';

update public.workout_exercises set
  aliases = case when 'כפיפות גו על כדור פיזיו' = any(coalesce(aliases,'{}'::text[])) then aliases else array_append(coalesce(aliases,'{}'::text[]),'כפיפות גו על כדור פיזיו') end,
  category = 'כדור פיזיו', equipment = 'כדור פיזיו',
  primary_muscle_group = 'שרירי ליבה', secondary_muscle_groups = array[]::text[],
  source_workbooks = case when 'instructor.co.il' = any(coalesce(source_workbooks,'{}'::text[])) then source_workbooks else array_append(coalesce(source_workbooks,'{}'::text[]),'instructor.co.il') end,
  source_references = case when coalesce(source_references,'[]'::jsonb) @> '[{"cell":"https://www.instructor.co.il/excercise/stability-ball-crunch-2/"}]'::jsonb then source_references else coalesce(source_references,'[]'::jsonb) || '[{"workbook":"instructor.co.il","sheet":"כוח והתנגדות","cell":"https://www.instructor.co.il/excercise/stability-ball-crunch-2/","name":"כפיפות גו על כדור פיזיו"}]'::jsonb end
where id = 'resistance-stability-ball-crunch';

commit;
