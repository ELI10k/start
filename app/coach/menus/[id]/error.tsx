"use client";
import { AlertTriangle } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";

// The menu tree query can exceed the database statement timeout on a large menu.
// When it does, the coach gets a screen that explains it and a way to retry,
// rather than the generic "something went wrong".
export default function ErrorState({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="client-app-content grid min-h-[60vh] place-items-center">
    <StateBlock
      tone="error"
      icon={<AlertTriangle aria-hidden="true" size={22}/>}
      title="טעינת התפריט לא הושלמה"
      description="השאילתה נמשכה זמן רב מדי. התפריט עצמו לא השתנה — אפשר לנסות שוב."
      action={<button onClick={reset} className="premium-primary-button">ניסיון נוסף</button>}
    />
  </main>;
}
