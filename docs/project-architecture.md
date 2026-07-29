# Project architecture

START is a Next.js 16 App Router demonstration with React 19, TypeScript, Tailwind CSS 4, and RTL Hebrew UI. Pages are server components unless interaction requires a focused client component. `app/` owns routes, `components/client` and `components/coach` own presentation, and `lib/` owns food, meal-plan, progress, check-in, and storage rules.

The 336 approved records in `data/foods.json` are mirrored idempotently into `public.foods`; authenticated production screens read the Supabase catalog. `lib/foods/repository.ts` remains the build-time approved catalog used by deterministic calculation tests. Macro calculations live only in `lib/meal-plans/calculations.ts`. Production meal plans, assignments, nutrition logs, and eaten items use the Supabase repository. The legacy demo adapter is isolated to presentation-only profile preferences and is not a production nutrition source.

There is no backend or real identity boundary. Coach and client views share deterministic mock domain records. See `demo-limitations.md` and the authentication plan.
