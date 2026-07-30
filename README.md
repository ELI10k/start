# START

RTL Hebrew frontend demonstration for nutrition coaching, built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4.

## Local development

```bash
npm install
npm run dev
```

Validation:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## What exists

Client dashboard, daily meal completion and macro progress, measurement history, weekly check-in UI, profile/preferences, support shell, unpublished content-library shell, and searchable food details. Coach routes cover client directories/details/progress/check-ins and meal-plan creation, editing, duplication, preview, and assignment.

The only approved food source is `data/foods.json` (336 records), generated from `data/source/foods.xlsx` by `npm run foods:import`. Search and nutrition logic live under `lib/foods` and `lib/meal-plans`.

## Data boundaries

All people, plans, check-ins, and measurements are clearly demo/mock records. `lib/storage` provides a typed adapter contract; the browser adapter persists supported client preferences and meal completions in localStorage. Coach editing remains session-memory only. There is no real authentication, authorization, backend persistence, server validation, notifications, payments, or external messaging.

Do not treat this repository as production-ready. Start with [project architecture](docs/project-architecture.md), [route map](docs/route-map.md), [demo limitations](docs/demo-limitations.md), and [authentication design](docs/authentication-and-single-device-plan.md).

Workout navigation and programs are intentionally absent until authoritative programs are supplied.
