# Professional workout revision — 2026-10-06

Replaces the 37 LIFE FIT templates with versioned v2 trees, plus an explicit male beginner gym FBW (38 active templates, 85 distinct days). It does not claim independent trainer certification or medical clearance. Older imported programmes outside this generated catalogue are not silently rewritten.

## Corrections

- All A-B splits are upper/lower. PPL isolates pulling and glute work to the appropriate days; emphasis uses order and a bounded dose, not overlapping extras on Push.
- Starting dose is checked against the busiest rotating week, including 3-day A-B and 4/5-day PPL. Editorial starting ceilings: 12 direct working sets for beginner large regions, 18 for other levels, 8 for arms/core/calves. They are product defaults, not universal physiological limits; compound contributions are counted conservatively for legs and glutes. Indirect arm work remains a consideration for coach review.
- Redundant novice leg compounds are removed before dose reduction. Supported gym rows replace the unsupported advanced heavy row. Home rows precede lower-body hinges; the bench version uses support.
- Fixed targets: mostly 10 compound/12 accessory repetitions, with 6 on externally loaded compounds for intermediate/advanced strength goals. Muscle-gain goals can add accessory sets within volume/time ceilings. RIR 3 beginners / RIR 2 others are starting targets, not an automatic RPE 9 by level.
- Planks start at 20/25/30 seconds, finish before posture breaks, and use time/variation progression rather than repetition-based RIR. Static holds are limited to core.
- Preparation uses brief 50% × 8 and 80% × 3 compound ramps, or 50% × 6 for accessories, on the first loaded exercise of each muscle. Unknown starting loads are not invented. Approximate warm-up loads must be adapted to available equipment. Legacy user-authored programme protocols remain unchanged.
- Programme notes explain two-exposure load progression, regressions, pain-stop guidance and coach-reviewed deloads. The client load challenge never treats prescribed RPE as reported performance, needs two successful easy exposures, and suppresses timed-exercise weight challenges. Load changes are suggestions, not forced input values.
- Bodyweight station templates require verified target ability, not merely years of experience. Dumbbells without a bench default to approved wall pushups if floor capacity is unverified. Unsupported strength goals with bodyweight/TRX require coach-chosen leverage/load.
- Time estimates include preparation, both sides of unilateral work, working rests and transitions. Short versions reduce sets without shortening prescribed rest or silently dropping movements. If the minimum version exceeds availability, automatic assignment stops for coach review; the estimate is not a guaranteed duration.
- A/B and PPL rotate across calendar weeks. The dashboard uses the same rotation and stops recommending additional automatic sessions when the assigned week is complete.

## Data and deployment

New IDs end in `-v2`; original days, prescriptions, sessions and sets are never deleted. Only the exact replaced official originals are archived. The migration aborts if active assignments to original templates or their copies appear before migration, so real clients are not silently rewritten. No active originals/copies were found during preparation; this must be rechecked live after deployment.

Generator requires an explicit new professional migration path and cannot overwrite the historical applied migration. Apply `20261006135206_professional_workout_revision.sql`, deploy the matching application, and run `scripts/verify-personalized-workouts.mjs` against the canonical app. Verification uses only an isolated test coach and a disposable client; it removes that client's test copies afterwards.

Recovery preserves every old tree: archive v2 IDs and reactivate the exact original official IDs, with a matching application rollback. Do not delete any new client assignments or histories.

## Evidence and verification

Design informed by the [2026 ACSM overview of resistance-training reviews](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) and [NSCA time-efficient training guidance](https://www.nsca.com/education/articles/ptq/time-efficient-training/). Neither prescribes these product-specific ceilings as universal rules; failure training is not mandatory, dose/recovery and individual response matter.

Automated coverage: all 38 programmes × supported frequencies × goals; fixed prescriptions, peak volume, A-B/PPL separation, priority order, approved variants, actual time gates, goal persistence, brief ramps, conservative progression and cross-week scheduling. Individual execution, pain, recovery and medical circumstances still require trainer assessment.
