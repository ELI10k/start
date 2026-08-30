import { NextResponse } from "next/server";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";

export async function GET() {
  const count = await getUnreadNotificationCount().catch(() => 0);
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
