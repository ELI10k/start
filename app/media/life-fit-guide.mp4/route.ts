import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!origin) {
    return new NextResponse("Media unavailable", { status: 503 });
  }

  return NextResponse.redirect(
    `${origin}/storage/v1/object/public/content-media/life-fit-guide-v2.mp4`,
    {
      status: 307,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
