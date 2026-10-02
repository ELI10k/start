"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { releaseOrphanedBodyScrollLock } from "@/lib/browser/body-scroll-lock";

/** Restores coach-page scrolling after an older modal or route left it locked. */
export default function CoachScrollRecovery() {
  const pathname = usePathname();

  useEffect(() => {
    releaseOrphanedBodyScrollLock();
  }, [pathname]);

  return null;
}
