"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/data/product-repository";
import { dispatchPushSoon } from "@/lib/push/dispatch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MessageState = Readonly<{ ok: boolean; message?: string }>;

const TOPICS = new Set(["general", "support", "profile_update"]);

// The database decides who the counterparty is - a client names nobody, a coach
// names only the client - so nothing here has to be trusted with a "from".
const FAILURES: Readonly<Record<string, string>> = {
  empty_message: "אי אפשר לשלוח הודעה ריקה.",
  message_too_long: "ההודעה ארוכה מדי. עד 4000 תווים.",
  no_active_coach: "עדיין לא שויך אליך מאמן, ולכן אין למי לשלוח.",
  not_authorized: "אין הרשאה לשלוח בשיחה הזו.",
  client_required: "יש לבחור לקוח.",
};

function describe(error: { message?: string; code?: string } | null) {
  if (!error) return "ההודעה לא נשלחה. יש לנסות שוב.";
  // The channel is added by a migration that is applied by hand. Until it runs,
  // say so plainly instead of showing a Postgres error to a client.
  if (error.code === "42P01" || error.code === "PGRST202" || error.code === "PGRST205")
    return "ערוץ ההודעות עדיין לא הופעל בחשבון. יש לפנות למאמן.";
  const key = Object.keys(FAILURES).find((name) => error.message?.includes(name));
  return key ? FAILURES[key] : "ההודעה לא נשלחה. יש לנסות שוב.";
}

function paths(clientId: string) {
  revalidatePath("/messages");
  revalidatePath("/notifications");
  revalidatePath("/coach");
  if (clientId) revalidatePath(`/coach/clients/${clientId}`);
}

export async function sendMessage(_state: MessageState, form: FormData): Promise<MessageState> {
  const auth = await getAuthContext();
  if (!auth) return { ok: false, message: "יש להתחבר מחדש." };

  const body = String(form.get("body") ?? "").trim();
  const image=form.get("image");
  const photo=image instanceof File&&image.size>0?image:null;
  if (!body&&!photo) return { ok: false, message: FAILURES.empty_message };
  if (body.length > 4000) return { ok: false, message: FAILURES.message_too_long };
  if(photo&&(!["image/jpeg","image/png","image/webp"].includes(photo.type)||photo.size>5*1024*1024))
    return {ok:false,message:"אפשר לצרף תמונת JPEG, PNG או WebP בגודל של עד 5MB."};

  const topic = String(form.get("topic") ?? "general");
  if (!TOPICS.has(topic)) return { ok: false, message: "נושא לא מוכר." };

  // A coach must name the client; a client never does, and a client-supplied
  // value here is ignored rather than trusted.
  const clientId = auth.role === "coach" ? String(form.get("clientId") ?? "") : auth.id;
  if (auth.role === "coach" && !/^[0-9a-f-]{36}$/i.test(clientId))
    return { ok: false, message: FAILURES.client_required };

  const supabase = await createSupabaseServerClient();
  let imagePath:string|null=null;
  if(photo){
    const extension=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";
    imagePath=`${clientId}/${crypto.randomUUID()}.${extension}`;
    const{error:uploadError}=await supabase.storage.from("message-images").upload(imagePath,photo,{contentType:photo.type,upsert:false});
    if(uploadError)return{ok:false,message:"התמונה לא עלתה. יש לנסות שוב."};
  }
  const payload={p_body:body,p_topic:topic,p_client_id:auth.role==="coach"?clientId:null};
  const { error } = imagePath
    ?await supabase.rpc("send_coach_client_message_with_image",{...payload,p_image_path:imagePath})
    :await supabase.rpc("send_coach_client_message",payload);
  if(error&&imagePath)await supabase.storage.from("message-images").remove([imagePath]);
  if (error) return { ok: false, message: describe(error) };

  // The row is written and the outbox is filled by a trigger; this is what
  // takes it off the outbox and onto the other person's phone. Not awaited: a
  // push that cannot be sent is never the reason a message fails to send.
  dispatchPushSoon();
  paths(clientId);
  return { ok: true, message: "ההודעה נשלחה." };
}
