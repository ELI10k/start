# START — native readiness audit

What it would take to ship START through TestFlight and Play internal testing,
and what stands in the way today. Written against the app as it is, not as it
might be rearranged.

## The finding that decides the approach

**START cannot be statically exported, so Capacitor cannot bundle it as assets.**

Eight modules are Server Actions (`app/actions/*.ts`, `app/login/actions.ts`),
every screen reads Supabase through a cookie-bound server client, and the whole
auth model — magic link, invite acceptance, single-device enforcement — runs on
the server. `next build` produces a server application; there is no `output:
"export"` path that keeps any of that working.

That leaves two honest options:

### Option A — Capacitor as a shell over the deployed site (recommended)

The native app opens `https://start.elicohenfitness.co.il` in a `WKWebView` and
uses Capacitor plugins for camera, health and push. Nothing about the web app
changes; the server stays the server.

- Works with the current architecture, today.
- Auth keeps working: cookies persist in the web view.
- Barcode, HealthKit and push become available through plugins.
- Apple has rejected thin web wrappers under guideline 4.2 before. The defence is
  that the app does things a browser cannot — HealthKit steps, real push, camera
  barcode — so those need to be in the first submission, not added later.

### Option B — split the app

A native shell with its own client that talks to Supabase directly, sharing only
the database. This is a rewrite of the data layer and is not proportionate to
getting one person into a personal test.

**Recommendation: Option A**, with HealthKit and push present in build one.

## Per-platform checklist

### iOS

| Item | State |
|---|---|
| App ID / bundle identifier | **BLOCKED-EXTERNAL** — needs an Apple Developer account |
| Signing certificate, provisioning profile | **BLOCKED-EXTERNAL** |
| Xcode + CocoaPods on this machine | not verified; no Xcode project exists yet |
| App icon, splash | not made — needs a 1024px master |
| Safe areas | **done** — `env(safe-area-inset-*)` is used by the shell, the bottom bar, sheets and the FAB |
| Status bar style | not set; needs `@capacitor/status-bar`, light content on white |
| Keyboard behaviour | needs `@capacitor/keyboard` with `resize: body`, else sticky bars sit under the keyboard |
| Camera / barcode permission | `NSCameraUsageDescription` required in `Info.plist` |
| HealthKit | `NSHealthShareUsageDescription` + the HealthKit capability; **BLOCKED-EXTERNAL** for the entitlement |
| Push | APNs key + capability — **BLOCKED-EXTERNAL** |
| Deep links | Universal Links need `apple-app-site-association` served from the domain |
| Auth redirect | magic links must open the app, not Safari, or the session lands in the wrong place |

### Android

| Item | State |
|---|---|
| Package name | free to choose |
| Play Developer account | **BLOCKED-EXTERNAL** |
| Keystore / signing | **BLOCKED-EXTERNAL** |
| Icon, splash | not made |
| Camera permission | `android.permission.CAMERA` |
| Health Connect | `androidx.health.connect` permissions, plus a privacy-policy URL Google requires |
| Push | FCM `google-services.json` — **BLOCKED-EXTERNAL** |
| Deep links | App Links need `assetlinks.json` on the domain |

## What is already native-ready

- **Safe areas.** The shell, bottom navigation, sheets, FAB and session bars all
  use `env(safe-area-inset-*)`.
- **Touch targets.** Enforced at 44px by `e2e/qa-sweep.spec.ts` across 25 screens.
- **No horizontal scroll** at 320px, enforced by the same sweep.
- **Barcode data layer.** The lookup route, provenance model, validation and
  manual-entry flow are done and tested. Only the camera source is missing on
  iOS, where `BarcodeDetector` does not exist — `@capacitor-mlkit/barcode-scanning`
  fills exactly that gap and the UI already routes around it.
- **Offline-ish behaviour.** Not built. See below.

## What is missing regardless of accounts

1. **Offline.** No service worker, no cache, no offline state. A dropped
   connection currently shows a Next error boundary. This is the largest gap for
   daily use — a gym basement has no signal.
2. **Push plumbing.** No device-token table, no send path. The in-app
   notification model exists and would feed it.
3. **Steps.** No table, no read path, no UI.
4. **Analytics and crash reporting.** Nothing.
5. **App icon and splash.** No master asset exists.

## Order I would do it in

1. Offline — it is the only item that improves the web app on its own, and it is
   the one that will bite hardest in a gym.
2. Capacitor shell + camera barcode, so the scanner works on an iPhone.
3. Steps via HealthKit — the highest-value native-only feature.
4. Push, once APNs exists.
5. Store submission.

Steps 1 needs nothing from outside. Steps 2–5 need an Apple Developer account
before they can leave the simulator.
