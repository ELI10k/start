"use client";
import { useEffect } from "react";

// Registers the network-only worker in public/sw.js, which exists so the browser
// will offer to install START. It caches nothing - see the file for why that is
// deliberate rather than unfinished.
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Registration failing is not worth surfacing: it costs the install prompt,
    // not the app.
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
