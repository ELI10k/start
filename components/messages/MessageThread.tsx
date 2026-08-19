"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageSquare, Send } from "lucide-react";
import { sendMessage, type MessageState } from "@/app/actions/messages";
import { StateBlock } from "@/components/client/AppPatterns";
import SubmitButton from "@/components/forms/SubmitButton";
import { TOPIC_LABELS, type DirectMessage } from "@/lib/messages/types";

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

  // A sent message should leave the box empty and be on screen. React resets the
  // form itself after a successful action; the scroll is ours to do.
  useEffect(() => {
    if (state.ok) form.current?.reset();
    end.current?.scrollIntoView({ block: "nearest" });
  }, [state.ok, messages.length]);

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
          required
          maxLength={4000}
          rows={2}
          className="nutrition-input"
          placeholder={placeholder}
        />
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
