import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchPushDeliveries } from "@/lib/push/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// The sweep plus a round of push sends. Ten seconds is the default budget and
// this run legitimately needs more than that.
export const maxDuration = 60;

// Vercel Cron calls this on a schedule so reminders exist whether or not the
// client ever opens the app. The heavy lifting is public.run_scheduled_reminders,
// which is idempotent: every notification carries a dedupe key, so re-running the
// job - or a client visiting the notifications page in between - collapses into
// the same row rather than producing duplicates.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  }
  // Vercel Cron sends the secret as a bearer token. Reject anything else so the
  // route cannot be triggered from the open internet.
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("run_scheduled_reminders");
    if (error) {
      console.error("reminder scheduler failed", { code: error.code, message: error.message });
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    const clients = typeof data === "number" ? data : 0;
    // Nothing had ever deleted a notification, and this job writes up to four a
    // day per client. Pruning here rather than on its own schedule because this
    // one already runs daily and the delete is a single indexed statement.
    //
    // A failure to prune is not a failure to remind: the reminders are the point
    // of the run and tidying is not worth losing them over.
    const { data: pruned, error: pruneError } = await supabase.rpc("prune_notifications");
    if (pruneError) console.error("notification prune failed", { code: pruneError.code, message: pruneError.message });

    // The reminders this run just wrote are sitting in the push outbox. Nothing
    // else will be along for hours - there are two cron slots for the whole
    // product - so they are sent from here, in the same run that created them.
    // The evening pass drains again afterwards; claiming is what makes running
    // it twice cost one query rather than send anything twice.
    const push = await dispatchPushDeliveries().catch((cause) => {
      console.error("push dispatch after reminders failed", { message: cause instanceof Error ? cause.message : "unknown" });
      return null;
    });

    console.info("reminder scheduler ran", { clients, pruned: Number(pruned ?? 0), push, ms: Date.now() - startedAt });
    return NextResponse.json({ ok: true, clients, pruned: Number(pruned ?? 0), push, ms: Date.now() - startedAt });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "unknown error";
    console.error("reminder scheduler threw", { message });
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
