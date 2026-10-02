type ScrollLockBody = {
  style: {
    overflow: string;
  };
};

let lockedBody: ScrollLockBody | null = null;
let lockCount = 0;
let overflowBeforeFirstLock = "";

/**
 * Prevent the document behind a modal surface from scrolling.
 *
 * Modal surfaces can overlap briefly during navigation and React can hide a
 * route before unmounting it. Saving/restoring `body.style.overflow` inside
 * each component lets the last cleanup restore another modal's `hidden`
 * value, permanently freezing the page. A shared, reference-counted lock only
 * restores the original value after the final owner releases it.
 */
export function acquireBodyScrollLock(
  body: ScrollLockBody = document.body,
): () => void {
  if (lockCount === 0 || lockedBody !== body) {
    lockedBody = body;
    overflowBeforeFirstLock = body.style.overflow;
    body.style.overflow = "hidden";
    lockCount = 0;
  }

  lockCount += 1;
  let released = false;

  return () => {
    if (released || lockedBody !== body) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);

    if (lockCount === 0) {
      body.style.overflow = overflowBeforeFirstLock;
      lockedBody = null;
      overflowBeforeFirstLock = "";
    }
  };
}

/** Clear a lock left behind by an older route or bundle when no live modal owns it. */
export function releaseOrphanedBodyScrollLock(
  body: ScrollLockBody = document.body,
): void {
  if (lockCount !== 0 || body.style.overflow !== "hidden") return;
  body.style.overflow = "";
}
