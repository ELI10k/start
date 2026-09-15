"use client";

import { useActionState, useRef, useState } from "react";
import { Copy, Send } from "lucide-react";
import { sendMessage, type MessageState } from "@/app/actions/messages";
import SubmitButton from "@/components/forms/SubmitButton";

const initialState: MessageState = { ok: false };

export default function ClientReportMessage({ clientId, message, title, description }: { clientId: string; message: string; title: string; description: string }) {
  const [state, action] = useActionState(sendMessage, initialState);
  const [copied, setCopied] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const copy = async () => {
    await navigator.clipboard.writeText(textarea.current?.value ?? message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return <section className="rounded-2xl border border-[#16A34A]/30 bg-[#ECFDF3] p-4">
    <h3 className="text-lg font-black">{title}</h3>
    <p className="mt-1 text-xs text-[#5B5F5B]">{description}</p>
    <form action={action} className="mt-3">
      <input type="hidden" name="clientId" value={clientId}/>
      <input type="hidden" name="topic" value="general"/>
      <textarea ref={textarea} name="body" defaultValue={message} required maxLength={4000} rows={14} className="nutrition-input min-h-80 whitespace-pre-wrap leading-7"/>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="chip"><Copy aria-hidden="true" size={16}/>{copied ? "הועתק" : "העתקת ההודעה"}</button>
        <SubmitButton idle="שליחה ללקוח" pending="שולחים…" icon={<Send aria-hidden="true" size={16}/>} className="chip chip--primary"/>
      </div>
      {state.message&&<p role={state.ok?"status":"alert"} className={`mt-3 text-sm font-bold ${state.ok?"text-[#15803D]":"text-[#DC2626]"}`}>{state.message}</p>}
    </form>
  </section>;
}
