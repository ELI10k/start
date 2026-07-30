# Food catalog audit — 2026-07-29

## Canonical workbook

- Source: `data/source/foods.xlsx`
- User copy: `/Users/lykhn/Downloads/מאגר_מזונות_בלוק_01(1).xlsx`
- Imported source rows: 336
- Production database rows rendered by `/coach/foods`: 336
- Unique normalized names in source: 334
- Unique normalized names in Production: 334
- Missing from Production: none
- Extra in Production: none
- Known intentional duplicate names with different products/brands: `בורקס גבינה`, `ג׳חנון`

The attached user copy and the repository workbook are byte-for-byte equivalent at
the worksheet-data level used by the importer.

## Search verification

- Query `גבינה` in the menu builder: 28 Production results.
- `⭐ מאכלי מאסטר` is the first group when the picker opens.
- Search covers product name, brand and category, including Hebrew inflections
  such as `גבינה`, `גבינת` and `גבינות`.

## Legacy portion workbook

Source: `/Users/lykhn/Downloads/קלוריות מאכלים אלי (1).xlsx`

The `קלוריות מאכלים` sheet contains 56 usable rows and 51 unique labels. These
are portion/menu descriptions, not canonical products per 100 grams. Some rows
combine several alternatives in one cell, and one row contains zero calories.
They were therefore audited but not silently inserted as products, which would
produce incorrect portion calculations and duplicate existing products.

Exact legacy labels that are not canonical product rows:

1. ביצה XL
2. ביצה L
3. ביצה M
4. ביצה S
5. 1 לבן ביצה
6. 1 קופסת טונה במים
7. 1 קופסת טונה בשמן
8. שייטל בקר (בשר מס׳ 13)
9. חזה עוף / הודו / דג סלומון 100 גרם
10. פרגית
11. כרע עוף / פולקע
12. בשר בקר טחון
13. קבב
14. בקר רזה / שוק ירך 100 גרם
15. שניצל
16. קוטג׳ 5% 250 גרם
17. פרוסה גבינה צהובה 28%
18. כוס חלב 3%
19. גביע יוגורט 0% דיאט יופלה / דנונה
20. בולגרית 5%
21. צפתית 5%
22. גבינה מותכת מון בלאן יחידה
23. טופו מתובל
24. קציצת עדשים
25. אגוזים / שקדים / זיתים 10 גרם
26. כפית טחינה גולמית לאחר הכנה
27. כפית חומוס / סלט
28. כפית מיונז לייט
29. כפית שמן
30. כפית חומוס לייט
31. כפית חמאת בוטנים טבעית
32. אורז
33. קינואה
34. בורגול
35. פתיתים
36. קוסקוס
37. פסטה
38. תפוח אדמה / בטטה בתנור
39. אפונה / חומוס / עדשים / חומוס גרגירים
40. 1 פרוסה לחם מלא
41. 1 פרוסה לחם קל מחיטה מלאה
42. לחמניה
43. פיתה אנג׳ל
44. בננה 100 גרם
45. צימוקים
46. תפוח / אגס / אפרסק / כוס חד־פעמית אבטיח / דובדבנים
47. תמר
48. 1 פרכית
49. 30 גרם דגני בוקר אקסטרה פייבר
50. 25 גרם שיבולת שועל
51. לורד סנדוויץ׳ ביצה

Most labels describe a serving of a product already present in the canonical
catalog (for example eggs, tuna, cottage cheese, chicken, rice, quinoa and
bread). Labels without a safe canonical equivalent remain explicitly reported
instead of being invented or assigned misleading per-100-gram nutrition.
