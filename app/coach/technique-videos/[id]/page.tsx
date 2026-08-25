import {notFound,redirect} from "next/navigation";
import Link from "next/link";
import {getAuthContext} from "@/lib/data/product-repository";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export default async function TechniqueVideoPage({params}:{params:Promise<{id:string}>}){
  const auth=await getAuthContext();if(!auth)redirect("/login");if(auth.role!=="coach")redirect("/unauthorized");const{id}=await params;const supabase=await createSupabaseServerClient();
  const{data}=await supabase.from("exercise_technique_videos").select("id,client_id,exercise_name,note,storage_path,created_at").eq("id",id).maybeSingle();if(!data)notFound();
  const[{data:profile},{data:signed}]=await Promise.all([supabase.from("profiles").select("full_name").eq("id",data.client_id).maybeSingle(),supabase.storage.from("technique-videos").createSignedUrl(data.storage_path,900)]);
  return <main className="px-4 py-8"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold text-[#16A34A]">סרטון טכניקה</p><h1 className="mt-2 text-3xl font-black">{profile?.full_name??"לקוח"} · {data.exercise_name}</h1><p className="mt-2 text-sm text-[#5B5F5B]">{new Date(data.created_at).toLocaleString("he-IL",{timeZone:"Asia/Jerusalem"})}</p>{signed?.signedUrl?<video src={signed.signedUrl} controls playsInline className="mt-5 w-full rounded-2xl bg-black"/>:<p className="mt-5">לא ניתן לטעון את הסרטון כרגע.</p>}{data.note&&<p className="mt-4 rounded-2xl bg-[#F7F8F7] p-4">{data.note}</p>}<Link href={`/coach/clients/${data.client_id}`} className="premium-secondary-button mt-5">לכרטיס הלקוח</Link></div></main>;
}
