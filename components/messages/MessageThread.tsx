"use client";
/* eslint-disable @next/next/no-img-element -- private signed Supabase URLs are short-lived and intentionally unoptimized. */

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, MessageSquare, Send, X } from "lucide-react";
import { sendMessage, type MessageState } from "@/app/actions/messages";
import { StateBlock } from "@/components/client/AppPatterns";
import SubmitButton from "@/components/forms/SubmitButton";
import { TOPIC_LABELS, type DirectMessage } from "@/lib/messages/types";
import { useLiveRows } from "@/lib/supabase/use-live-rows";
import { replaceInputFile, shrinkImage } from "@/lib/images/shrink";

const initial: MessageState = { ok: false };

const time = (value: string) =>
  new Date(value).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * One conversation, used by both sides.
 *
 * The coach passes a clientId; the client passes none and the server resolves
 * their coach. Neither side can address anyone else, because the id is never
 * what decides the counterparty - see send_coach_client_message.
 */
export default function MessageThread({
  messages,
  clientId,
  topic = "general",
  placeholder = "כתבו הודעה…",
  emptyTitle = "אין עדיין הודעות",
  emptyDescription = "כל מה שתכתבו כאן יגיע ישירות, עם התראה בצד השני.",
}: {
  messages: readonly DirectMessage[];
  clientId?: string;
  topic?: DirectMessage["topic"];
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [state, action] = useActionState(sendMessage, initial);
  const form = useRef<HTMLFormElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [preview,setPreview]=useState("");

  // The other side's message arrives on its own. Without this the thread is
  // correct when it loads and wrong from the first reply onwards - which is how
  // a conversation reads as a form you submit and then reload to see.
  //
  // The filter is the conversation, and the coach's client id is the same value
  // the server used to build this list. A client passes none: their own row-level
  // security already limits the stream to their own thread.
  useLiveRows("coach_client_messages", {
    event: "*",
    filter: clientId ? `client_id=eq.${clientId}` : undefined,
  });

  // A sent message should leave the box empty and be on screen. React resets the
  // form itself after a successful action; the scroll is ours to do.
  useEffect(() => {
    if (state.ok) {
      form.current?.reset();
      if(preview)URL.revokeObjectURL(preview);
      window.setTimeout(()=>setPreview(""),0);
    }
    end.current?.scrollIntoView({ block: "nearest" });
  }, [state.ok, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="message-thread">
      {messages.length ? (
        <ol className="message-thread__list">
          {messages.map((message) => (
            <li key={message.id} data-mine={message.fromMe || undefined}>
              <div className="message-bubble">
                {message.topic !== "general" && (
                  <span className="message-bubble__topic">{TOPIC_LABELS[message.topic]}</span>
                )}
                <p>{message.body}</p>
                {message.imageUrl&&<a href={message.imageUrl} target="_blank" rel="noreferrer"><img src={message.imageUrl} alt="תמונה שצורפה להודעה" className="mt-2 max-h-80 w-full rounded-xl object-contain"/></a>}
                <span className="message-bubble__time">
                  {time(message.createdAt)}
                  {message.fromMe && message.readAt ? " · נקראה" : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <StateBlock
          icon={<MessageSquare aria-hidden="true" size={22} />}
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
      <div ref={end} />

      <form ref={form} action={action} className="message-composer">
        {clientId && <input type="hidden" name="clientId" value={clientId} />}
        <input type="hidden" name="topic" value={topic} />
        <label className="sr-only" htmlFor="message-body">תוכן ההודעה</label>
        <textarea
          id="message-body"
          name="body"
          maxLength={4000}
          rows={2}
          className="nutrition-input"
          placeholder={placeholder}
        />
        {preview&&<div className="relative w-fit"><img src={preview} alt="תצוגה מקדימה של התמונה" className="max-h-32 rounded-xl"/><button type="button" aria-label="הסרת התמונה" onClick={()=>{if(preview)URL.revokeObjectURL(preview);setPreview("");const input=form.current?.elements.namedItem("image") as HTMLInputElement|null;if(input)input.value="";}} className="absolute -left-2 -top-2 rounded-full bg-black p-1 text-white"><X size={14}/></button></div>}
        <label className="chip w-fit cursor-pointer"><Camera aria-hidden="true" size={17}/>צירוף תמונה<input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async(event)=>{const input=event.currentTarget;const file=input.files?.[0];if(!file)return;const prepared=await shrinkImage(file);replaceInputFile(input,prepared);if(preview)URL.revokeObjectURL(preview);setPreview(URL.createObjectURL(prepared));}}/></label>
        <SubmitButton idle="שליחה" pending="שולחים…" icon={<Send aria-hidden="true" size={17} />} />
      </form>

      {!state.ok && state.message && (
        <p role="alert" className="mt-2 rounded-2xl bg-[#FEF2F2] p-3 text-sm font-bold text-[#DC2626]">
          {state.message}
        </p>
      )}
    </div>
  );
}
