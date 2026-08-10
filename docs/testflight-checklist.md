# TestFlight checklist

Everything that could be done without an Apple account is done. This is the
ordered list of what is left, separated into what needs a credential and what
does not.

## Done

| Item | Where |
| --- | --- |
| Bundle ID `co.il.startcoaching.app` | `capacitor.config.ts`, both platforms |
| Display name `START` | `ios/App/App/Info.plist`, `android/app/src/main/res/values/strings.xml` |
| App icon, every density | `scripts/generate-app-icons.mjs` — regenerate with `node scripts/generate-app-icons.mjs` |
| Splash screen | same script; held until the app reports it is ready |
| Camera purpose string | `NSCameraUsageDescription` |
| HealthKit purpose strings | `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription` |
| Photo library purpose string | `NSPhotoLibraryUsageDescription` |
| Push background mode | `UIBackgroundModes` → `remote-notification` |
| APNs token forwarding | `ios/App/App/AppDelegate.swift` |
| Deep-link scheme `start://` | `CFBundleURLTypes`, `AndroidManifest.xml` |
| RTL and Hebrew localisation | `CFBundleLocalizations`, `android:supportsRtl` |
| Safe areas | `viewportFit: "cover"` in `app/layout.tsx` |
| Release/environment config | `START_NATIVE_SERVER_URL`, below |

Notification permission needs no purpose string on iOS - the system supplies the
wording. START asks in its own words first, in the notification preferences, so
the system prompt is never the first time a client hears about it.

## Environment

The shell points at a deployment rather than bundling one:

```bash
# Preview build
START_NATIVE_SERVER_URL=https://<preview-deployment>.vercel.app npx cap sync

# TestFlight build
START_NATIVE_SERVER_URL=https://<production-domain> npx cap sync
```

`npx cap sync` writes the value into `ios/App/App/capacitor.config.json`, so the
build is pinned to whatever was set when it ran. Check that file before
archiving; a TestFlight build pointing at a Preview URL is the easiest mistake
here to make and the hardest to notice.

Server-side variables are unchanged and already set on Vercel:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

## BLOCKED-EXTERNAL — needs an account or a credential

1. **Apple Developer Program** ($99/year). Without it there is no signing
   identity, no provisioning profile and no App Store Connect record, so no
   build can be uploaded.
2. **App Store Connect app record** — create it with bundle ID
   `co.il.startcoaching.app` and the name START.
3. **Signing in Xcode** — open `ios/App/App.xcodeproj`, select the team, and let
   Xcode manage signing.
4. **Capabilities in Xcode** — add *HealthKit* and *Push Notifications* to the
   App target. Both are declared in `Info.plist`; the entitlement itself needs
   the team.
5. **APNs key** — App Store Connect → Keys → new key with APNs enabled. Set
   `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` and `APNS_BUNDLE_ID` on
   Vercel. Until they exist `/api/push/dispatch` records every delivery as
   skipped with the reason, rather than pretending it sent.
6. **FCM service account** (Android only) — `google-services.json` into
   `android/app/`, and `FCM_SERVICE_ACCOUNT_JSON` on Vercel.
7. **Health Connect on Android** — add `androidx.health.connect:connect-client`
   and the `READ_STEPS` permission in Android Studio, then implement the reads in
   `StartHealthPlugin.java`. The iOS half is already written.

## Manual steps that need Xcode but no purchase

- Confirm `StartHealthPlugin.swift` is a member of the App target. Capacitor 8
  uses synchronised folders, so it usually is, but a plugin missing from the
  build phase fails silently - `window.StartHealth` simply never appears and the
  steps card reports "unavailable", which looks identical to a device with no
  health store.
- Set the marketing version and build number before archiving.

## Order to work in

Apple Developer → App Store Connect record → signing → capabilities → archive →
TestFlight. Push can follow afterwards: the app is fully usable without it, and
the outbox holds every notification that was queued in the meantime.
