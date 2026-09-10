import { createHash, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TERMINAL = "149578";
const plans = {
  "מנוי START Digital": { plan: "digital", agorot: 9700 },
  "מנוי START Coach": { plan: "coach", agorot: 19700 },
  "START VIP": { plan: "vip", agorot: 29700 },
} as const;

const same = (left: string, right: string) => {
  const a=Buffer.from(left),b=Buffer.from(right);
  return a.length===b.length&&timingSafeEqual(a,b);
};

async function values(request: Request) {
  const url=new URL(request.url);
  const result=new URLSearchParams(url.searchParams);
  if(request.method==="POST") {
    const body=await request.text();
    if(Buffer.byteLength(body)>64*1024) throw new Error("body_too_large");
    for(const [key,value] of new URLSearchParams(body)) result.set(key,value);
  }
  return result;
}

const pick=(input:URLSearchParams,...names:string[])=>{
  for(const name of names) for(const [key,value] of input) if(key.toLowerCase()===name.toLowerCase()) return value.trim();
  return "";
};

async function receive(request:Request) {
  const configured=process.env.CARDCOM_WEBHOOK_TOKEN?.trim()??"";
  const supplied=new URL(request.url).searchParams.get("token")??"";
  if(configured.length<32||!same(configured,supplied)) return new Response("unauthorized",{status:401});
  let input:URLSearchParams;try{input=await values(request);}catch{return new Response("invalid",{status:400});}
  if(pick(input,"terminalnumber")!==TERMINAL) return new Response("invalid terminal",{status:400});
  if(pick(input,"responsecode")!=="0") return new Response("OK",{status:200});
  const eventId=pick(input,"internaldealnumber");
  const email=pick(input,"UserEmail","CardOwnerEmail").toLowerCase();
  const product=pick(input,"ProdName","ProductID","Custom24") as keyof typeof plans;
  const mapping=plans[product];
  const agorot=Number(pick(input,"suminagorot")||Math.round(Number(pick(input,"suminfull"))*100));
  const zeroTestEmail=process.env.CARDCOM_ZERO_AMOUNT_TEST_EMAIL?.trim().toLowerCase()??"";
  const validAmount=Boolean(mapping)&&(agorot===mapping.agorot||(agorot===0&&email===zeroTestEmail&&zeroTestEmail.length>3));
  if(!eventId||!email||!mapping||!validAmount) return new Response("invalid payment",{status:400});
  const recurring=pick(input,"RecurringOrderID");
  const providerId=`cardcom-${recurring?`recurring-${recurring}`:`deal-${eventId}`}`;
  const payloadHash=createHash("sha256").update([...input].sort().map(([k,v])=>`${k}=${v}`).join("&")).digest("hex");
  const {error}=await createSupabaseAdminClient().rpc("apply_cardcom_landing_event",{
    p_event_id:eventId,p_email:email,p_plan:mapping.plan,p_provider_subscription_id:providerId,p_payload_hash:payloadHash,
  });
  if(error){console.error("Cardcom webhook failed",{code:error.code});return new Response("retry",{status:503});}
  return new Response("OK",{status:200});
}

export const POST=receive;
export const GET=receive;
