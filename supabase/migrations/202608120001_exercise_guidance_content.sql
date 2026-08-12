begin;

-- Coaching content for the 37 exercises the seven approved programmes use.
--
-- Measured before writing this: all 37 of them carry a muscle group and a
-- video, and not one carries a how-to, a cue, a common mistake or an equipment
-- name. The "דגשים לתרגיל" sheet therefore had exactly one section to show and
-- listed the other four as missing, on every exercise, in every programme.
--
-- Written per exercise. It is general gym technique - what a coach says on the
-- floor - and carries no diagnosis or medical claim. It is drafted content and
-- wants Eli's sign-off; the exercise library already has an editor, so any line
-- here can be corrected in the product without another migration.
--
-- Every column is filled only where it is empty. A coach who has already written
-- guidance for an exercise keeps it - this cannot overwrite a human.
--
-- Rows written: 37. Tables touched: public.workout_exercises only.
-- Columns touched: how_to, cues, common_mistakes, equipment.
--
-- Rollback: the statement below restores the pre-migration state by emptying
-- exactly the rows this fills. Run it only if nothing has been edited since.
--
--   update public.workout_exercises
--      set how_to = null, cues = '{}'::text[], common_mistakes = '{}'::text[], equipment = null
--    where id in ('exercise-155pu7s', 'exercise-rr4mtu', 'exercise-thb870', 'exercise-ptjiss', 'exercise-1nidil8', 'exercise-139gtlw', 'exercise-1e2u7l0', 'exercise-19qm0t4', 'exercise-1f01l0c', 'exercise-hdg3yz', 'exercise-dhk3wr', 'exercise-1ly3xqh', 'exercise-5aj1cu', 'exercise-mk9vfe', 'exercise-1u5j1lv', 'exercise-1igvlte', 'exercise-1ba2nb8', 'exercise-14tz34b', 'exercise-1wwie67', 'exercise-mx59uy', 'exercise-1fr384u', 'exercise-yjtm56', 'exercise-yspcn', 'exercise-cw8lzv', 'exercise-1759fj3', 'exercise-8q99c1', 'exercise-f2juxe', 'exercise-1l24vb0', 'exercise-1fo5t9c', 'exercise-1fdd4gb', 'exercise-n1izh5', 'exercise-mhdxgx', 'exercise-igalw2', 'exercise-1lrrpsj', 'exercise-2ez0zf', 'exercise-pn4ire', 'exercise-p2ohuv');

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'חימום כללי קצר ואחריו תנועות שמכינות את המפרקים של אותו אימון. מתחילים בטווח קטן ומגדילים בהדרגה, בלי לעצור במתיחה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['5–8 דקות של תנועה רציפה עד שהנשימה מתחממת','מכינים את המפרקים שיעבדו באימון עצמו','טווח התנועה גדל בהדרגה מסט לסט','מסיימים עם סט חימום קל של התרגיל הראשון']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['מתיחות סטטיות ארוכות לפני אימון כוח','לדלג על החימום כשממהרים','להתחיל בטווח מלא כבר בתנועה הראשונה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-155pu7s';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שוכבים על הספסל, אוחזים במוט ברוחב מעט גדול מהכתפיים, מורידים בשליטה אל אמצע החזה ודוחפים חזרה למעלה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['שכמות אסופות ויציבות על הספסל לאורך כל הסט','כפות הרגליים יציבות על הרצפה','פרקי כף היד נשארים בקו מעל האמות','המרפקים בזווית של כ-45 מעלות מהגוף','הורדה בשליטה ודחיפה בלי נעילת מרפקים אגרסיבית']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להקפיץ את המוט מהחזה','לקצר את טווח התנועה','להרים את הישבן מהספסל']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מוט')
where id = 'exercise-rr4mtu';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצת חזה במוט ישר על ספסל שטוח. המוט יורד לאמצע החזה בקו ישר ועולה חזרה מעל אותה נקודה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['אחיזה סימטרית — בודקים את הסימון בשתי הידיים','שכמות אסופות אחורה ולמטה','המוט נוגע קלות ולא נח על החזה','נשיפה בדחיפה למעלה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['מוט שיורד גבוה מדי לכיוון הצוואר','מרפקים שנפתחים לגמרי לצדדים','לעבוד בלי שומר כשמגדילים משקל']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מוט')
where id = 'exercise-thb870';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצת חזה עם משקולות בודדות על ספסל שטוח. המשקולות יורדות לצדי החזה ועולות למעלה בקשת מתונה פנימה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המשקולות בקו של אמצע החזה, לא של הכתפיים','טווח תנועה מלא — עמוק יותר מאשר במוט','שליטה מלאה בירידה, בלי לתת למשקולות ליפול','מרפקים לא יורדים הרבה מתחת לגובה הספסל']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להקיש את המשקולות זו בזו למעלה','לאבד שליטה בסוף הסט','להתחיל עם משקל שקשה להרים לתנוחת התחלה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-ptjiss';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצה בשיפוע של כ-30 מעלות, במוט או במשקולות. השיפוע מעביר יותר עומס לחלק העליון של החזה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['שיפוע מתון — 30 מעלות, לא יותר','המשקל יורד לחלק העליון של החזה','גב תחתון במגע עם המשענת','כתפיים אחורה ולמטה לאורך הסט']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['שיפוע תלול שהופך את התרגיל ללחיצת כתפיים','לדחוף מהכתפיים במקום מהחזה','לקמר את הגב התחתון כדי לעזור לעצמך']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-1nidil8';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצת חזה במשקולות בודדות בשיפוע של 30 מעלות, לחזה העליון והאמצעי.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המרפקים מעט פנימה, לא בקו אחד עם הכתפיים','עצירה קצרה בנקודה הנמוכה בלי לרפות','דחיפה בקשת מתונה פנימה ולמעלה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לפתוח את המרפקים לגמרי לצדדים','לעבוד בטווח חלקי בגלל משקל גבוה מדי']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-139gtlw';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצה בשיפוע גבוה יחסית, כ-45 מעלות, עם דגש על החלק העליון של החזה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['ככל שהשיפוע גבוה יותר, המשקל יורד','המשקולות בקו עצם הבריח','לשמור על מגע רציף בין הגב העליון למשענת']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לעבוד באותו משקל כמו בספסל שטוח','להעביר את העומס לכתף הקדמית']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-1e2u7l0';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'עומדים במרכז בין שני הפולים, ידיים פתוחות במרפק מעט כפוף, ומקרבים את הידיים זו לזו לפני הגוף בקשת רחבה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המרפק נשאר בזווית קבועה — התנועה מהכתף','עצירה קצרה כשהידיים נפגשות','פתיחה איטית וחזרה בשליטה','חזה פתוח וכתפיים אחורה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לכופף ולפשוט את המרפקים והפוך את זה ללחיצה','משקל גבוה שמושך את הכתפיים קדימה','להשתמש בתנופה של הגוף']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'כבלים')
where id = 'exercise-19qm0t4';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'יושבים במכונת הפרפר עם הגב צמוד למשענת, ומקרבים את הידיות זו לזו בתנועה רחבה ומבוקרת.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['לכוון את גובה המושב כך שהידיות בגובה החזה','גב וכתפיים צמודים למשענת','עצירה קצרה בסגירה, בלי להקיש','פתיחה איטית עד מתיחה נוחה בלבד']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לפתוח מעבר לטווח הנוח לכתף','לתת למשקל למשוך את הידיים אחורה בסוף הסט']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מכונה')
where id = 'exercise-1f01l0c';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שכיבות סמיכה עם הידיים מעט רחבות מהכתפיים. הגוף נשאר קו ישר מהעקבים עד הראש.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['בטן וישבן אסופים — הגוף כלוח אחד','המרפקים בזווית של כ-45 מעלות, לא ניצבים לגוף','החזה יורד עד קרוב לרצפה','צוואר בהמשך לעמוד השדרה, המבט מעט קדימה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['אגן שצונח או מתרומם','טווח חלקי — לרדת רק חצי','הראש יורד לפני החזה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-hdg3yz';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שכיבות סמיכה עם הידיים על משטח מוגבה, מה שמעביר את הדגש לחלק התחתון של החזה ומקל על התרגיל.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['ככל שהמשטח גבוה יותר, התרגיל קל יותר','הגוף נשאר קו ישר, גם בשיפוע','החזה נוגע במשטח בכל חזרה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לשבור את קו הגוף באגן','להישען על המשטח ולוותר על המתח בבטן']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-dhk3wr';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'יושבים במכונת הפולי העליון, אוחזים במוט באחיזה רחבה ומושכים אותו לחלק העליון של החזה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['מתחילים מהשכמות — הן יורדות לפני שהמרפקים מתכופפים','החזה נפתח לכיוון המוט','המרפקים יורדים למטה ואחורה, לא לצדדים בלבד','חזרה איטית עד מתיחה מלאה של הגב']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['למשוך את המוט מאחורי הצוואר','להישען אחורה בכל חזרה כדי לעזור עם הגוף','לעבוד רק עם הידיים בלי להוריד שכמות']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'פולי')
where id = 'exercise-1ly3xqh';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'משיכה בפולי עליון עם מוט משולש באחיזה צרה ונייטרלית, אל החזה העליון.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['אחיזה נייטרלית — כפות הידיים אחת מול השנייה','המרפקים נעים צמוד לגוף כלפי מטה','עצירה קצרה כשהידיות מגיעות לחזה','לשמור על גב תחתון יציב בלי להתנדנד']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להישען אחורה יותר מדי','למשוך בכוח הזרועות בלבד']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'פולי')
where id = 'exercise-5aj1cu';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'משיכת פולי עליון באחיזה צרה עם מוט משולש. אותה תנועה, עם דגש על טווח מלא בכל חזרה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['מתחילים מזרועות ישרות ומתיחה מורגשת בגב','מושכים עד שהידיות נוגעות בחזה העליון','השחרור איטי, בלי לתת למשקל למשוך למעלה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לקצר את הטווח למעלה','להשתמש בתנופה מהגב התחתון']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'פולי')
where id = 'exercise-mk9vfe';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'יושבים מול הפולי התחתון, ברכיים מעט כפופות, ומושכים את הידית לכיוון הבטן תוך אסיפת השכמות.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['גב ישר — לא מתעגל בשלב המתיחה','השכמות נאספות זו לזו בסוף המשיכה','המרפקים חולפים צמוד לגוף','החזרה קדימה בשליטה, בלי שהגו נמשך']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להתנדנד קדימה ואחורה עם הגו','להתעגל בגב התחתון בשלב המתיחה','להרים כתפיים לכיוון האוזניים']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'פולי')
where id = 'exercise-1u5j1lv';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'תלייה במוט באחיזה רחבה, משיכה עד שהסנטר עובר את גובה המוט וירידה מבוקרת עד זרועות כמעט ישרות.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['מתחילים מהורדת שכמות לפני כיפוף המרפקים','החזה מוביל לכיוון המוט','בטן אסופה כדי למנוע נדנוד','ירידה איטית — היא חצי מהתרגיל']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לנדנד את הרגליים כדי לייצר תנופה','טווח חלקי — לא לרדת עד סוף','להתחיל בלי גומייה או סיוע כשעוד אין כוח']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מתקן מתח')
where id = 'exercise-1igvlte';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'מתח באחיזה תחתית ברוחב כתפיים. האחיזה הזו מוסיפה עבודה ליד הקדמית לצד הגב.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['אחיזה ברוחב כתפיים בערך','מרפקים נעים למטה וקרוב לגוף','החזה עולה לכיוון המוט','ירידה מלאה ומבוקרת בין חזרות']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לעצור באמצע הדרך למעלה','לפתוח את הכתפיים קדימה בשלב התלייה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מתקן מתח')
where id = 'exercise-1ba2nb8';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצת כתפיים בישיבה או בעמידה, מגובה האוזניים ועד פשיטה כמעט מלאה מעל הראש.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['בטן אסופה כדי לא לקמר את הגב התחתון','המשקולות מתחילות בגובה האוזניים','המרפקים מעט קדימה, לא בקו אחד עם הגוף','עצירה לפני נעילת מרפקים מלאה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['קימור גדול בגב התחתון','לדחוף עם הרגליים בישיבה','טווח חלקי בגלל משקל גבוה מדי']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-14tz34b';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לחיצת כתפיים באחיזה רחבה מעל הראש, מהחזה העליון ולמעלה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['אחיזה מעט רחבה מהכתפיים','המוט חולף קרוב לפנים בדרך למעלה','ליבה אסופה והישבן מכווץ ליציבות']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לדחוף את המוט קדימה במקום למעלה','להישען אחורה ולהפוך את זה ללחיצת חזה בעמידה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מוט')
where id = 'exercise-1wwie67';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'עמידה עם משקולות לצדי הגוף, הרחקת הידיים לצדדים עד גובה הכתפיים והורדה בשליטה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['מרפק כפוף קלות וקבוע','מובילים עם המרפק, לא עם כף היד','עוצרים בגובה הכתף ולא מעליה','ירידה איטית — בלי להפיל את הידיים']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להשתמש בתנופה מהגב והברכיים','להרים כתפיים לכיוון האוזניים','משקל גבוה שהופך את התרגיל לתנועת גו']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-mx59uy';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'הרחקה אופקית עם משקולות בהטיית גו קדימה, לכיוון הכתף האחורית והגב העליון.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['גו מוטה קדימה עם גב ישר','המרפקים נעים אחורה ולצדדים','עצירה קצרה בסוף התנועה','משקל קל — זה שריר קטן']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להזדקף תוך כדי הסט','לכופף מרפקים ולהפוך את זה לחתירה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-1fr384u';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'עמידה מול פולי עליון, משיכת הכבל לכיוון הפנים והצדדים עם מרפקים גבוהים, לכתף האחורית.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המרפקים נשארים בגובה הכתפיים','מסיימים כשהידיים בצדי הראש','שכמות נאספות קלות בסוף המשיכה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להוריד את המרפקים ולהפוך את זה לחתירה','משקל גבוה שמושך את הגו קדימה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'כבלים')
where id = 'exercise-yjtm56';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'עמידה מול פולי עליון, מרפקים צמודים לגוף, פשיטת המרפקים כלפי מטה עד יישור מלא.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המרפקים נעולים במקומם לצד הגוף','רק האמה זזה','עצירה קצרה ביישור המלא','חזרה איטית עד כיפוף מלא']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להזיז את המרפקים קדימה ואחורה','להישען על המוט ולדחוף עם משקל הגוף']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'פולי')
where id = 'exercise-yspcn';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שכיבה על ספסל, מוט W מעל הראש, כיפוף מרפקים עד שהמוט מגיע קרוב למצח ופשיטה חזרה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הזרועות נשארות בזווית קבועה מהכתף','רק המרפק נפתח ונסגר','ירידה איטית ומבוקרת','עצירה לפני נעילת מרפק מלאה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להזיז את הזרועות אחורה בכל חזרה','משקל גבוה שמעמיס על המרפק','לעבוד בלי חימום מרפקים']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מוט W')
where id = 'exercise-cw8lzv';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'פשיטת מרפקים עם משקולת מעל הראש או בהטיית גו, לפי הגרסה באימון. המרפק קבוע והאמה נפתחת.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המרפק מצביע קדימה ונשאר במקום','טווח מלא — מכיפוף עמוק ליישור','משקל מתון שמאפשר שליטה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לפתוח את המרפק לצדדים','לקצר את הטווח בחלק העליון']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-1759fj3';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שכיבות סמיכה באחיזה צרה, כפות הידיים ברוחב החזה, המרפקים נשארים צמודים לגוף.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['המרפקים נעים אחורה לאורך הצלעות','הגוף נשאר קו ישר','לרדת עד שהחזה קרוב לרצפה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לפתוח את המרפקים לצדדים','אגן שצונח']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-8q99c1';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'ישיבה על ספסל בשיפוע 45 מעלות, זרועות תלויות לאחור, כיפוף מרפקים עם משקולות.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הזרועות נשארות מאחורי קו הגוף','מרפקים צמודים ולא נעים קדימה','ירידה איטית עד יישור כמעט מלא','משקל קל יותר מהרגיל — הטווח קשה יותר']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להרים את המרפקים קדימה בסוף החזרה','לקצר את הטווח למטה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-f2juxe';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'כיפוף מרפקים באחיזת פטיש — כפות הידיים אחת מול השנייה לאורך כל התנועה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['אחיזה נייטרלית קבועה','מרפקים צמודים לצדי הגוף','בלי תנופה מהגו','ירידה בשליטה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לסובב את כף היד תוך כדי','להיעזר בגב התחתון כדי להרים']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקולות יד')
where id = 'exercise-1l24vb0';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'כיפוף מרפקים כנגד משקל הגוף — תלייה או משיכה באחיזה תחתית, לפי הגרסה באימון.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['מרפקים צמודים לגוף','עלייה מבוקרת בלי תנופה','ירידה איטית עד יישור']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להשתמש בתנופה מהרגליים','לעצור באמצע הטווח']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-1fo5t9c';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'מוט על הגב העליון, כפות רגליים ברוחב כתפיים, ירידה עד שהירכיים מקבילות לרצפה או מעט מתחת, ועלייה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הברכיים נעות בקו של כפות הרגליים','משקל מחולק על כל כף הרגל','חזה פתוח וגב בקו ניטרלי','יורדים עד לעומק שבו הגב התחתון עוד לא מתעגל']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['ברכיים שנופלות פנימה','עקבים שמתרוממים מהרצפה','עיגול של הגב התחתון בתחתית התנועה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מוט')
where id = 'exercise-1fdd4gb';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'סקוואט ללא משקל, ידיים קדימה לאיזון, ירידה מבוקרת ועלייה עד יישור.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['מתחילים את התנועה מהאגן אחורה','ברכיים בקו כפות הרגליים','עקבים נשארים על הרצפה','עומק לפי הטווח הנוח לך']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לרדת מהר ולקפוץ בחזרה','ברכיים שנכנסות פנימה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-n1izh5';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'ישיבה במכונת לחיצת רגליים, כפות רגליים על המשטח ברוחב כתפיים, כיפוף ברכיים בשליטה ודחיפה חזרה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הגב התחתון נשאר צמוד למשענת לאורך כל הסט','כפות הרגליים במרכז המשטח','יורדים עד הטווח שבו האגן עוד לא מתגלגל','עצירה לפני נעילת ברכיים מלאה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['לרדת עמוק מדי והאגן מתרומם מהמשענת','לנעול ברכיים בכוח בסוף הדחיפה','לדחוף עם קצות האצבעות בלבד']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מכונה')
where id = 'exercise-mhdxgx';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'ישיבה במכונת פשיטת ברכיים, כרית על השוק מעל הקרסול, יישור הברכיים ועצירה קצרה למעלה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['לכוון את ציר המכונה לגובה הברך','עצירה קצרה ביישור מלא','ירידה איטית ומבוקרת','גב וישבן צמודים למושב']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להקפיץ את המשקל למעלה','להרים את הישבן מהמושב','משקל גבוה שמייצר תנופה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מכונה')
where id = 'exercise-igalw2';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'כפיפת ברכיים במכונה, בשכיבה או בישיבה, לשריר הירך האחורי. כיפוף מלא ושחרור מבוקר.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['העקבים מובילים את התנועה לכיוון הישבן','אגן צמוד למשטח לאורך כל התנועה','ציר המכונה מיושר לגובה הברך','עצירה קצרה בכיפוף המלא','שחרור איטי עד יישור כמעט מלא']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['להרים את האגן כדי לסחוב את המשקל','לשחרר מהר ולתת למשקל ליפול']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'מכונה')
where id = 'exercise-1lrrpsj';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'לאנג׳ — צעד קדימה או ירידה במקום, עד שהברך האחורית קרובה לרצפה, וחזרה. בגרסה עם משקולות מחזיקים משקולת בכל יד.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הגו זקוף, המבט קדימה','הברך הקדמית בקו כף הרגל','יורדים למטה ולא קדימה','דוחפים מהעקב של הרגל הקדמית']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['ברך קדמית שנכנסת פנימה','צעד קצר מדי שמעמיס על הברך','להיטות של הגו קדימה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-2ez0zf';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שכיבה על הגב, ברכיים כפופות, כיווץ הבטן שמרים את השכמות מהרצפה וחזרה בשליטה.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הגב התחתון נשאר במגע עם הרצפה','הידיים לא מושכות את הראש','תנועה קצרה ומכווצת, לא ישיבה מלאה','נשיפה בעלייה']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['למשוך את הצוואר עם הידיים','להשתמש בתנופה במקום בכיווץ']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-pn4ire';

update public.workout_exercises set
  how_to = coalesce(nullif(trim(how_to), ''), 'שכיבה על הגב, ידיים לצדי הראש, הבאת מרפק לכיוון הברך הנגדית בתנועת דיווש מתחלפת.'),
  cues = case when coalesce(array_length(cues, 1), 0) = 0 then array['הגב התחתון צמוד לרצפה','הסיבוב מהגו ולא מהמרפק','קצב מבוקר ולא מהיר','הרגל המיושרת נשארת גבוהה מספיק כדי לא לקמר את הגב']::text[] else cues end,
  common_mistakes = case when coalesce(array_length(common_mistakes, 1), 0) = 0 then array['למשוך את הראש עם הידיים','לעבוד מהר ולאבד את הכיווץ','גב תחתון שמתרומם מהרצפה']::text[] else common_mistakes end,
  equipment = coalesce(nullif(trim(equipment), ''), 'משקל גוף')
where id = 'exercise-p2ohuv';

commit;
