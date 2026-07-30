# START MASTER - Full Product and Engineering Handoff

**Project:** START by Eli Cohen  
**Owner:** Eli Cohen  
**Purpose of this document:** Give a new Claude Code engineer enough context to continue the existing application without restarting, losing decisions or repeating discovery work.

> Important: This document records the latest known state from product conversations and Codex reports. The repository, database and deployed application must be audited. Any discrepancy must be reported rather than silently assumed.

---

## 1. Executive summary

START is a web-based nutrition and fitness coaching platform built for Eli Cohen's online coaching business. The product combines coach workflows and client self-service in one ecosystem.

The platform is already substantially implemented. It is not an idea-stage project and must not be rebuilt. Existing implementation reportedly includes authentication, role separation, client/coach dashboards, nutrition, workout execution, progress, weekly check-ins, private body photos, notifications, content, database seed data, tests and Vercel deployment.

The main remaining work is not simply “add more features.” It is:

1. Verify that reported functionality actually works in the real UI.
2. Finish the nutrition builder correctly.
3. Complete a full white/green mobile-first redesign of the client experience.
4. Improve the coach UX.
5. Run a personal beta and fix defects.
6. Later add advanced coaching intelligence called START IQ.

Eli values speed and practicality. The product must let a coach build a complete nutrition plan in under two minutes and let a client understand what to do immediately.

---

## 2. Business and brand context

### 2.1 Brand
The long-term ecosystem name is **START by Eli Cohen**.

Potential membership tiers:
- START Digital
- START Coach
- START VIP

The application should feel like one premium product ecosystem, not a generic admin panel.

### 2.2 Target audience
Primary audience:
- Men roughly 25-45
- Busy
- Want to lose abdominal fat and improve fitness
- Need a flexible approach they can sustain
- Often struggle with evening eating and consistency

### 2.3 Coaching philosophy
- Flexible nutrition, not extreme restriction
- Three manageable workouts can be enough
- Clear action over information overload
- Sustainable adherence is more important than perfection
- The app should think like a coach, not merely display data

---

## 3. Product roles

### 3.1 Coach role
The coach should be able to:
- View dashboard and client status
- Add, invite, assign and manage clients
- Create and assign nutrition plans
- Use a master food catalog and full food database
- Create and assign training programs
- Review workout history
- Review weigh-ins and trends
- Review weekly check-ins and compare two check-ins
- View private progress photos
- Write coach feedback and mark a check-in handled
- Manage notifications and content
- Eventually receive intelligent alerts and weekly recommendations

### 3.2 Client role
The client should be able to:
- Sign in securely
- View daily summary and next action
- Follow assigned nutrition plan
- Understand primary foods and alternatives
- Track meals/free calories if supported
- View and execute workouts
- Enter sets, reps and weights
- Resume an unfinished workout
- Move a workout to another date
- Log weigh-ins and measurements
- Submit weekly check-ins
- Upload front/side/back body photos securely
- View check-in history and coach responses
- View notifications and content
- Manage profile/reminder preferences

---

## 4. Known technical foundation

Reported stack:
- Next.js
- TypeScript
- Supabase
  - Auth
  - PostgreSQL database
  - Storage
  - RLS
- Vercel
- RTL Hebrew interface
- Font previously used: Assistant

The repository must be inspected to verify:
- Next.js version and App Router/Pages Router
- Styling system
- Test frameworks
- Supabase client/server helpers
- Background/cron architecture
- Deployment branch behavior
- Exact route map
- Exact schema and migrations

### 4.1 Deployment
Known production URL from prior work:
- `https://start-snowy-eight.vercel.app`

Do not assume it remains the correct canonical URL. Verify Vercel project aliases and environment mapping.

A previous engineering mistake occurred where tasks were deployed to Production despite a Preview-only request. Therefore:
- Default to local/Preview.
- Production needs explicit approval.

### 4.2 Environment separation
Verify that the required Supabase public environment variables exist for both Production and Preview. Preview previously failed until environment configuration was corrected.

Never expose service-role secrets to the client.

---

## 5. Authentication and authorization

Reported implemented behavior:
- Magic Link
- Email/password login
- Device activation flow
- Logout
- Role-aware redirects
- Session refresh middleware
- Coach/client authorization
- Supabase RLS

