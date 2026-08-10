import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

// START is a server-rendered Next.js app: server components, server actions and
// a proxy that refreshes the Supabase session on every request. Exporting it to
// static files for the shell would mean giving all of that up, so the shell
// loads the deployed app instead and contributes what only a native container
// can - HealthKit and Health Connect, APNs and FCM, the camera, deep links and
// the safe areas.
//
// That is why there is no rewrite here, and why the web app keeps working
// unchanged: it is the same app, in a window that has more permissions.
//
// START_NATIVE_SERVER_URL points the shell at a build. Leave it unset for a
// local run against `npm run dev` over the LAN, set it to the Preview URL to
// test a branch, and to the production URL for a TestFlight build.
const serverUrl = process.env.START_NATIVE_SERVER_URL;

const config: CapacitorConfig = {
  appId: "co.il.startcoaching.app",
  appName: "START",
  // Only a fallback: an offline splash for when the device cannot reach the
  // server at all. The real UI comes from serverUrl.
  webDir: "native/www",
  ios: {
    contentInset: "always",
    // The app is Hebrew and right-to-left throughout.
    scheme: "START",
  },
  android: {
    allowMixedContent: false,
  },
  server: serverUrl
    ? { url: serverUrl, cleartext: false }
    : undefined,
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#FFFFFF",
      androidSpinnerStyle: "small",
      iosSpinnerStyle: "small",
      spinnerColor: "#16A34A",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      // The keyboard resizes the native view rather than the web view, which is
      // what keeps the sticky workout header and the set rows from being pushed
      // off screen while a weight is being typed.
      resize: KeyboardResize.Native,
    },
  },
};

export default config;
