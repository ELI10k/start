"use client";
import { AlertTriangle } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";

// A retry has to go back to the server. reset() re-renders from the router's
// cached payload for this route, so when that payload is what failed the button
// replays the same failure forever.
export default function ErrorState({reset}:{error:Error&{digest?:string};reset:()=>void}){
  const retry=()=>{reset();if(typeof window!=="undefined")window.location.replace(`/notifications?retry=${Date.now()}`)};
  return <main className="client-app-content grid min-h-[60vh] place-items-center">
    <StateBlock
      tone="error"
      icon={<AlertTriangle aria-hidden="true" size={22}/>}
      title="לא ניתן לטעון את ההתראות"
      description="אפשר לנסות שוב. אף התראה לא נמחקה."
      action={<button onClick={retry} className="premium-primary-button">ניסיון נוסף</button>}
    />
  </main>;
}