Known historical fixes:
- Email/password sign-in previously redirected to unauthorized and was fixed.
- Client dashboard previously failed to find an active program and was fixed.
- Workout prescriptions previously did not load and were fixed.

Additional product requirements:
- Sessions should not expire too aggressively.
- Client invitation/Magic Link target duration was requested as 24 hours.

Audit requirements:
- Verify client cannot read another client's records.
- Verify coach can only read an actively assigned client's data.
- Verify revoked/inactive assignment removes access.
- Verify Storage object policies align with database authorization.
- Verify server endpoints do not trust client-supplied user IDs.

---

## 6. Database and data model

Do not rely on this document for exact table names. Derive exact schema from migrations and generated types.

Expected/known conceptual entities:
- Profiles/users
- Roles
- Coach-client assignments
- Invitations/device activation
- Foods and nutrition metadata
- Nutrition plans
- Meals
- Meal food groups
- Primary foods and alternatives
- Meal assignments/history/templates
- Training programs
- Training days/exercises/prescriptions
- Assigned programs
- Workout sessions, sets and exercise logs
- Weight logs
- Measurement logs
- Check-ins
- Check-in photos
- Coach feedback/handled status
- Notifications
- Content library
- Favorites/recent foods, or equivalent usage data
- Free-menu days and nutrition logs

Known migration from the latest nutrition work:
- `202607290007_meal_alternative_metadata.sql`

The reported purpose was to support role/metadata for primary food vs alternative, unit, quantity source and automatic/manual calculations.

Audit that migration and confirm:
- It is committed.
- It exists in production.
- Generated types match.
- Existing nutrition plans remain readable.
- Atomic saving truly protects against partial writes.

---

## 7. Food database

### 7.1 Known state
Prior reports claimed:
- 336 out of 336 foods imported.
- No failed rows.

Manual testing later contradicted the practical result:
- Searching “גבינה” returned no results.
- Many expected foods were absent.
- The user later acknowledged the full Excel file had not been attached to one of the final tasks.

Therefore the true status is **unverified**.

### 7.2 Source of truth
The complete food Excel provided by Eli must be the only source of nutritional values.

Never hardcode or invent:
- Calories
- Protein
- Carbohydrates
- Fat
- Unit weight
- Serving conversion
- Slice/cup/can conversion

### 7.3 Required fields
Each food should support as available:
- Display name
- Search-normalized name
- Category/group
- Calories
- Protein
- Carbohydrates
- Fat
- Base quantity and base unit
- Display unit
- Grams per unit where provided
- Brand/product details where applicable
- Active/import source metadata

### 7.4 Search requirements
- Hebrew and English search
- Search across the full catalog
- Normalized punctuation and spacing
- Fast result feedback
- Correct group filtering
- No accidental filtering to only recent/master foods
- Result count and import audit available for debugging

### 7.5 Unit policy
If the source only contains grams, do not invent slices/units.
If unit weight exists, display the natural unit.
Examples:
- Eggs: units
- Bread: slices only if grams per slice are known
- Tuna: can only if can weight/nutrition basis is known
- Yogurt: cup/unit only if source supports it
- Protein drink: bottle/unit only if source supports it
- Meat/rice/pasta: grams

---

## 8. Curated master foods

“Master foods” are not automatically learned favorites. They are Eli's curated, always-prioritized foods.

Quantities below are examples of real coaching portions, not hardcoded database nutrition values. Actual calculations must use the food source.

### 8.1 Protein master foods
- Cheese of any type up to 5%
- Whole eggs
- Whole egg plus cheese up to 5%
- Yellow cheese 9%
- Tuna in oil, drained
- Protein yogurt with 20/25 g protein, up to 150 calories
- Yotvata PRO drink, 25 g protein, up to 140 calories
- Chicken breast
- Pargit/chicken thigh meat
- Tilapia/St. Peter's fish
- Shaitel beef cut
- Chicken quarters/drumsticks, edible weight without bones
- Schnitzel, with oil absorbed using paper towel
- Beef
- Beef patties
- Salmon

### 8.2 Carbohydrate master foods
- Pita
- Bread roll up to 100 g
- Bread
- 99-calorie tortillas
- Branflakes cereal
- Oats
- Rice cakes
- Rice
- Ptitim
- Pasta
- Couscous
- Quinoa
- Bulgur
- Sweet potato
- Potato
- Tapugan fries

