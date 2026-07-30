import type { Metadata } from "next";
import "./globals.css";
import { WorkoutProvider } from "@/components/workouts/WorkoutProvider";
import AuthSessionWatcher from "@/components/auth/AuthSessionWatcher";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "START by Eli Cohen",
  description: "מערכת הליווי של START",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthSessionWatcher />
        <WorkoutProvider>{children}</WorkoutProvider>
      </body>
    </html>
  );
}
