begin;

-- 31 original catalogue entries and exercise videos derived from the movement names on:
-- https://www.instructor.co.il/workout-training-aid/body-weight/
-- The referenced site supplied only the inventory. Images, videos and coaching copy are original project assets.
-- Existing semantic matches receive aliases instead of duplicate rows.

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-kneeling-arm-extension','בכריעה, פשיטת מרפקים','בכריעה פשיטת מרפקים','{}'::text[],
  'משקל גוף','יד אחורית',array['ליבה','כתפיים']::text[],
  'משקל גוף ומשטח נמוך','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/kneeling-arm-extension.mp4","provider":"self-hosted","title":"בכריעה, פשיטת מרפקים"}'::jsonb,
  'כורעים מול משטח יציב ומניחים עליו את כפות הידיים. שומרים גוף אסוף, מכופפים רק את המרפקים עד שהמצח מתקרב לידיים ודוחפים חזרה באמצעות היד האחורית.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/kneeling-arm-extension/","name":"בכריעה, פשיטת מרפקים"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/kneeling-arm-extension.jpg','כורעים מול משטח יציב ומניחים עליו את כפות הידיים. שומרים גוף אסוף, מכופפים רק את המרפקים עד שהמצח מתקרב לידיים ודוחפים חזרה באמצעות היד האחורית.',array['מרפקים נשארים צרים','האגן והצלעות נשארים אסופים','ירידה איטית ומבוקרת']::text[],array['פתיחת מרפקים לצדדים','שקיעה בגב התחתון','דחיפה מהכתפיים במקום מהמרפקים']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-side-lying-side-stretch','בשכיבה מתיחה לצדי הגוף','בשכיבה מתיחה לצדי הגוף','{}'::text[],
  'משקל גוף','שרירי ליבה',array['גב']::text[],
  'משקל גוף','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/side-lying-side-stretch.mp4","provider":"self-hosted","title":"בשכיבה מתיחה לצדי הגוף"}'::jsonb,
  'שוכבים על הצד בקו ארוך, שולחים את היד העליונה מעבר לראש ומאריכים את כל הצד העליון של הגוף. נושמים עמוק וחוזרים בהדרגה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/side-stretching1/","name":"בשכיבה מתיחה לצדי הגוף"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/side-lying-side-stretch.jpg','שוכבים על הצד בקו ארוך, שולחים את היד העליונה מעבר לראש ומאריכים את כל הצד העליון של הגוף. נושמים עמוק וחוזרים בהדרגה.',array['הארכה מהצלעות ועד כף היד','אגן נשאר יציב','נשימה רגועה']::text[],array['סיבוב הגוף לאחור','משיכה חדה','עצירת נשימה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-standing-hamstring-foam-roller-stretch','בעמידה מתיחה להאמסטרינגס עם גליל','בעמידה מתיחה להאמסטרינגס עם גליל','{}'::text[],
  'משקל גוף','רגליים',array['ישבן','תאומים']::text[],
  'גליל עיסוי','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/standing-hamstring-foam-roller-stretch.mp4","provider":"self-hosted","title":"בעמידה מתיחה להאמסטרינגס עם גליל"}'::jsonb,
  'עומדים מול גליל יציב ומניחים עליו עקב. מיישרים את הברך לפי הטווח האישי ומטים את הגו קדימה מהאגן בגב ניטרלי עד למתיחה נעימה בירך האחורית.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/foam-roller-hamstrng-stretch/","name":"בעמידה מתיחה להאמסטרינגס עם גליל"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/standing-hamstring-foam-roller-stretch.jpg','עומדים מול גליל יציב ומניחים עליו עקב. מיישרים את הברך לפי הטווח האישי ומטים את הגו קדימה מהאגן בגב ניטרלי עד למתיחה נעימה בירך האחורית.',array['הטיה מהאגן','ברך ללא נעילה אגרסיבית','מתיחה נעימה בלבד']::text[],array['עיגול הגב','לחיצה בכוח לטווח','גליל שאינו יציב']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-side-lying-quad-stretch','בשכיבה על הצד מתיחה לארבעה ראשי','בשכיבה על הצד מתיחה לארבעה ראשי','{}'::text[],
  'משקל גוף','רגליים',array['מכופפי הירך']::text[],
  'משקל גוף','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/side-lying-quad-stretch.mp4","provider":"self-hosted","title":"בשכיבה על הצד מתיחה לארבעה ראשי"}'::jsonb,
  'שוכבים על הצד, אוחזים בקרסול העליון ומקרבים בעדינות את העקב לישבן. שומרים את הברכיים זו לצד זו ואת האגן מעט אסוף.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/quad-stretching1/","name":"בשכיבה על הצד מתיחה לארבעה ראשי"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/side-lying-quad-stretch.jpg','שוכבים על הצד, אוחזים בקרסול העליון ומקרבים בעדינות את העקב לישבן. שומרים את הברכיים זו לצד זו ואת האגן מעט אסוף.',array['ברכיים נשארות מקבילות','אגן אסוף','אחיזה עדינה בקרסול']::text[],array['משיכת הברך לאחור','קשת בגב','לחץ על הברך']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-jump-squat','ניתורי שפיפה','ניתורי שפיפה','{}'::text[],
  'משקל גוף','רגליים',array['ישבן','תאומים','ליבה']::text[],
  'משקל גוף','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/jump-squat.mp4","provider":"self-hosted","title":"ניתורי שפיפה"}'::jsonb,
  'יורדים לסקוואט בשליטה, דוחפים את הרצפה וקופצים אנכית. נוחתים ברכות על מרכז כף הרגל וממשיכים מיד לסקוואט הבא.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/squat-jumps/","name":"ניתורי שפיפה"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/jump-squat.jpg','יורדים לסקוואט בשליטה, דוחפים את הרצפה וקופצים אנכית. נוחתים ברכות על מרכז כף הרגל וממשיכים מיד לסקוואט הבא.',array['ברכיים בקו האצבעות','נחיתה שקטה','חזה פתוח']::text[],array['קריסת ברכיים פנימה','נחיתה על רגליים ישרות','איבוד שיווי משקל']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-jump-lunge','ניתורי מכרע','ניתורי מכרע','{}'::text[],
  'משקל גוף','רגליים',array['ישבן','תאומים','ליבה']::text[],
  'משקל גוף','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/jump-lunge.mp4","provider":"self-hosted","title":"ניתורי מכרע"}'::jsonb,
  'מתחילים במכרע, יורדים בשליטה וקופצים מעלה. מחליפים רגליים באוויר ונוחתים ברכות במכרע בצד השני.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/split-jumps/","name":"ניתורי מכרע"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/jump-lunge.jpg','מתחילים במכרע, יורדים בשליטה וקופצים מעלה. מחליפים רגליים באוויר ונוחתים ברכות במכרע בצד השני.',array['גו זקוף','ברך קדמית בקו כף הרגל','נחיתה רכה']::text[],array['מכרע צר מדי','קריסת ברך פנימה','נחיתה נוקשה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-underhand-inverted-row','חתירה אוסטרלית במוט','חתירה אוסטרלית במוט','{}'::text[],
  'משקל גוף','גב',array['יד קדמית','כתף אחורית','ליבה']::text[],
  'מוט קבוע','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/underhand-inverted-row.mp4","provider":"self-hosted","title":"חתירה אוסטרלית במוט"}'::jsonb,
  'אוחזים במוט באחיזה תחתית והגוף נשאר בקו ישר מהראש לעקבים. מושכים את החזה אל המוט, מקרבים שכמות ויורדים עד ידיים ישרות בשליטה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/inverted-row-2/","name":"חתירה אוסטרלית במוט"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/underhand-inverted-row.jpg','אוחזים במוט באחיזה תחתית והגוף נשאר בקו ישר מהראש לעקבים. מושכים את החזה אל המוט, מקרבים שכמות ויורדים עד ידיים ישרות בשליטה.',array['גוף נשאר כיחידה אחת','החזה מוביל אל המוט','כתפיים רחוקות מהאוזניים']::text[],array['אגן נופל','משיכת הסנטר למוט','תנופה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-bench-dip','פשיטת מרפקים על ספסל','פשיטת מרפקים על ספסל','{}'::text[],
  'משקל גוף','יד אחורית',array['חזה','כתף קדמית']::text[],
  'ספסל','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/bench-dip.mp4","provider":"self-hosted","title":"פשיטת מרפקים על ספסל"}'::jsonb,
  'מניחים ידיים על קצה ספסל, אגן קרוב לספסל וברכיים כפופות. מכופפים מרפקים לאחור לטווח נוח ודוחפים חזרה ליישור.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/bench-dip-arm-extension/","name":"פשיטת מרפקים על ספסל"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/bench-dip.jpg','מניחים ידיים על קצה ספסל, אגן קרוב לספסל וברכיים כפופות. מכופפים מרפקים לאחור לטווח נוח ודוחפים חזרה ליישור.',array['אגן צמוד לספסל','מרפקים פונים לאחור','כתפיים רחוקות מהאוזניים']::text[],array['ירידה עמוקה מדי','מרפקים נפתחים','אגן מתרחק מהספסל']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-floor-hyperextension','בשכיבה, פשיטת גו','בשכיבה פשיטת גו','{}'::text[],
  'משקל גוף','גב',array['ישבן','המסטרינג']::text[],
  'משקל גוף','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/floor-hyperextension.mp4","provider":"self-hosted","title":"בשכיבה, פשיטת גו"}'::jsonb,
  'שוכבים על הבטן ומרימים מעט את בית החזה מהרצפה תוך הארכת עמוד השדרה. האגן והרגליים נשארים יציבים והירידה איטית.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/floor-hyperextension/","name":"בשכיבה, פשיטת גו"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/floor-hyperextension.jpg','שוכבים על הבטן ומרימים מעט את בית החזה מהרצפה תוך הארכת עמוד השדרה. האגן והרגליים נשארים יציבים והירידה איטית.',array['מבט לרצפה','הרמה קטנה ומבוקרת','ישבן פעיל']::text[],array['זריקת הראש לאחור','הרמה גבוהה מדי','תנופה מהידיים']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-straight-leg-bird-dog','ציפור-כלב ברגליים ישרות','ציפור כלב ברגליים ישרות','{}'::text[],
  'משקל גוף','שרירי ליבה',array['ישבן','כתפיים']::text[],
  'משקל גוף','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/straight-leg-bird-dog.mp4","provider":"self-hosted","title":"ציפור-כלב ברגליים ישרות"}'::jsonb,
  'ממצב פלאנק גבוה מרימים יד ורגל נגדית עד קו הגוף, עוצרים ושומרים אגן מאוזן. חוזרים בשליטה ומחליפים צד.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/straight-leg-bird-dog/","name":"ציפור-כלב ברגליים ישרות"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/straight-leg-bird-dog.jpg','ממצב פלאנק גבוה מרימים יד ורגל נגדית עד קו הגוף, עוצרים ושומרים אגן מאוזן. חוזרים בשליטה ומחליפים צד.',array['אגן מקביל לרצפה','צלעות אסופות','תנועה איטית']::text[],array['סיבוב האגן','קשת בגב','הרמה גבוהה מדי']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-wall-bird-dog','ציפור-כלב מול קיר','ציפור כלב מול קיר','{}'::text[],
  'משקל גוף','שרירי ליבה',array['ישבן','כתפיים']::text[],
  'קיר','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/wall-bird-dog.mp4","provider":"self-hosted","title":"ציפור-כלב מול קיר"}'::jsonb,
  'עומדים מול קיר עם ידיים נשענות עליו. שולחים רגל לאחור ויד נגדית מעלה בלי לשנות את מנח האגן, חוזרים ומחליפים צד.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/wall-bird-dog/","name":"ציפור-כלב מול קיר"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/wall-bird-dog.jpg','עומדים מול קיר עם ידיים נשענות עליו. שולחים רגל לאחור ויד נגדית מעלה בלי לשנות את מנח האגן, חוזרים ומחליפים צד.',array['עמידה גבוהה','אגן פונה קדימה','לחץ קל אל הקיר']::text[],array['קשת בגב','סיבוב אגן','נעילת ברך תומכת']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-bird-dog','ציפור-כלב','ציפור כלב','{}'::text[],
  'משקל גוף','שרירי ליבה',array['ישבן','גב','כתפיים']::text[],
  'משקל גוף','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/bird-dog.mp4","provider":"self-hosted","title":"ציפור-כלב"}'::jsonb,
  'בעמידת שש שולחים יד ורגל נגדית עד קו הגוף. שומרים את האגן והכתפיים מקבילים לרצפה, חוזרים ומחליפים צד.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/bird-dog/","name":"ציפור-כלב"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/bird-dog.jpg','בעמידת שש שולחים יד ורגל נגדית עד קו הגוף. שומרים את האגן והכתפיים מקבילים לרצפה, חוזרים ומחליפים צד.',array['כפות ידיים מתחת לכתפיים','אגן יציב','עקב נדחף לאחור']::text[],array['סיבוב הגוף','שקיעה בגב','תנועה מהירה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-side-plank','בטן סטטית – פלאנק צדי','בטן סטטית פלאנק צדי','{}'::text[],
  'משקל גוף','שרירי ליבה',array['כתפיים','ישבן']::text[],
  'משקל גוף','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/side-plank.mp4","provider":"self-hosted","title":"בטן סטטית – פלאנק צדי"}'::jsonb,
  'נשענים על האמה כשהמרפק מתחת לכתף ומרימים את האגן לקו ישר מהראש לעקבים. מחזיקים בנשימה רציפה ויורדים בשליטה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/side-plank/","name":"בטן סטטית – פלאנק צדי"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/side-plank.jpg','נשענים על האמה כשהמרפק מתחת לכתף ומרימים את האגן לקו ישר מהראש לעקבים. מחזיקים בנשימה רציפה ויורדים בשליטה.',array['כתף מעל מרפק','אגן גבוה','גוף בקו ישר']::text[],array['שקיעת אגן','כתף עולה לאוזן','סיבוב החזה לרצפה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-front-plank','בטן סטטית – פלאנק','בטן סטטית פלאנק','{}'::text[],
  'משקל גוף','שרירי ליבה',array['כתפיים','ישבן']::text[],
  'משקל גוף','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/front-plank.mp4","provider":"self-hosted","title":"בטן סטטית – פלאנק"}'::jsonb,
  'נשענים על האמות והאצבעות, מרימים ברכיים ויוצרים קו ישר מהראש לעקבים. מכווצים בטן וישבן ונושמים באופן רציף.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/front-plank/","name":"בטן סטטית – פלאנק"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/front-plank.jpg','נשענים על האמות והאצבעות, מרימים ברכיים ויוצרים קו ישר מהראש לעקבים. מכווצים בטן וישבן ונושמים באופן רציף.',array['מרפקים מתחת לכתפיים','צלעות ואגן אסופים','מבט לרצפה']::text[],array['אגן שוקע','אגן גבוה מדי','עצירת נשימה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-vertical-hip-lift','הרמת אגן אנכית','הרמת אגן אנכית','{}'::text[],
  'משקל גוף','בטן',array['מכופפי הירך']::text[],
  'משקל גוף','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/vertical-hip-lift.mp4","provider":"self-hosted","title":"הרמת אגן אנכית"}'::jsonb,
  'שוכבים על הגב עם רגליים לכיוון התקרה. מכווצים את הבטן ומגלגלים את האגן מעט מהרצפה, בלי תנופה, ואז מניחים חוליה אחר חוליה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/hip-lift/","name":"הרמת אגן אנכית"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/vertical-hip-lift.jpg','שוכבים על הגב עם רגליים לכיוון התקרה. מכווצים את הבטן ומגלגלים את האגן מעט מהרצפה, בלי תנופה, ואז מניחים חוליה אחר חוליה.',array['תנועה קטנה מהבטן','רגליים מעל האגן','ירידה איטית']::text[],array['תנופה מהרגליים','דחיפה חזקה בידיים','גלגול אל הצוואר']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-curl-up','לשון צונחת אחורה','לשון צונחת אחורה','{}'::text[],
  'משקל גוף','בטן',array['מכופפי הירך']::text[],
  'משקל גוף','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/curl-up.mp4","provider":"self-hosted","title":"לשון צונחת אחורה"}'::jsonb,
  'שוכבים על הגב עם ברכיים כפופות ומגלגלים את בית החזה עד שהשכמות מתנתקות מעט מהרצפה. עוצרים ויורדים באיטיות.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/curl-up/","name":"לשון צונחת אחורה"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/curl-up.jpg','שוכבים על הגב עם ברכיים כפופות ומגלגלים את בית החזה עד שהשכמות מתנתקות מעט מהרצפה. עוצרים ויורדים באיטיות.',array['סנטר רחוק מהחזה','הצלעות מתקרבות לאגן','הגב התחתון נשאר נוח']::text[],array['משיכת הצוואר','עלייה מלאה לישיבה','תנופה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-captain-chair-straight-leg-raise','כפיפת גו ברגליים ישרות במקבילים','כפיפת גו ברגליים ישרות במקבילים','{}'::text[],
  'משקל גוף','בטן',array['מכופפי הירך','כתפיים']::text[],
  'מתקן מקבילים','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/captain-chair-straight-leg-raise.mp4","provider":"self-hosted","title":"כפיפת גו ברגליים ישרות במקבילים"}'::jsonb,
  'נשענים על האמות במתקן, מייצבים את הגב ומרימים רגליים ישרות עד לטווח נשלט. מורידים בלי תנופה ובלי לאבד לחץ מהכתפיים.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/captain-chair-straight-leg-raise/","name":"כפיפת גו ברגליים ישרות במקבילים"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/captain-chair-straight-leg-raise.jpg','נשענים על האמות במתקן, מייצבים את הגב ומרימים רגליים ישרות עד לטווח נשלט. מורידים בלי תנופה ובלי לאבד לחץ מהכתפיים.',array['גב צמוד למשענת','אגן מתגלגל מעט קדימה','ירידה נשלטת']::text[],array['נדנוד הרגליים','שקיעה בכתפיים','קשת בגב']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-scapula-dips','לחיצת שכמות על ספסל','לחיצת שכמות על ספסל','{}'::text[],
  'משקל גוף','שכמה',array['כתפיים','יד אחורית']::text[],
  'ספסל','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/scapula-dips.mp4","provider":"self-hosted","title":"לחיצת שכמות על ספסל"}'::jsonb,
  'נשענים בידיים ישרות על ספסל. בלי לכופף מרפקים, מורידים ומעלים את הגוף באמצעות תנועה מבוקרת של השכמות בלבד.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/scapula-dips/","name":"לחיצת שכמות על ספסל"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/scapula-dips.jpg','נשענים בידיים ישרות על ספסל. בלי לכופף מרפקים, מורידים ומעלים את הגוף באמצעות תנועה מבוקרת של השכמות בלבד.',array['מרפקים ישרים אך לא נעולים','טווח קטן','צוואר ארוך']::text[],array['כיפוף מרפקים','משיכת כתפיים לאוזניים','טווח גדול מדי']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-burpee','סמוך קום','סמוך קום','{}'::text[],
  'משקל גוף','כל הגוף',array['חזה','רגליים','שרירי ליבה']::text[],
  'משקל גוף','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/burpee.mp4","provider":"self-hosted","title":"סמוך קום"}'::jsonb,
  'מעומדים יורדים להנחת ידיים, שולחים רגליים לפלאנק, מבצעים שכיבת סמיכה לפי היכולת, מחזירים רגליים קדימה וקופצים מעלה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/burpees/","name":"סמוך קום"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/burpee.jpg','מעומדים יורדים להנחת ידיים, שולחים רגליים לפלאנק, מבצעים שכיבת סמיכה לפי היכולת, מחזירים רגליים קדימה וקופצים מעלה.',array['ידיים יציבות לפני שליחת הרגליים','ליבה אסופה בפלאנק','נחיתה רכה']::text[],array['שקיעה בגב','קפיצה על ברכיים ישרות','קיצור תנועה בחיפזון']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-narrow-grip-dips','מקבילים באחיזה צרה','מקבילים באחיזה צרה','{}'::text[],
  'משקל גוף','יד אחורית',array['חזה','כתפיים']::text[],
  'מתקן מקבילים','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/narrow-grip-dips.mp4","provider":"self-hosted","title":"מקבילים באחיזה צרה"}'::jsonb,
  'עולים לתמיכה על המקבילים בגו יחסית זקוף. מכופפים מרפקים לאחור לטווח נשלט ודוחפים עד ידיים ישרות.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/parallel-bar-narrow-grip-dips/","name":"מקבילים באחיזה צרה"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/narrow-grip-dips.jpg','עולים לתמיכה על המקבילים בגו יחסית זקוף. מכופפים מרפקים לאחור לטווח נשלט ודוחפים עד ידיים ישרות.',array['מרפקים קרובים לגוף','כתפיים למטה','תנועה אנכית']::text[],array['ירידה עמוקה מדי','כתפיים קורסות','תנופה מהרגליים']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-wall-pushup','עמידת סמיכה מול קיר','עמידת סמיכה מול קיר','{}'::text[],
  'משקל גוף','חזה',array['יד אחורית','כתף קדמית']::text[],
  'קיר','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/wall-pushup.mp4","provider":"self-hosted","title":"עמידת סמיכה מול קיר"}'::jsonb,
  'עומדים מול קיר ומניחים כפות ידיים בגובה החזה. שומרים גוף ישר, מקרבים את החזה לקיר בכיפוף מרפקים ודוחפים חזרה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/wall-pushups/","name":"עמידת סמיכה מול קיר"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/wall-pushup.jpg','עומדים מול קיר ומניחים כפות ידיים בגובה החזה. שומרים גוף ישר, מקרבים את החזה לקיר בכיפוף מרפקים ודוחפים חזרה.',array['גוף בקו ישר','כפות ידיים יציבות','מרפקים בזווית נוחה']::text[],array['אגן נשאר מאחור','כתפיים עולות','מצח מוביל במקום החזה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-inverted-row','חתירה אוסטרלית','חתירה אוסטרלית','{}'::text[],
  'משקל גוף','גב',array['יד קדמית','כתף אחורית','ליבה']::text[],
  'מוט קבוע','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/inverted-row.mp4","provider":"self-hosted","title":"חתירה אוסטרלית"}'::jsonb,
  'נשכבים מתחת למוט באחיזה עילית ושומרים גוף ישר. מושכים את החזה למוט תוך קירוב שכמות ויורדים בשליטה ליישור ידיים.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/inverted-row/","name":"חתירה אוסטרלית"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/inverted-row.jpg','נשכבים מתחת למוט באחיזה עילית ושומרים גוף ישר. מושכים את החזה למוט תוך קירוב שכמות ויורדים בשליטה ליישור ידיים.',array['עקבים יציבים','אגן בקו הגוף','החזה מגיע למוט']::text[],array['אגן נופל','משיכת הראש קדימה','תנופה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-wide-grip-dips','מקבילים באחיזה רחבה','מקבילים באחיזה רחבה','{}'::text[],
  'משקל גוף','חזה',array['יד אחורית','כתף קדמית']::text[],
  'מתקן מקבילים','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/wide-grip-dips.mp4","provider":"self-hosted","title":"מקבילים באחיזה רחבה"}'::jsonb,
  'עולים לתמיכה על המקבילים, מטים מעט את הגו קדימה ויורדים בשליטה עד לטווח כתף נוח. דוחפים חזרה מבלי לנעול בכוח.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/parallel-bar-dips/","name":"מקבילים באחיזה רחבה"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/wide-grip-dips.jpg','עולים לתמיכה על המקבילים, מטים מעט את הגו קדימה ויורדים בשליטה עד לטווח כתף נוח. דוחפים חזרה מבלי לנעול בכוח.',array['שכמות יציבות','הטיה קלה קדימה','טווח ללא כאב']::text[],array['ירידה עמוקה מדי','כתפיים קורסות קדימה','תנופה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-roman-chair-hip-extension','פשיטת ירך על ספסל רומי','פשיטת ירך על ספסל רומי','{}'::text[],
  'משקל גוף','ישבן',array['המסטרינג','גב תחתון']::text[],
  'ספסל רומי','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/roman-chair-hip-extension.mp4","provider":"self-hosted","title":"פשיטת ירך על ספסל רומי"}'::jsonb,
  'מקבעים את הרגליים בספסל הרומי ומניחים את הכרית מתחת לקפל הירך. יורדים מהאגן בגב ניטרלי ועולים עד לקו ישר בלבד.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/hip-extension-roman-chair/","name":"פשיטת ירך על ספסל רומי"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/roman-chair-hip-extension.jpg','מקבעים את הרגליים בספסל הרומי ומניחים את הכרית מתחת לקפל הירך. יורדים מהאגן בגב ניטרלי ועולים עד לקו ישר בלבד.',array['ציר התנועה באגן','גב ניטרלי','סיום בקו ישר']::text[],array['פשיטת יתר בגב','עיגול כתפיים','תנופה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-ab-wheel','כפיפות בטן עם גלגלת','כפיפות בטן עם גלגלת','{}'::text[],
  'משקל גוף','בטן',array['כתפיים','רחב גבי']::text[],
  'גלגל בטן','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/ab-wheel.mp4","provider":"self-hosted","title":"כפיפות בטן עם גלגלת"}'::jsonb,
  'כורעים ואוחזים בגלגל מתחת לכתפיים. מגלגלים קדימה כשהצלעות והאגן אסופים, עוצרים לפני שהגב מתקמר ומושכים חזרה בעזרת הליבה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/abrolls/","name":"כפיפות בטן עם גלגלת"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/ab-wheel.jpg','כורעים ואוחזים בגלגל מתחת לכתפיים. מגלגלים קדימה כשהצלעות והאגן אסופים, עוצרים לפני שהגב מתקמר ומושכים חזרה בעזרת הליבה.',array['אגן אסוף','ידיים וגלגל מתקדמים יחד','טווח לפי שליטה']::text[],array['קשת בגב','ישיבה לאחור במקום גלגול','טווח גדול מדי']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-band-assisted-wide-pullup','עליית מתח באחיזה רחבה בסיוע גומיית כח','עליית מתח באחיזה רחבה בסיוע גומיית כח','{}'::text[],
  'משקל גוף','גב',array['יד קדמית','כתף אחורית']::text[],
  'מתקן מתח וגומיית כוח','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/band-assisted-wide-pullup.mp4","provider":"self-hosted","title":"עליית מתח באחיזה רחבה בסיוע גומיית כח"}'::jsonb,
  'מלבישים גומייה בטוחה על המוט ומניחים בה ברך. מאחיזה רחבה מושכים את החזה לכיוון המוט ומורידים לשליטה מלאה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up-copy/","name":"עליית מתח באחיזה רחבה בסיוע גומיית כח"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/band-assisted-wide-pullup.jpg','מלבישים גומייה בטוחה על המוט ומניחים בה ברך. מאחיזה רחבה מושכים את החזה לכיוון המוט ומורידים לשליטה מלאה.',array['בדיקת הגומייה לפני העלייה','כתפיים יורדות לפני המשיכה','מרפקים נעים מטה']::text[],array['גומייה על כף הרגל','בעיטה ותנופה','נפילה מהירה למטה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-muscle-up','עליית כח','עליית כח','{}'::text[],
  'משקל גוף','גב',array['חזה','יד אחורית','יד קדמית','שרירי ליבה']::text[],
  'מתקן מתח','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/muscle-up.mp4","provider":"self-hosted","title":"עליית כח"}'::jsonb,
  'מתלייה מושכים בעוצמה עד שהחזה עובר את גובה המוט, מעבירים את הגוף מעליו ודוחפים לתמיכה בידיים ישרות. חוזרים בשליטה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/single-bar-narrow-grip-dips/","name":"עליית כח"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/muscle-up.jpg','מתלייה מושכים בעוצמה עד שהחזה עובר את גובה המוט, מעבירים את הגוף מעליו ודוחפים לתמיכה בידיים ישרות. חוזרים בשליטה.',array['משיכה גבוהה לפני המעבר','ליבה חזקה','מעבר קרוב למוט']::text[],array['ניסיון ללא מתח בסיסי','מרפק אחד עובר לפני השני','נפילה מהתמיכה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-sliding-leg-curl','בשכיבה, כפיפת ברכיים עם מגבת','בשכיבה כפיפת ברכיים עם מגבת','{}'::text[],
  'משקל גוף','המסטרינג',array['ישבן','תאומים']::text[],
  'מגבת ורצפה חלקה','בינוני',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/sliding-leg-curl.mp4","provider":"self-hosted","title":"בשכיבה, כפיפת ברכיים עם מגבת"}'::jsonb,
  'שוכבים על הגב עם העקבים על מגבות ומרימים אגן. מחליקים עקבים אל הישבן ומרחיקים אותם שוב בלי להניח את האגן.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/sliding-leg-curls-with-towel/","name":"בשכיבה, כפיפת ברכיים עם מגבת"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/sliding-leg-curl.jpg','שוכבים על הגב עם העקבים על מגבות ומרימים אגן. מחליקים עקבים אל הישבן ומרחיקים אותם שוב בלי להניח את האגן.',array['אגן נשאר גבוה','לחץ דרך העקבים','החזרה איטית']::text[],array['אגן נופל','משיכה באצבעות הרגליים','החלקה מהירה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-bosu-pushup','שכיבות סמיכה על בוסו','שכיבות סמיכה על בוסו','{}'::text[],
  'משקל גוף','חזה',array['יד אחורית','כתף קדמית','שרירי ליבה']::text[],
  'בוסו','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/bosu-pushup.mp4","provider":"self-hosted","title":"שכיבות סמיכה על בוסו"}'::jsonb,
  'מניחים את הבוסו כשהכיפה מטה ואוחזים בצדדים. שומרים פלאנק יציב, מורידים חזה בשליטה ודוחפים מעלה תוך איזון המשטח.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/bosu-pushups/","name":"שכיבות סמיכה על בוסו"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/bosu-pushup.jpg','מניחים את הבוסו כשהכיפה מטה ואוחזים בצדדים. שומרים פלאנק יציב, מורידים חזה בשליטה ודוחפים מעלה תוך איזון המשטח.',array['כתפיים מעל הידיים','בוסו נשאר מאוזן','גוף בקו ישר']::text[],array['שקיעה בגב','נדנוד הבוסו','מרפקים נפתחים מדי']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-chair-squat','שפיפה – סקוואט עם כסא','שפיפה סקוואט עם כסא','{}'::text[],
  'משקל גוף','רגליים',array['ישבן','המסטרינג']::text[],
  'כסא','מתחילים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/chair-squat.mp4","provider":"self-hosted","title":"שפיפה – סקוואט עם כסא"}'::jsonb,
  'עומדים לפני כסא, שולחים את האגן לאחור ויורדים עד נגיעה קלה במושב. דוחפים דרך כפות הרגליים וחוזרים לעמידה בלי להתנדנד.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/squat-with-chair/","name":"שפיפה – סקוואט עם כסא"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/chair-squat.jpg','עומדים לפני כסא, שולחים את האגן לאחור ויורדים עד נגיעה קלה במושב. דוחפים דרך כפות הרגליים וחוזרים לעמידה בלי להתנדנד.',array['ברכיים בקו האצבעות','נגיעה קלה בלבד','משקל על כל כף הרגל']::text[],array['קריסה לכסא','דחיפה בידיים מהירכיים','ברכיים קורסות פנימה']::text[]
)
on conflict (id) do nothing;

insert into public.workout_exercises (
  id,name,normalized_name,aliases,category,primary_muscle_group,secondary_muscle_groups,
  equipment,difficulty,video,execution_notes,source_workbooks,source_references,status,
  image_url,how_to,cues,common_mistakes
) values (
  'bodyweight-nordic-curl','כפיפה נורדית/רוסית','כפיפה נורדית/רוסית','{}'::text[],
  'משקל גוף','המסטרינג',array['ישבן','תאומים']::text[],
  'עיגון קרסוליים','מתקדמים',
  '{"url":"https://start.elicohenfitness.co.il/exercises/bodyweight/nordic-curl.mp4","provider":"self-hosted","title":"כפיפה נורדית/רוסית"}'::jsonb,
  'כורעים כשהקרסוליים מעוגנים היטב ושומרים קו ישר מהברכיים לראש. יורדים קדימה באיטיות בעזרת ההמסטרינג ומשתמשים בידיים לנחיתה עדינה ולסיוע בחזרה.',array['instructor.co.il']::text[],
  '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/nordic-ham-curl/","name":"כפיפה נורדית/רוסית"}]'::jsonb,
  'active','https://start.elicohenfitness.co.il/exercises/bodyweight/nordic-curl.jpg','כורעים כשהקרסוליים מעוגנים היטב ושומרים קו ישר מהברכיים לראש. יורדים קדימה באיטיות בעזרת ההמסטרינג ומשתמשים בידיים לנחיתה עדינה ולסיוע בחזרה.',array['אגן נשאר בקו הגוף','ירידה איטית','עיגון בטוח ומרופד']::text[],array['כיפוף באגן','נפילה ללא בלימה','עיגון לא יציב']::text[]
)
on conflict (id) do nothing;

update public.workout_exercises
set aliases = case when 'בישיבה, כפיפת ריכוז כנגד הירך' = any(aliases) then aliases else array_append(aliases, 'בישיבה, כפיפת ריכוז כנגד הירך') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/leg-concentration-arm-curl/","name":"בישיבה, כפיפת ריכוז כנגד הירך"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/leg-concentration-arm-curl/","name":"בישיבה, כפיפת ריכוז כנגד הירך"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-1fo5t9c';

update public.workout_exercises
set aliases = case when 'כפיפת בטן אלכסונית (אופניים)' = any(aliases) then aliases else array_append(aliases, 'כפיפת בטן אלכסונית (אופניים)') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/air-bike-crunches/","name":"כפיפת בטן אלכסונית (אופניים)"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/air-bike-crunches/","name":"כפיפת בטן אלכסונית (אופניים)"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-p2ohuv';

update public.workout_exercises
set aliases = case when 'שכיבות סמיכה' = any(aliases) then aliases else array_append(aliases, 'שכיבות סמיכה') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/pushups/","name":"שכיבות סמיכה"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/pushups/","name":"שכיבות סמיכה"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-hdg3yz';

update public.workout_exercises
set aliases = case when 'שכיבות סמיכה בשיפוע מתון' = any(aliases) then aliases else array_append(aliases, 'שכיבות סמיכה בשיפוע מתון') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/soft-incline-pushups/","name":"שכיבות סמיכה בשיפוע מתון"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/soft-incline-pushups/","name":"שכיבות סמיכה בשיפוע מתון"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-dhk3wr';

update public.workout_exercises
set aliases = case when 'שכיבות סמיכה בשיפוע' = any(aliases) then aliases else array_append(aliases, 'שכיבות סמיכה בשיפוע') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/incline-pushups/","name":"שכיבות סמיכה בשיפוע"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/incline-pushups/","name":"שכיבות סמיכה בשיפוע"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-dhk3wr';

update public.workout_exercises
set aliases = case when 'שכיבות סמיכה בשיפוע שלילי' = any(aliases) then aliases else array_append(aliases, 'שכיבות סמיכה בשיפוע שלילי') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/decline-pushups/","name":"שכיבות סמיכה בשיפוע שלילי"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/decline-pushups/","name":"שכיבות סמיכה בשיפוע שלילי"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-150pt7l';

update public.workout_exercises
set aliases = case when 'כפיפות בטן עם ידיים מאחורי הראש' = any(aliases) then aliases else array_append(aliases, 'כפיפות בטן עם ידיים מאחורי הראש') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/weighted-crunch-behind-head-waist/","name":"כפיפות בטן עם ידיים מאחורי הראש"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/weighted-crunch-behind-head-waist/","name":"כפיפות בטן עם ידיים מאחורי הראש"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-pn4ire';

update public.workout_exercises
set aliases = case when 'עליית מתח באחיזה צרה' = any(aliases) then aliases else array_append(aliases, 'עליית מתח באחיזה צרה') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/narrow-grip-pull-up/","name":"עליית מתח באחיזה צרה"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/narrow-grip-pull-up/","name":"עליית מתח באחיזה צרה"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-say88l';

update public.workout_exercises
set aliases = case when 'עליית מתח באחיזה רחבה' = any(aliases) then aliases else array_append(aliases, 'עליית מתח באחיזה רחבה') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up/","name":"עליית מתח באחיזה רחבה"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/wide-grip-pull-up/","name":"עליית מתח באחיזה רחבה"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-1igvlte';

update public.workout_exercises
set aliases = case when 'שפיפה – סקוואט חופשי' = any(aliases) then aliases else array_append(aliases, 'שפיפה – סקוואט חופשי') end,
    source_workbooks = case when 'instructor.co.il' = any(source_workbooks) then source_workbooks else array_append(source_workbooks, 'instructor.co.il') end,
    source_references = case
      when source_references @> '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/squat/","name":"שפיפה – סקוואט חופשי"}]'::jsonb
      then source_references
      else source_references || '[{"workbook":"instructor.co.il","sheet":"משקל גוף","cell":"https://www.instructor.co.il/excercise/squat/","name":"שפיפה – סקוואט חופשי"}]'::jsonb
    end,
    updated_at = now()
where id = 'exercise-n1izh5';

commit;
