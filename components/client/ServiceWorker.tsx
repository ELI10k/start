"use client";
import { useEffect } from "react";

// Registers the worker in public/sw.js. It exists so the browser will offer to
// install START LIFE FIT, and so a lost signal shows START LIFE FIT's own offline page instead of
// the browser's error screen. The only things it stores are that page and the
// icons - see the file for the boundary and why it is drawn there.
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Let the first screen become interactive before starting worker discovery
    // and installation. Registration failing is not worth surfacing: it costs
    // the install prompt, not the app.
    const register = () => void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (document.readyState === "complete") {
      const timeout = window.setTimeout(register, 1);
      return () => window.clearTimeout(timeout);
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
