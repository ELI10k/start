"use client";

import { useEffect } from "react";

/* Draws nothing. The library's header floats over the cover art, which is only
   legible while the art is still behind it; once the page has scrolled past the
   hero the header needs a background of its own. This marks the shell so the
   stylesheet can make that switch, and it is the only piece of the library that
   has to run in the browser. */
export default function CinemaChrome() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".cinema");
    if (!shell) return;
    let frame = 0;
    const sync = () => {
      frame = 0;
      shell.dataset.scrolled = window.scrollY > 40 ? "true" : "false";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      delete shell.dataset.scrolled;
    };
  }, []);
  return null;
}
