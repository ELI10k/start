"use client";
import { useEffect } from "react";

// Registers the worker in public/sw.js. It exists so the browser will offer to
// install START, and so a lost signal shows START's own offline page instead of
// the browser's error screen. The only things it stores are that page and the
// icons - see the file for the boundary and why it is drawn there.
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registration failing is not worth surfacing: it costs the install prompt,
    // not the app.
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
