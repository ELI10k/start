# START workout module sprint report

Date: 2026-07-20

## Imported workout programs

Imported: **0**.

The repository was inspected recursively, including hidden project files, `components.zip`, the current Git tree, and Git history. No approved workout workbook, CSV, PDF, Word document, or other workout source was present. The only workbook is `data/source/foods.xlsx`, which is unrelated and was not used.

The importer explicitly recognizes the seven approved program names:

- FBW
- FBW Beginners
- A-B
- A-B Short
- A-B-C
- Bodyweight Beginner
- Bodyweight Advanced

No empty program shells or replacement workouts were created. `reports/workout-import-audit.json` records each unavailable source independently. Placing approved `.xlsx`, `.xls`, or `.csv` files in `data/workouts-source/` and running `npm run workouts:import` will regenerate the central repositories while preserving workbook sheet order and row order.

## Imported exercises

Imported: **0** because no approved workout source exists.

The implemented importer creates deterministic exercise IDs from normalized names and extracts, when present: name, category, muscle group, equipment, YouTube URL, notes, and source workbook. Program rows preserve sets, repetitions, rest, notes, day order, and exercise order.

## Duplicate exercises merged

Merged: **0** because there were no source rows. The normalization pipeline merges spelling-equivalent entries across workbooks using NFKC normalization, Hebrew niqqud and punctuation removal, maqaf/dash normalization, whitespace normalization, and Hebrew-aware lowercase matching. Merged records retain every source workbook and fill only previously missing metadata.

## Data model and repositories

Created reusable models for `WorkoutProgram`, `WorkoutDay`, `WorkoutExercise`, `Exercise`, `ExerciseVideo`, `ExerciseHistory`, `WorkoutCompletion`, and `ClientWorkoutAssignment`.

`lib/workouts/repository.ts` is the immutable central exercise/program read repository. `WorkoutPersistenceRepository` abstracts mutable assignments, exercise history, and workout completions. Browser localStorage and isolated in-memory implementations share the same snapshot contract, allowing a later Supabase adapter without changing workout UI components.

## Coach screens created

- `/coach/workouts` — program browse, search, status filtering, empty state, duplicate and archive controls.
- `/coach/workouts/[id]` — program details, ordered workout-day list, active assignment count, and client assignment.
- `/coach/workouts/[id]/days/[dayId]` — ordered exercise preview with sets, reps, rest, notes, metadata, and YouTube links.

Coach navigation now includes אימונים. Duplicates preserve program content and exercise order with new record IDs. Archiving disables affected local assignments.

## Client screens created

- `/workouts` — today’s assigned workout or a truthful no-assignment state.
- `/workouts/[programId]/[dayId]` — full workout session, ordered exercise cards, approved sets/reps/rest/notes, video actions, per-exercise weight/repetition/note entry, progress summary, completion validation, and finished screen.
- `/workouts/history` — locally persisted completed-workout history.

Client desktop and mobile navigation now include אימונים. Today’s workout advances through the assigned program’s ordered days based on completed workouts. A workout cannot be finished until every imported exercise is marked complete.

## Local persistence

The local adapter persists:

- active/inactive client assignments
- completed workouts and completion dates
- completed exercise state
- weight used
- repetitions performed
- personal notes

Data is stored under the versioned `start-workouts-v1` key. It is explicitly local device state, not backend synchronization.

## Files created

- `data/exercises.json`
- `data/workouts.json`
- `data/workouts-source/.gitkeep`
- `reports/workout-import-audit.json`
- `scripts/import-workouts.mjs`
- `lib/workouts/types.ts`
- `lib/workouts/normalization.ts`
- `lib/workouts/repository.ts`
- `lib/workouts/storage.ts`
- `lib/workouts/progress.ts`
- `components/workouts/WorkoutProvider.tsx`
- coach and client workout components under `components/workouts/`
- workout routes under `app/workouts/` and `app/coach/workouts/`
- `tests/workouts.test.ts`
- this report

## Files changed

- `app/layout.tsx` — workout provider composition.
- `components/coach/CoachNav.tsx` — coach workout navigation.
- `components/client/ClientShell.tsx` — desktop client workout navigation.
- `components/BottomNav.tsx` — mobile workout navigation.
- `proxy.ts` — authenticated role handling plus safe local workout-module access when Supabase is not configured.
- `package.json` — `workouts:import` command.
- `package-lock.json` was unchanged by the workout implementation.

## Validation

- Workout importer: completed; reported zero sources and all seven missing programs without inventing data.
- Workout tests cover normalization/stable IDs, assignment replacement, duplication/order preservation, archiving, history upsert, completion idempotency, day advancement, progress percentage, repository reset, and source audit.
- `npm test`: 38 passed, 0 failed, including 8 workout-specific tests.
- `npm run lint`: passed with no warnings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all coach and client workout routes compiled as request-rendered Next.js routes.
- Production localhost checks: `/workouts`, `/workouts/history`, and `/coach/workouts` returned HTTP 200 and rendered their truthful empty states without Supabase configuration.

## Remaining blocker

The sole content blocker is the absence of Eli’s approved workout files. Consequently, the module cannot display or validate real exercise names, program days, sets, reps, rest periods, notes, or videos. This does not block the implemented architecture, navigation, screens, persistence, or import tooling.

No workout content was inferred from program names, external sources, general fitness knowledge, or existing nutrition data.

## Recommended next sprint

Add Eli’s seven approved source files to `data/workouts-source/`, run `npm run workouts:import`, review `reports/workout-import-audit.json`, visually verify every imported program/day against its workbook, and then implement a Supabase `WorkoutPersistenceRepository` using the existing adapter contract. Backend synchronization should preserve the deterministic exercise/program IDs produced by the approved import.
