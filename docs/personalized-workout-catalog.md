# Personalized workout catalogue

**Current revision:** The historical implementation below is superseded by [professional v2](professional-workout-revision.md): 38 versioned active templates, revised dose/order/effort/time gates and preservation of the original trees in the archive. Regeneration now requires an explicit new migration path; never rerun it over an applied historical file.

21 official templates: four TRX FBW, three men's gym PPL, two women's gym FBW, six women's PPL and six women's A-B. The repeated glute PPL request is deduplicated. The programme catalogue uses fixed repetitions, timed plank sets, dynamic warm-ups, exercise-specific rest, and level-specific RPE and volume. All referenced exercises already have real demonstration videos.

Coach creation, coach intake updates and independent-client onboarding share the same training questionnaire and recommendation engine. Training preferences live in the existing client profile preferences JSON; no new client columns are necessary. Assessments consider sex, reported level, consistent experience, technique, sessions per week, setting, equipment, focus, split and available time. Beginners normally receive FBW. Explicit PPL requires at least three sessions and 45 minutes; FBW is limited to two or three sessions. Advanced requires at least 24 months and stable technique. Medical concerns and incomplete or unsupported profiles remain for coach review.

Automatic assignment creates a private editable copy. Shorter sessions reduce sets without removing muscle groups. `assign_intake_workout` is an atomic service-role-only SECURITY INVOKER function with a relationship check and per-client advisory lock. Existing active assignments and history are preserved; a new recommendation is shown instead. Repeated submissions cannot create concurrent duplicate active assignments. No existing clients are mass reassigned.

Alternatives preserve muscle group, recognized movement pattern, available home equipment, and seconds versus repetitions. A row is not replaced with a vertical pull; a squat is not replaced with a leg curl. Planks display and log seconds in the session and completed-workout detail. Medical restrictions require coach review rather than interpreting free text as a medical diagnosis.

Source: `lib/workouts/program-catalog.ts`; exercises snapshot: `data/personalized-workout-exercises.json`. Regenerate the additive migration with `node scripts/generate-personalized-workout-migration.mjs`. The migration inserts only missing templates/exercises and never overwrites live prescriptions. Tests: `tests/personalized-workouts.test.ts` plus existing workout and intake tests.
# Expanded catalogue

The catalogue now has 37 unique official templates (16 additions): male gym FBW intermediate/advanced, balanced female gym FBW at three levels, male upper/lower A-B at three levels, intermediate/advanced bodyweight FBW with a confirmed pull-up and rowing station, and home dumbbell FBW with/without a flat bench at all three levels. Existing beginner templates remain untouched.

Home dumbbell programmes are shared across sexes and selected by level, time, frequency and equipment. Without a bench, chest work uses floor push-ups; no bench, machines or cables are assumed. The bench option uses a stable flat exercise bench, not an adjustable bench. Home special-focus/split requests and bodyweight without a stable pulling station require coach review. Bodyweight beginners retain the existing coach-selected template.

Verified home substitutions use an explicit exercise allowlist because older catalogue metadata can omit bench/ball requirements. No active client assignment or historical prescription is replaced by the additive migration.
