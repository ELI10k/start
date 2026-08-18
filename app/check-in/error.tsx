"use client";
import { AlertTriangle } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";

// "ניסיון נוסף" used to call reset(), which re-renders the boundary from the
// router's cached payload for this route. When that cached payload is what
// failed - a page fetched across a deploy, an interrupted stream in an in-app
// browser - retrying replays the same failure forever, which is what a client
// reported: the button did nothing, over and over. A full document request is
// the only retry that actually goes back to the server.
//
// The details are folded away rather than hidden: a client is not made to read
// them, and a screenshot of the open panel says what actually happened.
export default function ErrorState({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const retry=()=>{
    reset();
    if(typeof window!=="undefined")window.location.replace(`/check-in?retry=${Date.now()}`);
  };
  return <main className="client-app-content grid min-h-[60vh] place-items-center">
    <div className="w-full max-w-md">
      <StateBlock
        tone="error"
        icon={<AlertTriangle aria-hidden="true" size={22}/>}
        title="לא ניתן לטעון את הצ׳ק־אין"
        description="שום דבר לא נשלח. אפשר לנסות לטעון שוב."
        action={<button onClick={retry} className="premium-primary-button">ניסיון נוסף</button>}
      />
      <details className="mt-4 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-3 text-xs text-[#5B5F5B]">
        <summary className="cursor-pointer font-bold">פרטים טכניים לשליחה למאמן</summary>
        <p className="mt-2 break-all">{error.message||"אין הודעת שגיאה"}</p>
        {error.digest&&<p className="mt-1 break-all">digest: {error.digest}</p>}
      </details>
    </div>
  </main>;
}