### 8.3 Picker priority
1. Master foods
2. Last 30 foods used by the coach
3. Full catalog

No separate “favorites” mechanism is required unless the current implementation already has a useful one. If present, do not confuse it with the curated master list.

---

## 9. Nutrition plan builder

### 9.1 Product goal
A coach who knows the system must be able to build and save a complete practical plan in less than two minutes.

A prior automated report claimed a 98-second scenario, but manual testing found missing functionality. Repeat the timed test after fixing the real UX.

### 9.2 Fixed meal types
- Breakfast
- Snack 1
- Lunch
- Snack 2
- Dinner
- Free calories

Avoid free-text meal naming for the primary flow.

### 9.3 Meal structure
For each regular meal:
- Protein group
  - One primary food
  - Alternatives underneath
- Carbohydrate group
  - One primary food
  - Alternatives underneath
- Optional meal notes
- Optional vegetables if/when product support is included

The UI must never imply that the client should eat every alternative.

Client copy should communicate:
- Choose one option from the protein group.
- Choose one option from the carbohydrate group.

### 9.4 Alternative calculation
Alternatives are nutritionally equivalent options, not equal weights.

Example:
- Primary: 200 g pargit
- Alternative: schnitzel
- Schnitzel should receive a smaller quantity if it is more calorie-dense.

Protein group priority:
1. Keep calories close.
2. Keep protein close.

Carbohydrate group priority:
1. Keep calories close.
2. Keep carbohydrates close.

Implementation requirements:
- Automatic suggested quantity
- Natural unit where available
- Editable by coach
- Record whether quantity is automatic or manually overridden
- Recalculate predictably when primary food/quantity changes
- Prevent zero/negative quantities
- Preserve values through save, refresh, edit and clone

The exact algorithm must be transparent and tested. Avoid an opaque weighted formula without documenting tolerances.

### 9.5 Macro targets
When client body weight and calorie target are known:

- Protein grams = body weight kg × 1.8
- Protein calories = protein grams × 4
- Fat calories = calorie target × 25%
- Fat grams = fat calories ÷ 9
- Carbohydrate calories = calorie target - protein calories - fat calories
- Carbohydrate grams = carbohydrate calories ÷ 4

Display whole grams and percentages:
- Protein % = protein calories / calorie target
- Carbohydrate % = carbohydrate calories / calorie target
- Fat % = fat calories / calorie target

Behavior:
- Auto-calculate on client/calorie selection when data is available.
- Recalculate on explicit “calculate again” action.
- Permit manual override.
- Do not overwrite manual values unexpectedly.
- Clearly indicate automatic vs manual mode.

### 9.6 Totals and summary
The builder must display two separate concepts clearly:
1. Targets: calorie and macro goals.
2. Plan totals: actual calories/protein/carbs/fat from selected primary items/defined plan logic.

Manual defect found:
- Targets and summary showed missing protein/carbs/fat even after assigning foods.

Fix and test:
- Immediate update on selection/quantity change
- Correct persistence
- Correct refresh
- Correct cloned plan
- Correct client view

### 9.7 Free calories
- Fixed special meal type
- Coach enters calorie amount and optional note
- Included in daily total calories
- Displayed clearly to the client
- Do not falsely assign arbitrary macros unless the product explicitly decides to

### 9.8 Speed UX
- Minimum clicks
- Search immediately available
- Master foods first
- One-click primary selection
- Fast alternative addition
- Automatic quantity and units
- Meal duplication
- Plan duplication to another client
- Save as template/master plan where supported
- No unnecessary modal depth
- Good keyboard and mobile behavior

### 9.9 Nutrition test scenario
Time and verify:
1. Select client and calorie target.
2. Auto-calculate macros.
3. Add five meals.
4. Choose protein and carbohydrate for each.
5. Add at least one alternative to each group.
6. Add free calories.
7. Save.
8. Refresh and edit.
9. Clone.
10. View as client.

Success: under two minutes for the initial build, with correct data afterward.

---

## 10. Workout system

Reported implemented:
- Programs and exercises
- Active program and program history
- Three-day seeded test program
- Five exercises per day
- Prescribed sets/reps/rest/notes
- Start workout
- Enter weight/reps
- Mark set complete
- Refresh and resume
- Save and finish
- Move workout to another date
- Duplicate-date guard
- Workout history

