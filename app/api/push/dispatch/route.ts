import { NextResponse } from "next/server";
import { dispatchPushDeliveries } from "@/lib/push/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Fifty deliveries, each one an HTTPS request to a push service. The default
// budget on this plan is ten seconds and a slow push service alone can spend
// that.
export const maxDuration = 60;

/**
 * Drains the push outbox on demand.
 *
 * The work itself is in lib/push/dispatch, because the outbox is also drained
 * the moment a notification is written - which is what makes a reminder arrive
 * when it is still a reminder. This endpoint stays for a scheduler, and for
 * draining anything a write-time attempt could not finish.
 *
 * Web push sends for real: the keys are this deployment's own and no account
 * with Apple or Google is involved. APNs and FCM remain BLOCKED-EXTERNAL - their
 * rows are marked 'skipped' with the reason rather than pretending to have gone
 * out.
 *
 * Vercel Cron issues a GET; a manual drain is a POST. Both do the same work.
 */
export const GET = (request: Request) => POST(request);

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

  const result = await dispatchPushDeliveries();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
