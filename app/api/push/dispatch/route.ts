import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Drains the push outbox. Everything around the send is finished: claiming rows
// so two overlapping runs cannot send twice, capping attempts, recording the
// outcome, and disabling a token the provider says is dead.
//
// BLOCKED-EXTERNAL: the send itself needs an APNs key (Apple Developer) or an
// FCM service account. Without them this marks each claimed row 'skipped' with
// the reason, which is honest and leaves the row visible - it does not pretend
// a notification went out.
type Claimed = { delivery_id: string; token: string; platform: string; provider: string; title: string; body: string; href: string; category: string };

const credentialsFor = (provider: string) =>
  provider === "apns"
    ? Boolean(process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_PRIVATE_KEY && process.env.APNS_BUNDLE_ID)
    : provider === "fcm"
      ? Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON)
      : false;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ ok: false, message: "Supabase is not configured." }, { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("claim_push_deliveries", { p_limit: 50 });
  if (error) {
    console.error("push dispatch claim failed", { code: error.code, message: error.message });
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const claimed = (data ?? []) as Claimed[];
  // Stays zero until a provider transport exists. It is reported anyway so the
  // cron log distinguishes "nothing to send" from "sending is not wired up".
  const sent = 0;
  let skipped = 0;
  for (const delivery of claimed) {
    if (!credentialsFor(delivery.provider)) {
      await supabase.rpc("mark_push_delivery", {
        p_delivery_id: delivery.delivery_id,
        p_status: "skipped",
        p_detail: `${delivery.provider} credentials are not configured`,
      });
      skipped += 1;
      continue;
    }
    // The provider call goes here once a credential exists. It is deliberately
    // absent rather than stubbed: a fake success would mark rows sent and lose
    // the notification for good.
    await supabase.rpc("mark_push_delivery", {
      p_delivery_id: delivery.delivery_id,
      p_status: "skipped",
      p_detail: `${delivery.provider} transport is not implemented`,
    });
    skipped += 1;
  }

  console.info("push dispatch ran", { claimed: claimed.length, sent, skipped });
  return NextResponse.json({ ok: true, claimed: claimed.length, sent, skipped });
}
