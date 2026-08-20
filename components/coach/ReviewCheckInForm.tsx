"use client";

import { useActionState, useRef, useState } from "react";
import { BookmarkPlus, Trash2 } from "lucide-react";
import { reviewCheckIn, type SaveState } from "@/app/actions/product";
import {
  deleteResponseTemplate,
  recordTemplateUse,
  saveResponseTemplate,
  type ResponseTemplate,
  type TemplateState,
} from "@/app/actions/response-templates";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };
const templateInitial: TemplateState = { ok: false };

/** The placeholder a saved reply can carry, swapped for the client's first name. */
const NAME_TOKEN = "{{שם}}";

export default function ReviewCheckInForm({
  checkInId,
  clientId,
  clientName = "",
  templates = [],
}: {
  checkInId: string;
  clientId: string;
  clientName?: string;
  templates?: readonly ResponseTemplate[];
}) {
  const [state, action] = useActionState(reviewCheckIn, initial);
  const [templateState, templateAction] = useActionState(saveResponseTemplate, templateInitial);
  const response = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);

  // Inserting appends rather than replaces: a reply is often one saved paragraph
  // plus a sentence about this particular week.
  const insert = (template: ResponseTemplate) => {
    const element = response.current;
    if (!element) return;
    const text = template.body.replaceAll(NAME_TOKEN, clientName.split(" ")[0] ?? "");
    element.value = element.value.trim() ? `${element.value.trim()}\n\n${text}` : text;
    element.focus();
    void recordTemplateUse(template.id);
  };

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-[#16A34A]/20 bg-[#16A34A]/[.04] p-4">
      {/* The coach's own saved replies, most-used first. Writing the same
          paragraph twenty times a week was the largest repeated cost in the
          product; this is the whole point of the panel. */}
      {templates.length > 0 && (
        <div className="chip-row" role="group" aria-label="תשובות שמורות">
          {templates.map((template) => (
            <span key={template.id} className="inline-flex items-center gap-1">
              <button type="button" onClick={() => insert(template)} className="chip">
                {template.title}
              </button>
              <form action={deleteResponseTemplate}>
                <input type="hidden" name="templateId" value={template.id} />
                <button aria-label={`מחיקת התשובה השמורה ${template.title}`} className="chip border-[#DC2626] text-[#DC2626]">
                  <Trash2 aria-hidden="true" size={13} />
                </button>
              </form>
            </span>
          ))}
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="checkInId" value={checkInId} />
        <input type="hidden" name="clientId" value={clientId} />
        <label className="block text-sm font-bold">
          תגובת מאמן
          <textarea
            ref={response}
            name="response"
            required
            maxLength={4000}
            className="nutrition-input mt-2 min-h-24"
            placeholder="כתבו משוב מעשי ללקוח"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton idle="שמירת תגובה" pending="שומרים…" />
          <button type="button" onClick={() => setSaving((open) => !open)} className="chip">
            <BookmarkPlus aria-hidden="true" size={15} />
            שמירה כתשובה חוזרת
          </button>
          {state.message && (
            <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-[#16A34A]" : "text-sm text-[#DC2626]"}>
              {state.message}
            </p>
          )}
        </div>
      </form>

      {/* A separate form, so saving a template never submits the review - and so
          the review textarea is not cleared by an unrelated action. */}
      {saving && (
        <form action={templateAction} className="grid gap-2 rounded-xl border border-[#E5E7E5] bg-[#FFFFFF] p-3">
          <label className="text-sm font-bold">
            שם התשובה
            <input name="title" required maxLength={80} className="nutrition-input mt-1" placeholder="לדוגמה: שבוע טוב, ממשיכים" />
          </label>
          <label className="text-sm font-bold">
            הנוסח
            <textarea name="body" required maxLength={4000} className="nutrition-input mt-1 min-h-20" placeholder={`אפשר לכתוב ${NAME_TOKEN} והשם של הלקוח ייכנס אוטומטית.`} />
          </label>
          <p className="text-xs text-[#5B5F5B]">{NAME_TOKEN} יוחלף בשם הפרטי של הלקוח בכל הכנסה.</p>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton idle="שמירה לרשימה" pending="שומרים…" className="chip" />
            {templateState.message && (
              <p role={templateState.ok ? "status" : "alert"} className={templateState.ok ? "text-sm text-[#16A34A]" : "text-sm text-[#DC2626]"}>
                {templateState.message}
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
