"use client";

import { useEffect, useRef } from "react";

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export default function MagicLinkConfirmation({ tokenHash, next }: { tokenHash: string; next: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const capacitor = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!capacitor?.isNativePlatform?.() && !standalone) return;

    formRef.current?.requestSubmit();
  }, []);

  return <>
    <form ref={formRef} action="/auth/accept-link" method="post" className="mt-7">
      <input type="hidden" name="token_hash" value={tokenHash}/>
      <input type="hidden" name="next" value={next}/>
      <button type="submit" className="premium-primary-button w-full">
        כניסה מאובטחת והמשך
      </button>
    </form>
  </>;
}
