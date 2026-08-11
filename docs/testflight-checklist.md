# TestFlight checklist

Everything that can be done without an Apple Developer account is done, including
the things that are normally clicked by hand in Xcode. What is left is the part
that genuinely needs the account.

## The short version

Once the Apple Developer account is active:

1. `START_NATIVE_SERVER_URL=https://start.elicohenfitness.co.il node scripts/native-sync.mjs`
2. `npx cap open ios`
3. In **Signing & Capabilities**, pick the team. Leave "Automatically manage
   signing" on.
4. Set `APPLE_TEAM_ID` on Vercel to the 10-character Team ID, and redeploy.
5. Product → Archive → Distribute → TestFlight.

Steps 3 and 4 are the only manual ones, and step 4 is a single environment
variable. Everything else is committed.

## Already done, so you do not have to

| Thing | Where it lives |
| --- | --- |
| Bundle ID `co.il.startcoaching.app` | `capacitor.config.ts`, both build configurations |
| Display name START | `Info.plist`, `strings.xml` |
| App icon, every density, full bleed | `scripts/generate-app-icons.mjs` |
| Splash screen | same script, held until the app says it is ready |
| **Swift files in the build target** | `scripts/register-ios-sources.mjs` |
| **StartHealth plugin registered** | `StartViewController.swift` |
| **HealthKit + Push entitlements** | `App.entitlements`, wired by `scripts/register-ios-entitlements.mjs` |
| **Universal Links entitlement** | `App.entitlements` |
| **apple-app-site-association served** | `app/.well-known/apple-app-site-association/route.ts` |
| APNs token forwarding | `AppDelegate.swift` |
| Camera / HealthKit / photo purpose strings, in Hebrew | `Info.plist` |
| Push background mode | `Info.plist` |
| `start://` scheme | `Info.plist`, `AndroidManifest.xml` |
| RTL and Hebrew | `CFBundleLocalizations`, `android:supportsRtl` |
| Safe areas | `viewportFit: "cover"` in `app/layout.tsx` |
| Keyboard resizes the native view | `capacitor.config.ts` |
| Version 1.0, build 1 | project build settings |

The four in bold are the ones that are usually forgotten and fail silently. A
Swift file outside the Sources phase is not compiled; a plugin that is not
registered never appears as `window.StartHealth`, and the steps card then reports
"no health store on this device" - identical to a phone with HealthKit switched
off. `scripts/native-sync.mjs` re-applies all of it after every `cap sync`, and is
idempotent.

## Why Universal Links matter here

The shell loads the deployed site in a web view with its own cookie store. A
magic-link email tapped on the phone opens in **Safari**, so the session is
established in Safari's cookies and the app is still signed out. No amount of
session-persistence work fixes that; the link has to open in the app.

That is what the associated-domains entitlement and the
`apple-app-site-association` route are for. The route returns 404 until
`APPLE_TEAM_ID` is set, deliberately: iOS caches this file, and a placeholder
Team ID would be cached as a wrong answer and keep working against you after the
real one arrived.

Until then, sign in inside the app using the email and the link **opened on the
same device from within the app's browser**, or use a test account.

## BLOCKED-EXTERNAL

| Blocker | Unblocks | Note |
| --- | --- | --- |
| Apple Developer Program | signing, archive, TestFlight | $99/year |
| Team ID → `APPLE_TEAM_ID` on Vercel | Universal Links, so magic links open in the app | 10 characters, from Membership |
| APNs key | push actually leaving the outbox | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID` |
| FCM service account | Android push | not needed for the iPhone test |
| Health Connect dependency | Android steps | not needed for the iPhone test |
| Vercel CLI login | a Preview URL from this machine | `vercel login` |

Nothing above is invented here: no certificates, no profiles, no keys.

## If signing complains

The entitlements file is wired into both build configurations. If Xcode objects
to a capability before the App ID has it, automatic signing will normally just
add it. If it does not, removing the two `CODE_SIGN_ENTITLEMENTS` lines from
`project.pbxproj` reverts this exactly - at the cost of push and HealthKit,
which need those entitlements to function at all.

## One thing to check before archiving

`ios/App/App/capacitor.config.json` carries the URL the build is pinned to.
`scripts/native-sync.mjs` prints it on every run. A TestFlight build pointed at a
Preview URL is the easiest mistake here to make and the hardest to notice
afterwards.