Remaining audit:
- End-to-end import/create/assign/execute/history
- No duplicated workout assignments
- Correct dates/timezones
- Mobile execution UX
- Notifications before/after scheduled workout
- Coach view of completed workout details

Future approved concept:
- Client video upload for exercise technique
- AI technique analysis

This is later work, not current beta priority unless already partly implemented.

---

## 11. Check-ins and progress

### 11.1 Weekly check-in
Reported complete fields:
- Weight
- Navel circumference
- Ratings 1-10
- Notes
- Front/side/back photos
- History

Coach functionality:
- Compare two check-ins
- Respond
- Mark handled
- Persist handled state
- Dashboard/notification integration

### 11.2 Photo security
Reported storage:
- Private bucket `check-in-photos`
- Safe path pattern: `user_id/check_in_id/view-random-id.ext`
- JPG/PNG/WebP up to 5 MB
- No public access
- `upsert: false`
- Cleanup on partial failure
- Signed URLs
- Tested with a second client

Audit this thoroughly. Body photos are highly sensitive.

### 11.3 Photo reminder
Product idea:
- Monthly reminder every 30 days, or after every fourth weigh-in/measurement

Clarify before implementing if no current rule exists.

### 11.4 Progress screen
Target presentation:
- Current weight
- Change from start
- Weight graph
- Measurements
- Progress photos
- Check-in history
- Achievements/trends

Avoid technical tables as the primary client experience.

---

## 12. Notifications

Known requested logic:
- Workout reminder
- Meal reminder about one hour after expected time
- End-of-day reminder
- Morning/evening logic to avoid duplicate reminders if already completed
- Ability to move workout date
- Monthly/periodic body photo reminder

Reported base notification center exists, but the module has not been fully trusted in real-world usage.

Audit:
- Trigger source
- Timezone (Israel)
- Idempotency
- Read/unread persistence
- Duplicate prevention
- Notification delivery channel vs in-app only
- Coach visibility
- Failure handling

---

## 13. Content library

Reported existing client/coach content library.

Audit:
- Role access
- Publishing state
- Ordering/categories
- Mobile presentation
- Empty/loading/error states

Do not prioritize major expansion before core beta stability.

---

## 14. Client UI redesign

### 14.1 Current problem
The old UI is black/gold and visually resembles a website/admin dashboard. A previous design task only produced or demonstrated the opening/home screen and did not complete the full application. That result was not accepted.

### 14.2 Target direction
- White/light gray base
- Green primary color
- Modern health and fitness app
- Premium but approachable
- Clean cards
- Rounded corners
- Subtle shadows
- Generous spacing
- Clear hierarchy
- Hebrew RTL
- Mobile-first
- Not crowded or technical

### 14.3 Navigation
Mobile bottom navigation:
- Home
- Nutrition
- Workouts
- Progress
- Profile

Notification icon in top area.

Desktop can use a sidebar or wider shell while preserving application feel.

### 14.4 Home
Suggested structure:
- Greeting and client name
- Short personal sentence
- Profile/avatar
- Notification icon
- Daily completion/progress card
- Next best action CTA
- Compact cards: nutrition today, next workout, last weigh-in, next check-in
- Quick actions: log meal, start workout, enter weight, complete check-in

Avoid a grid of heavy dark rectangles.

### 14.5 Nutrition screen
- Daily calorie target
- Consumed/plan amount and remaining where relevant
- Macro display
- Meals as clean cards
- Meal status
- Free calories
- Clear CTA

### 14.6 Workouts
- Next workout
- Program/day name
- Exercise count
- Estimated duration
- Start button
- Weekly completion
- History

Workout execution must be thumb-friendly and fast.

### 14.7 Check-in
A short guided flow:
- Clear steps
- Weight
- Measurement
- Ratings
- Notes
- Photos
- Review before submit

Statuses:
- Not submitted
- Submitted
- Coach replied
- Handled

### 14.8 Profile
- Client details
- Goals
- Reminder settings
- Account settings
- Support
- Logout

### 14.9 Required states
Every major screen needs:
- Loading
- Empty
- Error
- Disabled/action feedback
- Responsive layout

