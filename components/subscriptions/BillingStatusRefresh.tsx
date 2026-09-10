"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Webhooks can arrive a few seconds after the browser returns from checkout. */
export default function BillingStatusRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (active) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 10) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return null;
}
