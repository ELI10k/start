import type { MetadataRoute } from "next";

// The PWA manifest. START is installed from the browser for now, so this is what
// decides whether it lands on a home screen as an app or as a bookmark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "START by Eli Cohen",
    short_name: "START",
    description: "מערכת הליווי של START — תזונה, אימונים והתקדמות.",
    // standalone is what removes the browser chrome. Without it the bottom
    // navigation sits under Safari's toolbar on an iPhone.
    display: "standalone",
    start_url: "/",
    // Scope keeps the auth callback and every in-app link inside the installed
    // window; a link outside it would open Safari and land the session in the
    // wrong cookie jar.
    scope: "/",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    orientation: "portrait",
    // Hebrew, right to left - the same as the document.
    lang: "he",
    dir: "rtl",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops to the launcher's shape. The maskable variant keeps the
      // wordmark inside the safe area so only background is ever cut away.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "אימון היום", url: "/workouts" },
      { name: "התזונה שלי", url: "/nutrition" },
      { name: "התקדמות", url: "/progress" },
    ],
  };
}
