"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

type CapacitorGlobal = { isNativePlatform?: () => boolean };

const ANDROID_PACKAGE = "co.il.startcoaching.app";

// An Android intent link that hands this same confirm-link URL to the LIFE FIT
// app by package name. Unlike a plain https link it does not depend on Android
// having verified the App Link, which a sideloaded or freshly installed app may
// not have done yet, so the sign-in still lands inside the app's web view.
export function androidAppIntent(host: string, tokenHash: string, next: string): string {
  const query = new URLSearchParams({ token_hash: tokenHash, type: "magiclink" });
  if (next) query.set("next", next);
  return `intent://${host}/auth/confirm-link?${query.toString()}#Intent;scheme=https;package=${ANDROID_PACKAGE};end`;
}

export default function MagicLinkConfirmation({ tokenHash, next }: { tokenHash: string; next: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  // A phone browser on Android gets the option to finish the sign-in in the
  // app. The token is only spent when one of the two buttons is tapped.
  const isAndroidBrowser = useSyncExternalStore(
    () => () => {},
    () => /Android/i.test(navigator.userAgent) &&
      !(window as { Capacitor?: CapacitorGlobal }).Capacitor?.isNativePlatform?.(),
    () => false,
  );
  const appIntent = isAndroidBrowser ? androidAppIntent(typeof window === "undefined" ? "" : window.location.host, tokenHash, next) : null;

  useEffect(() => {
    const capacitor = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (capacitor?.isNativePlatform?.() || standalone) {
      formRef.current?.requestSubmit();
    }
  }, []);

  return <>
    {appIntent && <a href={appIntent} className="premium-primary-button mt-7 block w-full text-center">
      כניסה באפליקציית LIFE FIT
    </a>}
    <form ref={formRef} action="/auth/accept-link" method="post" className={appIntent ? "mt-3" : "mt-7"}>
      <input type="hidden" name="token_hash" value={tokenHash}/>
      <input type="hidden" name="next" value={next}/>
      <button type="submit" className={appIntent ? "w-full py-3 text-sm font-bold text-[#15803D]" : "premium-primary-button w-full"}>
        {appIntent ? "כניסה בדפדפן" : "כניסה מאובטחת והמשך"}
      </button>
    </form>
  </>;
}
