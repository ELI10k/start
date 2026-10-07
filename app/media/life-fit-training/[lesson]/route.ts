import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LESSON_FILES: Readonly<Record<string, string>> = {
  "01-login-home-navigation": "01-login-home-navigation.mp4",
  "02-personal-menu-meals": "02-personal-menu-meals.mp4",
  "03-outside-menu-shopping": "03-outside-menu-shopping.mp4",
  "04-workout-program-session": "04-workout-program-session.mp4",
  "05-workout-management-progress": "05-workout-management-progress.mp4",
  "06-measurements-health-checkin": "06-measurements-health-checkin.mp4",
  "07-messages-content-profile-support": "07-messages-content-profile-support.mp4",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lesson: string }> },
) {
  const { lesson } = await params;
  const filename = LESSON_FILES[lesson];
  if (!filename) return new NextResponse("Media not found", { status: 404 });

  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!origin) return new NextResponse("Media unavailable", { status: 503 });

  return NextResponse.redirect(
    `${origin}/storage/v1/object/public/content-media/life-fit-training-series-v1/${filename}`,
    {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
