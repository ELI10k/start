# START — App Store review package

This is the submission-time source of truth. Do not submit until every item in
**Required outside the repository** has a real value and the TestFlight pass is
complete.

## Reviewer notes (paste into App Review Information)

START is an invite-only coaching app for clients of a personal fitness and
nutrition coach. The review account is pre-populated and does not represent a
real person.

To sign in:

1. Enter `[REVIEW_EMAIL]` on the login screen.
2. Select "כניסה לחשבון בדיקה" (test account login).
3. Enter `[REVIEW_PASSWORD]` and tap "כניסת בדיקה".

Features to review:

- Home: the client's current day and progress summary.
- Workouts: assigned plans, exercise instructions, set tracking and rest timer.
- Nutrition: assigned menu, meal completion, barcode scan and optional meal
  photo estimation.
- Progress and check-in: measurements, progress photographs and weekly form.
- Messages and content: communication with the assigned coach and educational
  material.
- Profile: privacy policy, terms, support and permanent account deletion.

Native functionality:

- Apple Health is used only to read step count after the user explicitly taps
  the step-permission control. The app remains usable if access is declined.
- Camera access is requested only when scanning a food barcode or taking a
  progress/meal image.
- Photo library access is requested only when the user chooses an existing
  image.
- Notifications are optional and are not required to use the app.

START does not write to Apple Health and does not use health or fitness data for
advertising, marketing, or data brokerage. There are no purchases or links to
purchase digital content in this build.

## Required outside the repository

- [ ] Active Apple Developer Program membership.
- [ ] App Store Connect app record for `co.il.startcoaching.app`.
- [x] Monitored support address: `start.elicohenfitness@gmail.com` (the optional
      `NEXT_PUBLIC_SUPPORT_EMAIL` variable may override it without a code change).
- [ ] `APPLE_TEAM_ID` configured on the production deployment.
- [ ] Dedicated reviewer client account with a strong password, marked
      `is_test_account=true`, populated with representative data, and included
      in `E2E_TEST_EMAILS`.
- [ ] `E2E_TEST_LOGIN_ENABLED=true` only while Apple review or controlled beta
      testing requires it. The allowlist must contain test identities only.
- [ ] Replace `[REVIEW_EMAIL]` and `[REVIEW_PASSWORD]` above in App Store
      Connect; never commit the password.
- [ ] Privacy Policy URL: `https://start.elicohenfitness.co.il/privacy`.
- [ ] Support URL: `https://start.elicohenfitness.co.il/app-support`.
- [ ] App Privacy answers completed from `docs/app-privacy-disclosure.md`.
- [ ] Age rating, category, copyright, review contact, screenshots and app
      description completed.
- [ ] Export-compliance questions answered from the final binary's actual use
      of encryption; do not guess.
- [ ] If payments are added later, reassess Apple's in-app purchase rules before
      shipping them.

## TestFlight acceptance pass

- [ ] Fresh install and reviewer password login.
- [ ] Magic-link login returns to the native app.
- [ ] App works after Apple Health permission is declined.
- [ ] Step sync works after permission is granted on a device with Health data.
- [ ] Camera scan, photo selection and upload work.
- [ ] Workout start, set save, completion and history work.
- [ ] Nutrition logging, check-in, messages and content work.
- [ ] Push opt-in, foreground delivery and notification tap routing work.
- [ ] Account deletion removes access and the user cannot sign in again.
- [ ] Privacy, terms and public support pages work while signed out.
- [ ] Offline and server-unavailable states are understandable and recover.
- [ ] No production page contains placeholders, demo limitations or broken URLs.