### 14.10 Responsive widths
At minimum test:
- 375 px
- 430 px
- 768 px
- 1440 px

### 14.11 Design completion rule
The redesign is not complete until every client route has a consistent design. A home screen alone is not completion.

---

## 15. Coach UI/UX

Coach UI is functional but needs polish. Highest-value focus:
- Menu builder speed and clarity
- Client list and meaningful status
- Client detail organization
- Check-in review
- Workout assignment
- Notifications requiring action

Design principles:
- Optimize recurring tasks
- Show next action
- Reduce clicks and scrolling
- Use sticky summary/action areas where useful
- Preserve desktop productivity while remaining usable on tablet/mobile

---

## 16. START IQ - long-term intelligence

START IQ is an approved long-term feature concept.

It should analyze:
- Nutrition adherence
- Workouts completed
- Weight and measurement trends
- Check-in ratings
- Sleep/hunger/stress where collected
- Progress photos metadata, not unsafe automated body judgments
- Repeated behavioral patterns

It should proactively generate useful coaching insights rather than only charts.

Examples:
- “Weight is stable for 14 days while adherence is high; review calorie target.”
- “Most missed meals occur late evening.”
- “Workout performance is improving despite scale plateau.”
- “Client has not submitted a check-in or photo reminder is due.”

This is later-stage work. Do not let it delay beta.

---

## 17. Progress table - latest known state

These percentages are estimates from reports and conversation, not audited truth. Claude must replace them with an evidence-based audit.

| Module | Latest reported status | Real confidence | Required next action |
|---|---:|---|---|
| Infrastructure / Next.js / Supabase / Vercel | 100% | High | Verify repo, env and Preview/Production separation |
| Authentication / sessions / roles | 95-100% | Medium-high | Security and expiry audit |
| Coach dashboard | 92-95% | Medium | UX review and real workflows |
| Client dashboard functionality | 90-95% | Medium | Full redesign and route audit |
| Food database | Reported 100% (336/336) | Low | Re-import/audit against full Excel and search results |
| Nutrition/menu engine | Reported 95% | Low-medium | Fix/verify targets, totals, master foods, full catalog and persistence |
| Workouts | 95% | Medium-high | Full E2E and mobile UX |
| Check-ins | 100% reported | High but sensitive | Security retest and UX polish |
| Notifications | 85-90% | Medium-low | Logic/idempotency/timezone audit |
| Content library | 90-92% | Medium | UX and permission audit |
| Progress/weigh-ins | 90% | Medium | Charts and redesign |
| Client UI/UX | 35% | High confidence incomplete | Complete white/green redesign |
| Coach UI/UX | 40% | High confidence incomplete | Prioritize nutrition builder and recurring workflows |
| Automated tests | 119/119 reported | Medium | Run locally and inspect coverage/quality |
| Production build | Passing reported | Medium-high | Re-run on current branch |
| Real beta readiness | 80-85% estimated previously | Low until audit | Personal beta and critical defect fixes |

Do not repeat “92% complete” unless verified. Functional completeness and product readiness are different.

---

## 18. Known manual defects and contradictions

1. Macro targets remained blank after assigning a client with weight and calories.
2. Protein/carbs/fat plan summary remained blank after selecting foods.
3. Master-food option did not appear in the food picker.
4. Search for “גבינה” found no results.
5. Many foods were missing because the complete source Excel was not attached in the final run.
6. Prior report claimed 336/336 imported despite practical missing results.
7. UI redesign was reported via deployment status but not actually demonstrated across screens.
8. Some work was deployed to Production when Preview-only had been requested.
9. Local screenshot paths were provided instead of accessible screenshots.

Treat these as explicit regression tests.

---

## 19. Testing strategy

### 19.1 Required automated gates
Use exact commands from repository scripts:
- TypeScript/typecheck
- ESLint/lint
- Unit/integration tests
- Build

Do not delete or weaken existing tests to get green.

### 19.2 Core E2E scenarios
Authentication:
- Coach login
- Client login
- Correct redirects
- Unauthorized route blocking
- Session refresh

Nutrition:
- Select client with weight
- Set calories
- Auto macro calculation
- Master-food picker
- Full catalog search including Hebrew
- Primary/alternative calculation
- Unit display
- Totals update
- Free calories
- Save/refresh/edit/clone
- Client display

