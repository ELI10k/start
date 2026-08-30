import { NextResponse } from "next/server";
import { GET as runReminders } from "../reminders/route";
import { GET as runDailyCoach } from "../daily-coach/route";
import { GET as runWeeklySummary } from "../weekly-summary/route";
import { dispatchPushDeliveries } from "@/lib/push/dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Everything the evening owes, in one cron slot.
 *
 * Vercel's Hobby plan registers **two** cron jobs, and when vercel.json declares
 * more it takes two of them and says nothing about the rest. The Cron Jobs panel
 * on 2026-08-21 listed exactly two - and neither was the 05:00 reminders run nor
 * the Saturday weekly summary. Both had been declared for weeks and neither had
 * ever been registered, which is why the scheduler appeared to do nothing: it
 * was never called.
 *
 * So the schedule is built for two slots rather than four. The morning slot
 * keeps `/api/cron/reminders`; this is the evening one, and it does in sequence
 * what three separate entries used to claim:
 *
 *   1. the reminders pass again, because the evening workout reminder only fires
 *      when the Israel clock is at or past the client's evening time;
 *   2. the daily coach message;
 *   3. the weekly summary, which gates itself on being Saturday evening and
 *      costs one cheap check on the other six days.
 *
 * Sequential, not parallel: these share a database and a serverless function,
 * and three concurrent sweeps of the whole roster is how one of them times out.
 *
 * One failing step does not cancel the others - a client who misses a summary
 * should still get their reminder - so each is reported on its own.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, message: "CRON_SECRET is not configured." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });

  const steps: Record<string, unknown> = {};
  let ok = true;
  for (const [name, run] of [
    ["reminders", runReminders],
    ["dailyCoach", runDailyCoach],
    ["weeklySummary", runWeeklySummary],
  ] as const) {
    try {
      // Each handler does its own authorisation, so it is handed the same
      // credential rather than being trusted because this one was called.
      const response = await run(new Request(request.url, { headers: { authorization: `Bearer ${secret}` } }));
      const body = await response.json();
      steps[name] = body;
      if (!response.ok || body?.ok === false) ok = false;
    } catch (cause) {
      ok = false;
      steps[name] = { ok: false, message: cause instanceof Error ? cause.message : "unknown" };
      console.error("evening cron step failed", { step: name, message: cause instanceof Error ? cause.message : "unknown" });
    }
  }

  // Last, because the three steps above are what put rows in the outbox. Each
  // of them is written to drain what it created, so by here there is usually
  // nothing left - this catches whatever a failed drain left behind, and costs
  // one query when there is nothing to do.
  try {
    steps.pushDispatch = await dispatchPushDeliveries();
  } catch (cause) {
    steps.pushDispatch = { ok: false, message: cause instanceof Error ? cause.message : "unknown" };
  }

  console.info("evening cron ran", steps);
  return NextResponse.json({ ok, steps }, { status: ok ? 200 : 500 });
}
