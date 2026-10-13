import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The public sales site and the authenticated app are separate Vercel
// projects. The app has NEXT_PUBLIC_SUPABASE_URL, while the sales project does
// not need the rest of the Supabase environment. This public, non-secret origin
// keeps the shared guide media available on both domains.
const PUBLIC_STORAGE_ORIGIN = "https://bacxfweisncnpjgiqxcp.supabase.co";

const LESSON_FILES: Readonly<Record<string, string>> = {
  "01-login-home-navigation": "life-fit-training-series-v1/01-login-home-navigation.mp4",
  "02-personal-menu-meals": "life-fit-training-series-v1/02-personal-menu-meals.mp4",
  "03-nutrition-day-status": "life-fit-day-strip-guide-v1/life-fit-day-strip-guide.mp4",
  "03-outside-menu-shopping": "life-fit-training-series-v1/03-outside-menu-shopping.mp4",
  "04-workout-program-session": "life-fit-training-series-v1/04-workout-program-session.mp4",
  "05-workout-management-progress": "life-fit-training-series-v1/05-workout-management-progress.mp4",
  "06-measurements-health-checkin": "life-fit-training-series-v1/06-measurements-health-checkin.mp4",
  "07-messages-content-profile-support": "life-fit-training-series-v1/07-messages-content-profile-support.mp4",
  "08-connect-device-iphone": "life-fit-device-connection-v1/life-fit-device-connection-ios-4k.mp4",
  "09-connect-device-android": "life-fit-device-connection-v1/life-fit-device-connection-android-4k.mp4",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lesson: string }> },
) {
  const { lesson } = await params;
  const filename = LESSON_FILES[lesson];
  if (!filename) return new NextResponse("Media not found", { status: 404 });

  const origin =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ??
    PUBLIC_STORAGE_ORIGIN;

  return NextResponse.redirect(
    `${origin}/storage/v1/object/public/content-media/${filename}`,
    {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
