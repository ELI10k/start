"use client";
import {useState} from "react";
import {Camera} from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import {createSupabaseBrowserClient} from "@/lib/supabase/browser";

const MAX_BYTES=100*1024*1024;
const allowed=new Set(["video/mp4","video/quicktime","video/webm"]);

export default function TechniqueVideoButton({exerciseId,exerciseName}:{exerciseId:string;exerciseName:string}){
  const[open,setOpen]=useState(false);const[file,setFile]=useState<File|null>(null);const[note,setNote]=useState("");const[status,setStatus]=useState("");const[sending,setSending]=useState(false);
  const send=async()=>{if(!file||sending)return;if(!allowed.has(file.type)){setStatus("אפשר לשלוח סרטון MP4, MOV או WebM.");return}if(file.size>MAX_BYTES){setStatus("הסרטון גדול מ־100MB. יש לקצר אותו ולנסות שוב.");return}setSending(true);setStatus("");
    const supabase=createSupabaseBrowserClient();const{data:{user}}=await supabase.auth.getUser();if(!user){setStatus("החיבור פג. יש להתחבר מחדש.");setSending(false);return}
    const extension=file.name.split(".").pop()?.toLowerCase()||"mp4";const path=`${user.id}/${crypto.randomUUID()}.${extension}`;
    const{error:uploadError}=await supabase.storage.from("technique-videos").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){setStatus("העלאת הסרטון נכשלה. אפשר לנסות שוב.");setSending(false);return}
    const{error}=await supabase.from("exercise_technique_videos").insert({client_id:user.id,exercise_id:exerciseId,exercise_name:exerciseName,storage_path:path,note:note.trim()||null});
    if(error){await supabase.storage.from("technique-videos").remove([path]);setStatus("שליחת הסרטון נכשלה. אפשר לנסות שוב.");setSending(false);return}
    setStatus("הסרטון נשלח למאמן.");setFile(null);setNote("");setSending(false);
  };
  return <><button type="button" onClick={()=>setOpen(true)} className="chip"><Camera aria-hidden="true" size={15}/>שליחת סרטון טכניקה</button>
    <BottomSheet open={open} title={`סרטון טכניקה · ${exerciseName}`} onClose={()=>setOpen(false)}>
      <p className="text-sm text-[#5B5F5B]">צלמו או בחרו סרטון קצר שבו רואים את ביצוע התרגיל. הסרטון יישלח למאמן בלבד.</p>
      <label className="mt-4 block text-sm font-bold">בחירת סרטון<input type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" className="nutrition-input mt-2" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
      {file&&<p className="mt-2 text-xs text-[#5B5F5B]">{file.name} · {(file.size/1024/1024).toFixed(1)}MB</p>}
      <label className="mt-3 block text-sm font-bold">הערה למאמן (רשות)<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} className="nutrition-input mt-2 min-h-20" placeholder="למשל: מרגיש לחץ בכתף בסוף התנועה"/></label>
      {status&&<p role="status" className="mt-3 text-sm font-bold text-[#16A34A]">{status}</p>}
      <div className="sheet__actions"><button type="button" onClick={send} disabled={!file||sending} className="premium-primary-button">{sending?"מעלים ושולחים…":"שליחה למאמן"}</button><button type="button" onClick={()=>setOpen(false)} disabled={sending} className="premium-secondary-button">סגירה</button></div>
    </BottomSheet></>;
}
