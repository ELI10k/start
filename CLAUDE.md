# START - Claude Code Project Instructions

## Mission
You are the primary engineer continuing an existing production fitness-coaching platform named START by Eli Cohen. Do not rebuild from scratch. Preserve existing working behavior, understand the repository first, then continue development until the application is beta-ready.

## Product
START is a Hebrew RTL web application for online nutrition and fitness coaching. It has two roles:
- Coach: manages clients, menus, workouts, check-ins, progress, notifications and content.
- Client: follows nutrition and workouts, logs progress, submits check-ins and views coach feedback.

Tech known from the handoff:
- Next.js
- TypeScript
- Supabase Auth, Database, Storage and RLS
- Vercel deployment
- RTL Hebrew UI

Treat repository code, migrations and live schema as the source of truth. The handoff reflects the latest known product state but may contain assumptions that must be verified.

## First-session protocol
Before editing code:
1. Identify repository root and active branch.
2. Run `git status`, inspect recent commits and locate uncommitted work.
3. Read `package.json`, README files, `supabase/`, migrations, routes, tests, environment examples and deployment configuration.
4. Map coach and client routes, database tables, storage buckets, RLS policies and background jobs.
5. Run the existing project validation commands. Infer exact commands from `package.json` rather than guessing.
6. Open and read `START_MASTER.md` and `HANDOFF_CHECKLIST.md`.
7. Produce a concise audit: confirmed, partial, broken, unknown, risks and recommended next task.
8. Do not make product changes until the audit is complete.

## Non-negotiable safety rules
- Never deploy to Production without Eli explicitly saying: "אשר העלאה לפרודקשן".
- Use Preview deployments for review.
- Never delete production data.
- Never weaken Auth, RLS, Storage policies or tenant isolation.
- Never expose private check-in photos publicly. Use signed URLs and enforce ownership/coach assignment.
- Never commit secrets or `.env*` files.
- Never invent food nutrition values or unit conversions.
- Before migrations, explain impact, backward compatibility and rollback.
- Preserve existing client data and existing menus/workouts.
- Do not mark a task complete based only on tests. Eli must verify the real UX.

## Working style
Eli is a non-technical product owner. Communicate in clear Hebrew, directly and briefly.
- Do the technical investigation yourself.
- Ask only when a real product decision or risky approval is required.
- Report exact results, not optimistic summaries.
- When blocked, state the blocker and the smallest action Eli needs to take.
- Avoid presenting local filesystem screenshot paths as usable links. Provide Preview URLs or attach artifacts in a usable way.

## Required task workflow
For each task:
1. Inspect the affected code and data flow.
2. State a short implementation plan.
3. Implement the smallest complete solution.
4. Add or update tests for the changed behavior.
5. Run targeted checks during development.
6. At task end run the repository's TypeScript, lint, tests and build commands.
7. Run an actual E2E/manual scenario for the feature.
8. Deploy to Preview only when useful.
9. Report changed files, migrations, tests, Preview URL, remaining issues and anything not verified.
10. Wait for Eli's approval before starting a new major task.

## Current highest-priority work
1. Audit and finish the nutrition/menu builder because manual testing found gaps despite earlier completion reports.
2. Complete the full client-side UI redesign in white/green, mobile-first design. Do not stop after the home screen.
3. Redesign coach UX, especially building a complete menu in under two minutes.
4. Perform a full personal beta test and fix real-world issues.
5. Only later: START IQ and advanced AI coaching.

## Nutrition engine rules
- Fixed meal types: breakfast, snack 1, lunch, snack 2, dinner, free calories.
- Normal meal structure: one protein primary food plus alternatives; one carbohydrate primary food plus alternatives; optional notes/vegetables where supported.
- Alternatives must be automatically quantity-adjusted using the primary food's target calories and relevant macro. Do not copy grams.
- Protein targets: default 1.8 g/kg.
- Fat target: default 25% of calorie target.
- Carbohydrates: remaining calories.
- Show grams and calorie percentage.
- Free calories count in total daily calories.
- Food units must come from data: grams, units, slices, can, cup, bottle, pita, etc.
- The uploaded/imported food source is the only source of nutrition values. Never hardcode or invent values.
- Master foods are a curated priority list, not behavior-generated favorites.
- Food picker priority: Master foods, recent foods, full catalog.
- Client view must clearly say to choose one option from each group, not eat every alternative.

## UI direction
The current black/gold UI is not the target. The target is:
- White or very light gray base
- Green primary accent
- Clean rounded cards
- Generous whitespace
- Clear Hebrew RTL typography
- Modern health/fitness application feel
- Mobile-first
- Bottom navigation on mobile: Home, Nutrition, Workouts, Progress, Profile
- Notifications in the top area
- Consistent design system across every client screen

Client redesign scope includes home, nutrition, workouts, workout execution, progress, weigh-ins, check-in, check-in history, content, notifications, profile, loading, empty and error states.

## Definition of Beta-ready
- Core coach/client workflows work with real Supabase data.
- No cross-client data access.
- Menu targets, food totals, alternatives, units and master foods work after save, refresh, edit and clone.
- Workout execution persists and resumes correctly.
- Check-ins and private photos work securely.
- Notifications are understandable and reliable enough for beta.
- Client mobile UI is complete and consistent.
- Coach can build a practical menu in under two minutes.
- TypeScript, lint, tests and build pass.
- A real user test is completed and all critical defects are fixed.

## Next.js version rules
@AGENTS.md
