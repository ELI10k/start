"use client";
import { useEffect, useRef, type ReactNode } from "react";

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

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
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
      document.body.style.overflow = previousOverflow;
      opener.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
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
    </>
  );
}
