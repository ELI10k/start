# The native shell

START is a server-rendered Next.js app: server components, server actions, and a
proxy that refreshes the Supabase session on every request. A static export for a
native container would mean giving all of that up.

So the shell does not bundle the app. It loads it, and contributes the things
only a native container can: HealthKit and Health Connect, APNs and FCM, the
camera, deep links, network state and the safe areas. The web app keeps working
exactly as it does now, because it is the same app in a window with more
permissions.

## Running it

```bash
# Against a deployed build (Preview or production)
START_NATIVE_SERVER_URL=https://<deployment> npx cap sync
npx cap open ios        # or: npx cap open android
```

With `START_NATIVE_SERVER_URL` unset the shell falls back to `native/www`, which
is a single offline page. That is deliberate - a shell pointing at nothing should
say so rather than show a blank screen.

## How the app sees the container

Nothing in the app imports Capacitor. `components/native/NativeBridge.tsx` is
mounted once in the client shell and, on a device only, sets three globals the
web layer already writes against:

| Global | Consumed by | Falls back to |
| --- | --- | --- |
| `window.StartHealth` | `lib/health/providers.ts` | "no health store on this device" |
| `window.StartPush` | `lib/push/providers.ts` | "push is available in the app" |
| `window.StartNative` | `lib/analytics/client.ts` | platform `web` |

It also reports Capacitor's network state into the offline store, so the banner
appears the moment the phone drops signal rather than after a request times out.

Every one of those fallbacks is a state the UI already renders honestly, which
is why the browser build needs no branching.

## The custom plugin

`StartHealth` is the only plugin written here; everything else is official.
Its contract is in `lib/native/health-plugin.ts` and is written in the terms the
app actually wants: is a health store present, has the user agreed, and steps for
a range of **calendar days in the device's own timezone**. Handing back instants
and converting in JavaScript would reintroduce the timezone bug the steps layer
exists to avoid.

- iOS: `ios/App/App/StartHealthPlugin.swift` — reads the HealthKit daily total,
  which is already merged across phone, watch and ring. A day HealthKit has
  nothing for is omitted rather than reported as zero, because "the phone was
  off" and "the client did not walk" are different facts.
- Android: `android/app/src/main/java/co/il/startcoaching/app/StartHealthPlugin.java`
  — **BLOCKED-EXTERNAL.** Reading steps needs `androidx.health.connect:connect-client`
  on the classpath and the `READ_STEPS` permission, and both need Android Studio
  to resolve and build. Until then it answers "unavailable" honestly.

## What still needs a machine I do not have

- **Xcode**: opening `ios/App` to confirm `StartHealthPlugin.swift` is in the
  target's build phase, and to add the HealthKit capability and the Push
  Notifications capability.
- **Signing**: an Apple Developer account for a TestFlight build, and an APNs key
  for push to leave the outbox.
- **Android Studio**: the Health Connect dependency, and `google-services.json`
  for FCM.

See `docs/testflight-checklist.md` for the ordered list.
