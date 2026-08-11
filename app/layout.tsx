import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { WorkoutProvider } from "@/components/workouts/WorkoutProvider";
import AuthSessionWatcher from "@/components/auth/AuthSessionWatcher";
import ServiceWorker from "@/components/client/ServiceWorker";

export const dynamic = "force-dynamic";
const assistant = Assistant({ subsets: ["hebrew", "latin"], display: "swap", variable: "--font-assistant" });

export const metadata: Metadata = {
  title: "START by Eli Cohen",
  description: "מערכת הליווי של START",
  appleWebApp: { capable: true, title: "START", statusBarStyle: "default" },
};

// The stylesheet already reserves space for the notch and the home indicator
// with env(safe-area-inset-*), but those resolve to zero unless the viewport is
// told to extend under them. Without this line every one of those rules is a
// no-op - on an iPhone in the container and in Safari alike.
//
// User scaling is left alone on purpose: pinch-zoom is how someone reads a set
// count with tired eyes, and disabling it is an accessibility regression.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthSessionWatcher />
        {/* Installability only. The worker is network-only by design. */}
        <ServiceWorker />
        <WorkoutProvider>{children}</WorkoutProvider>
      </body>
    </html>
  );
}
