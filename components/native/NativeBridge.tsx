"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Keyboard } from "@capacitor/keyboard";
import { Network } from "@capacitor/network";
import { PushNotifications } from "@capacitor/push-notifications";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { connectionStore } from "@/lib/offline/connection";
import { StartHealth } from "@/lib/native/health-plugin";
import { safeDeepLink } from "@/lib/push/providers";
import type { HealthPermissionState } from "@/lib/health/types";
import type { PushPermissionState } from "@/lib/push/types";

// The single place the shell's capabilities are handed to the app. Everything
// the web build already wrote against - window.StartHealth, window.StartPush,
// the connection store - is satisfied here, so no screen has to know whether it
// is running in a browser or in a container.
//
// Renders nothing, and does nothing at all on the web.
export default function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
    const cleanups: (() => void)[] = [];

    (window as { StartNative?: { platform: string } }).StartNative = { platform };

    // Chrome first, so the app is not sitting under a black status bar while the
    // rest of this runs.
    void StatusBar.setStyle({ style: Style.Light });
    if (platform === "android") void StatusBar.setBackgroundColor({ color: "#FFFFFF" });
    void SplashScreen.hide();
    // "native" resize keeps the RTL layout intact when the keyboard opens; the
    // set-row inputs in a workout are the case that matters.
    void Keyboard.setAccessoryBarVisible?.({ isVisible: true }).catch(() => {});

    // The container knows about the network before a request fails, so the
    // offline banner appears immediately rather than after the first timeout.
    void Network.getStatus().then((status) => {
      if (status.connected) connectionStore.reportSuccess();
      else connectionStore.reportFailure(new Error("network request failed"));
    });
    void Network.addListener("networkStatusChange", (status) => {
      if (status.connected) connectionStore.reportSuccess();
      else connectionStore.reportFailure(new Error("network request failed"));
    }).then((handle) => cleanups.push(() => void handle.remove()));

    // A start:// link or a universal link arrives here. Only the path is used,
    // and only after the same check a tapped notification goes through.
    void App.addListener("appUrlOpen", ({ url }) => {
      try {
        const parsed = new URL(url);
        router.push(safeDeepLink(`${parsed.pathname}${parsed.search}`, "/"));
      } catch {
        router.push("/");
      }
    }).then((handle) => cleanups.push(() => void handle.remove()));

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
    }).then((handle) => cleanups.push(() => void handle.remove()));

    void PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const href = (notification.data as { href?: string } | undefined)?.href;
      for (const handler of openHandlers) handler({ href });
    }).then((handle) => cleanups.push(() => void handle.remove()));

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

    return () => { for (const cleanup of cleanups) cleanup(); };
  }, [router]);

  return null;
}
