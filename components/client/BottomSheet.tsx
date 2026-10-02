"use client";
import { useEffect, useEffectEvent, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { acquireBodyScrollLock } from "@/lib/browser/body-scroll-lock";

// The mobile answer to a modal: slides up from the bottom, has a drag handle, and
// closes on Escape or on a backdrop tap. Focus is trapped while it is open and
// returned to whatever opened it, so keyboard and screen-reader users are not
// stranded behind the sheet.
export default function BottomSheet({
  open,
  title,
  onClose,
  children,
  placement = "bottom",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "top" pins the panel near the top of the viewport instead of the bottom
   *  edge. A long list opened from a row halfway down the page ran off the
   *  bottom of the screen and the coach could not see what they were choosing. */
  placement?: "bottom" | "top";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  // Callers commonly pass an inline close handler. Its identity changes on
  // every controlled-input keystroke, but that is not a reason to tear down
  // and recreate the focus trap: doing so focuses the panel again and makes a
  // mobile keyboard/viewport visibly jump once per letter.
  const closeLatest = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const releaseBodyScrollLock = acquireBodyScrollLock();
    panel.current?.focus();

    // iOS keeps fixed elements anchored to the layout viewport when its
    // keyboard opens. Without compensating for the covered part of the screen,
    // the food picker remains behind the keyboard and only its handle is
    // visible. Keep the sheet against the bottom of the *visible* viewport so
    // typing and choosing a result remain possible in one flow.
    const visualViewport = window.visualViewport;
    const fitToVisibleViewport = () => {
      if (!panel.current) return;
      if (placement === "top") return;
      if (!visualViewport) {
        panel.current.style.removeProperty("inset-block-end");
        panel.current.style.removeProperty("max-height");
        return;
      }
      const coveredHeight = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop,
      );
      panel.current.style.insetBlockEnd = `${coveredHeight}px`;
      panel.current.style.maxHeight = `${Math.floor(visualViewport.height * 0.85)}px`;
    };
    fitToVisibleViewport();
    visualViewport?.addEventListener("resize", fitToVisibleViewport);
    visualViewport?.addEventListener("scroll", fitToVisibleViewport);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLatest();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      visualViewport?.removeEventListener("resize", fitToVisibleViewport);
      visualViewport?.removeEventListener("scroll", fitToVisibleViewport);
      releaseBodyScrollLock();
      opener.current?.focus();
    };
  }, [open, placement]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={placement === "top" ? "sheet sheet--top" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <span className="sheet__handle" aria-hidden="true" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </>,
    document.body,
  );
}
