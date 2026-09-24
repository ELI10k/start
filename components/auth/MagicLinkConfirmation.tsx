"use client";

import { useEffect, useRef, useState } from "react";

export default function MagicLinkConfirmation({ tokenHash, next }: { tokenHash: string; next: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const native = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (!native || !form.current) return;
    setSubmitting(true);
    form.current.requestSubmit();
  }, []);

  return <form ref={form} action="/auth/accept-link" method="post" className="mt-7" onSubmit={() => setSubmitting(true)}>
    <input type="hidden" name="token_hash" value={tokenHash}/>
    <input type="hidden" name="next" value={next}/>
    <button type="submit" disabled={submitting} className="premium-primary-button w-full">
      {submitting ? "מתחברים…" : "כניסה מאובטחת והמשך"}
    </button>
  </form>;
}
