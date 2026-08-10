"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { connectionStore } from "@/lib/offline/connection";
import { safeDeepLink } from "@/lib/push/providers";
import type { HealthPermissionState } from "@/lib/health/types";
import type { PushPermissionState } from "@/lib/push/types";

// The single place the shell's capabilities are handed to the app. Everything
// the web build already wrote against - window.StartHealth, window.StartPush,
// the connection store - is satisfied here, so no screen has to know whether it
// is running in a browser or in a container.
//
// Every Capacitor import is dynamic and happens *after* the native check. A
// static import would put the whole plugin set into the bundle that every web
// visitor downloads, to run code that can only ever no-op there. The container
// injects window.Capacitor before the web app loads, so the check itself needs
// no import at all.
type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string };

export default function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    const capacitor = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!capacitor?.isNativePlatform?.()) return;
    const platform = capacitor.getPlatform?.() === "ios" ? "ios" : "android";

    let cancelled = false;
    const cleanups: (() => void)[] = [];
    const track = (remove: () => void) => {
      if (cancelled) remove();
      else cleanups.push(remove);
    };

    (window as { StartNative?: { platform: string } }).StartNative = { platform };

    void (async () => {
      const [{ App }, { Keyboard }, { Network }, { PushNotifications }, { SplashScreen }, { StatusBar, Style }, { StartHealth }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/keyboard"),
        import("@capacitor/network"),
        import("@capacitor/push-notifications"),
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
        import("@/lib/native/health-plugin"),
      ]);
      if (cancelled) return;

      // Chrome first, so the app is not sitting under a black status bar while
      // the rest of this runs.
      void StatusBar.setStyle({ style: Style.Light });
      if (platform === "android") void StatusBar.setBackgroundColor({ color: "#FFFFFF" });
      void SplashScreen.hide();
      void Keyboard.setAccessoryBarVisible?.({ isVisible: true }).catch(() => {});

      // The container knows about the network before a request fails, so the
      // offline banner appears immediately rather than after the first timeout.
      const report = (connected: boolean) =>
        connected ? connectionStore.reportSuccess() : connectionStore.reportFailure(new Error("network request failed"));
      void Network.getStatus().then((status) => report(status.connected));
      void Network.addListener("networkStatusChange", (status) => report(status.connected)).then((handle) => track(() => void handle.remove()));

      // A start:// link or a universal link arrives here. Only the path is used,
      // and only after the same check a tapped notification goes through.
      void App.addListener("appUrlOpen", ({ url }) => {
        try {
          const parsed = new URL(url);
          router.push(safeDeepLink(`${parsed.pathname}${parsed.search}`, "/"));
        } catch {
          router.push("/");
        }
      }).then((handle) => track(() => void handle.remove()));

      // Steps, through the custom plugin.
      (window as { StartHealth?: unknown }).StartHealth = {
        source: platform === "ios" ? "healthkit" : "health-connect",
        isAvailable: async () => (await StartHealth.isAvailable()).available,
        getPermission: async () => (await StartHealth.getPermission()).status as HealthPermissionState,
        requestPermission: async () => (await StartHealth.requestPermission()).status as HealthPermissionState,
        readDailySteps: async (fromDay: string, toDay: string) => (await StartHealth.readDailySteps({ fromDay, toDay })).days,
      };

      // Push, through the official plugin. The token is handed to the app's own
      // registration component, which is what writes it to Supabase.
      let token = "";
      const tokenHandlers = new Set<(value: string) => void>();
      const openHandlers = new Set<(payload: { href?: string }) => void>();

      void PushNotifications.addListener("registration", ({ value }) => {
        token = value;
        for (const handler of tokenHandlers) handler(value);
      }).then((handle) => track(() => void handle.remove()));

      void PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const href = (notification.data as { href?: string } | undefined)?.href;
        for (const handler of openHandlers) handler({ href });
      }).then((handle) => track(() => void handle.remove()));

      const toState = (value: string): PushPermissionState =>
        value === "granted" ? "granted" : value === "denied" ? "denied" : "prompt";

      (window as { StartPush?: unknown }).StartPush = {
        platform,
        provider: platform === "ios" ? "apns" : "fcm",
        isAvailable: async () => true,
        getPermission: async () => toState((await PushNotifications.checkPermissions()).receive),
        requestPermission: async () => {
          const result = await PushNotifications.requestPermissions();
          const state = toState(result.receive);
          // Registering is what produces the token; asking without registering
          // leaves the app permitted but unaddressable.
          if (state === "granted") await PushNotifications.register();
          return state;
        },
        getToken: async () => token,
        onTokenChange: (handler: (value: string) => void) => {
          tokenHandlers.add(handler);
          return () => tokenHandlers.delete(handler);
        },
        onNotificationOpened: (handler: (payload: { href?: string }) => void) => {
          openHandlers.add(handler);
          return () => openHandlers.delete(handler);
        },
      };

      // An already-permitted install re-registers on every launch, because APNs
      // and FCM both rotate tokens without telling the app first.
      void PushNotifications.checkPermissions().then((result) => {
        if (result.receive === "granted") void PushNotifications.register();
      });
    })();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [router]);

  return null;
}
