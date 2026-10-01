"use client";

import { useEffect } from "react";

export default function CleanLandingUrl() {
  useEffect(() => {
    if (window.location.pathname === "/join") {
      window.history.replaceState(window.history.state, "", "/");
    }
  }, []);

  return null;
}
