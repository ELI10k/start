# Authoritative route audit

Reviewed: 2026-07-20. All titles are Hebrew or START-branded. Root metadata supplies the default title/description; food/content dynamic IDs validate and call `notFound`. Coach client/menu dynamic pages also validate repository/provider IDs.

## Client and shared routes

| Route | Purpose | Invalid behavior |
| --- | --- | --- |
| `/` | Client today dashboard | n/a |
| `/nutrition` | Assigned meal plan and completion | explicit empty state |
| `/progress` | Weight, waist, measurements | explicit empty state |
| `/check-in` | Validated weekly form | validation alert |
| `/profile` | Profile/goal demo form | native numeric/required validation |
| `/preferences` | Local notification/display preferences | n/a |
| `/support` | Non-sending support shell | clearly unavailable |
| `/content` | Unpublished content shell/search | explicit empty state |
| `/content/category/[category]` | Category template | 404 unknown category |
| `/content/[id]` | Unpublished detail template | 404 unknown ID |
| `/foods` | 336-food search/filter/sort | explicit empty state |
| `/foods/[id]` | Food nutrition detail | 404 unknown ID |

## Coach routes

`/coach`, `/coach/clients`, `/coach/clients/new`, `/coach/clients/[id]`, `/coach/clients/[id]/progress`, `/coach/clients/[id]/check-ins`, `/coach/menus`, `/coach/menus/new`, `/coach/menus/[id]`, `/coach/menus/[id]/preview`, and `/coach/foods` cover the implemented dashboard, client, progress, check-in, menu builder/preview, assignment, and food workflows. Unknown client/menu IDs return coach not-found UI. `/import` is a local food-import inspection utility.

Internal links target existing routes. No duplicate workout concept or workout navigation exists. Loading boundaries exist globally and for coach/foods; error boundaries exist globally and for foods. Production build generated 399 pages. Localhost returned 200 for representative success routes and 404 for invalid food/content/client/menu IDs. Next.js 16.2.10 emitted internal `NoFallbackError` log lines for strict `dynamicParams=false` SSG 404 requests; response status and not-found behavior were correct.