Workout:
- Assign program
- Start
- Log sets
- Refresh/resume
- Finish
- View coach history
- Move date and prevent duplicates

Check-in:
- Submit all fields
- Upload/remove/preview photos
- Refresh history
- Coach compare/respond/mark handled
- Cross-client denial

### 19.3 Manual acceptance
Eli performs a real browser/mobile check. A task is not accepted until he confirms it feels correct.

---

## 20. Git and release workflow

Recommended:
- Start from a clean working tree.
- Use a dedicated feature branch for substantial work.
- Make focused commits with meaningful messages.
- Push before risky refactors.
- Use Preview deployments.
- Merge/deploy to Production only after explicit approval.

Before any task:
- `git status`
- inspect branch and recent commits

Before handoff/completion:
- clean or explicitly documented working tree
- commit hash
- list of migrations
- test results
- Preview URL

Never force-push shared branches or rewrite history without approval.

---

## 21. Claude Code autonomous operation

Eli wants to work directly with Claude Code as the continuing engineer, without needing an external brief for every task.

Claude should:
- Read this document and repository memory each session.
- Maintain a current project status file.
- Propose the next highest-priority task after finishing the current one.
- Continue only after Eli approves major direction or risky changes.
- Independently inspect code, debug and run safe local commands.
- Ask for minimal human steps only when credentials/dashboard access are required.

Claude must not:
- Make uncontrolled Production deployments.
- Change business logic based on assumptions.
- Claim work is complete without evidence.
- keep running huge full suites after every tiny edit when targeted checks suffice.

At the end of each session update:
- `PROJECT_STATUS.md`
- Known defects
- Next recommended task
- Latest validation results
- Branch/commit/Preview

---

## 22. Immediate onboarding plan for Claude

### Phase A - Repository audit
1. Read all handoff files.
2. Inspect codebase and schema.
3. Verify branch and deployment state.
4. Run baseline checks.
5. Build route/module table.
6. Identify gaps between this handoff and actual code.

### Phase B - Stabilize nutrition
1. Obtain/locate full food Excel.
2. Audit import and search.
3. Verify curated master list mapping.
4. Fix macro auto-calculation.
5. Fix target vs actual totals.
6. Verify alternatives and units.
7. Complete save/refresh/edit/clone/client E2E.
8. Re-time the two-minute flow.

### Phase C - Client redesign
1. Inventory every client route/state.
2. Create design tokens/components.
3. Implement app shell and navigation.
4. Redesign home.
5. Redesign nutrition.
6. Redesign workouts/execution.
7. Redesign progress/check-ins.
8. Redesign content/notifications/profile.
9. Test responsive widths and real data.

### Phase D - Coach UX
1. Menu builder.
2. Client list/detail.
3. Check-in review.
4. Workout assignment.
5. Action-oriented dashboard.

### Phase E - Personal beta
1. Eli uses the app daily.
2. Log defects and friction.
3. Fix critical/high issues.
4. Verify analytics/logging and recovery.
5. Invite first beta clients.

### Phase F - Later roadmap
- START IQ
- AI technique analysis
- Advanced behavior analysis
- Subscription tier/product expansion

---

## 23. Definition of Done for any feature

A feature is complete only when:
- Product behavior matches the written requirement.
- UI works with real data, not only mocked data.
- Auth and RLS remain correct.
- Save/refresh/edit paths work.
- Responsive behavior is verified where relevant.
- Automated checks pass.
- A realistic scenario is manually verified.
- Preview is available when visual review is needed.
- Remaining limitations are disclosed.
- Eli approves the experience.

---

## 24. First response Claude should give Eli

After the initial audit, answer in Hebrew with:

1. **מה מצאתי בפועל** - architecture and current branch/deploy.
2. **מה עובד** - evidence-based list.
3. **מה שבור או חלקי** - especially nutrition and design.
4. **פערים מול מסמך המעבר**.
5. **טבלת התקדמות מעודכנת**.
6. **המשימה הבאה שאני ממליץ לבצע**.
7. **מה אני צריך ממך** - only truly necessary items, such as the full food Excel or Vercel/Supabase dashboard approval.

Do not edit code during the initial audit unless Eli explicitly asks to proceed immediately after seeing the plan.
