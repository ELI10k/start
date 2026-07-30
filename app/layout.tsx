import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { WorkoutProvider } from "@/components/workouts/WorkoutProvider";
import AuthSessionWatcher from "@/components/auth/AuthSessionWatcher";

export const dynamic = "force-dynamic";
const assistant = Assistant({ subsets: ["hebrew", "latin"], display: "swap", variable: "--font-assistant" });

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
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthSessionWatcher />
        <WorkoutProvider>{children}</WorkoutProvider>
      </body>
    </html>
  );
}
