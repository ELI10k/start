import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 64 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const signed = (body: string, signature: string, secret: string) => {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (!/^[0-9a-f]{64}$/i.test(signature) || signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature.toLowerCase(), "hex"), Buffer.from(expected, "hex"));
};

export async function POST(request: Request) {
  const secret = process.env.BILLING_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < 32) return Response.json({ ok: false }, { status: 503 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return Response.json({ ok: false }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_BODY_BYTES || !signed(body, request.headers.get("x-start-signature") ?? "", secret))
    return Response.json({ ok: false }, { status: 401 });
  let event: Record<string, unknown>;
  try { event = JSON.parse(body) as Record<string, unknown>; } catch { return Response.json({ ok: false }, { status: 400 }); }
  const provider=String(event.provider??""),eventId=String(event.eventId??""),eventType=String(event.eventType??""),status=String(event.status??"");
  const checkoutSession=String(event.checkoutSession??""),subscriptionId=String(event.subscriptionId??""),customerId=String(event.customerId??"");
  const periodEnd=event.periodEnd===null||event.periodEnd===undefined?null:String(event.periodEnd);
  if(!["web","apple","google"].includes(provider)||eventId.length<3||eventId.length>200||eventType.length<3||eventType.length>100||!uuid.test(checkoutSession)&&!subscriptionId)
    return Response.json({ok:false},{status:400});
  const admin=createSupabaseAdminClient();
  const {data,error}=await admin.rpc("apply_billing_event",{
    p_provider:provider,p_event_id:eventId,p_event_type:eventType,p_payload_hash:createHash("sha256").update(body).digest("hex"),
    p_checkout_session:uuid.test(checkoutSession)?checkoutSession:null,p_provider_customer_id:customerId,p_provider_subscription_id:subscriptionId,
    p_status:status,p_period_end:periodEnd,
  });
  if(error)return Response.json({ok:false},{status:400});
  return Response.json({ok:true,duplicate:Boolean((data as {duplicate?:boolean}|null)?.duplicate)});
}
