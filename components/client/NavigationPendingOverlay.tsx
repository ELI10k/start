"use client";

import { useLinkStatus } from "next/link";

// Next keeps the old route visible while a dynamic destination is still being
// prepared. That makes a successful tap look ignored. This overlay belongs to
// the clicked Link, so it appears in the same frame as the pending state and is
// removed automatically when the destination commits.
export default function NavigationPendingOverlay() {
  const { pending } = useLinkStatus();
  return (
    <span className="navigation-pending-overlay" data-pending={pending || undefined} aria-hidden="true">
      <span className="navigation-pending-overlay__header">LIFE FIT</span>
      <span className="navigation-pending-overlay__content">
        <span className="navigation-pending-overlay__title" />
        <span className="navigation-pending-overlay__grid">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </span>
      </span>
    </span>
  );
}
