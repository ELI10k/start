"use client";
import { AlertTriangle } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";

export default function ErrorState({reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="client-app-content grid min-h-[60vh] place-items-center">
    <StateBlock
      tone="error"
      icon={<AlertTriangle aria-hidden="true" size={22}/>}
      title="לא ניתן לטעון את הצ׳ק־אין"
      description="שום דבר לא נשלח. אפשר לנסות לטעון שוב."
      action={<button onClick={reset} className="premium-primary-button">ניסיון נוסף</button>}
    />
  </main>;
}
