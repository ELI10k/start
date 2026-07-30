# Seed נתוני טסט ל-START

הקובץ הראשי הוא `supabase/seeds/beta-test-client.sql`. הוא מיועד להרצה ידנית בלבד ב-Supabase SQL Editor, אינו משתמש במפתח בקוד לקוח ואינו משנה RLS.

## לפני הרצה

1. התחברו ל-[Supabase Dashboard](https://supabase.com/dashboard) של פרויקט START.
2. ודאו שהחשבונות `elicohenib@gmail.com` (coach) ו-`elicohenyou@gmail.com` (client) קיימים ושיש ביניהם קשר פעיל.
3. פתחו **SQL Editor** → **New query**.
4. העתיקו את כל תוכן `supabase/seeds/beta-test-client.sql`, הדביקו והריצו פעם אחת.

הקובץ נכשל במכוון אם ללקוח כבר יש תוכנית פעילה שאינה תוכנית הטסט, כדי לא לפגוע בנתונים אמיתיים.

## אימות הצלחה

הריצו ב-SQL Editor:

```sql
select
  (select count(*) from public.workout_assignments where client_id=(select id from auth.users where lower(email)=lower('elicohenyou@gmail.com')) and status='active') as active_workouts,
  (select count(*) from public.workout_sessions where client_id=(select id from auth.users where lower(email)=lower('elicohenyou@gmail.com')) and status='completed') as completed_workouts,
  (select count(*) from public.progress_entries where client_id=(select id from auth.users where lower(email)=lower('elicohenyou@gmail.com'))) as weigh_ins,
  (select count(*) from public.check_ins where client_id=(select id from auth.users where lower(email)=lower('elicohenyou@gmail.com'))) as check_ins;
```

התוצאה הצפויה: לפחות תוכנית פעילה אחת, 10 אימונים שהושלמו, 30 שקילות ו-4 צ׳ק־אינים.

## Rollback

אם צריך להסיר את נתוני הטסט בלבד, העתיקו והריצו את כל תוכן `supabase/seeds/beta-test-client-rollback.sql`. הוא אינו מוחק משתמשים, תוכן קיים או נתונים ללא קידומת/סימון טסט.
