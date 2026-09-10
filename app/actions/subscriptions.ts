"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getBillingConfiguration } from "@/lib/billing/config";

export async function startDigitalCheckout() {
  const auth=await getAuthContext();
  if(!auth||auth.role!=="client")throw new Error("not_authorized");
  const billing=getBillingConfiguration();
  const checkoutUrl=billing.checkoutUrl;
  let url:URL;try{url=new URL(checkoutUrl);}catch{redirect("/profile?checkout=unavailable");}
  if(url.protocol!=="https:")redirect("/profile?checkout=unavailable");
  if(billing.mode==="manual")redirect(url.toString());
  const admin=createSupabaseAdminClient();
  // Only the newest checkout reference may be exchanged for access. This also
  // makes reopening the purchase flow safe after abandoning an older tab.
  await admin.from("checkout_sessions").update({status:"expired"}).eq("user_id",auth.id).eq("status","pending");
  const{data,error}=await admin.from("checkout_sessions").insert({user_id:auth.id,desired_plan:"digital"}).select("id").single();
  if(error||!data)redirect("/profile?checkout=unavailable");
  url.searchParams.set("client_reference_id",String(data.id));
  redirect(url.toString());
}
