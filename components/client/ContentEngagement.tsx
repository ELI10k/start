"use client";

import { useEffect, useState, useTransition } from "react";
import {
  recordContentView,
  saveContentProgress,
  setContentFavorite,
} from "@/app/actions/content";
import SubmitButton from "@/components/forms/SubmitButton";

export default function ContentEngagement({
  contentItemId,
  initialProgress,
  favorite,
  lastViewedLabel,
}: {
  contentItemId: string;
  initialProgress: number;
  favorite: boolean;
  lastViewedLabel?: string;
}) {
  const [progress, setProgress] = useState(initialProgress);
  const [, startTransition] = useTransition();
  useEffect(() => {
    startTransition(async () => {
      await recordContentView(contentItemId);
    });
  }, [contentItemId]);
  return (
    <section className="mt-5 rounded-[24px] border border-[#3A321B] bg-[#17150F] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black">המעקב שלי</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {lastViewedLabel
              ? `צפייה אחרונה: ${lastViewedLabel}`
              : "הצפייה הראשונה תישמר כעת"}
          </p>
        </div>
        <form action={setContentFavorite}>
          <input type="hidden" name="contentItemId" value={contentItemId} />
          <input type="hidden" name="favorite" value={favorite ? "false" : "true"} />
          <SubmitButton
            idle={favorite ? "הסרה מהמועדפים" : "הוספה למועדפים"}
            pending="שומרים…"
            className="min-h-11 rounded-xl border border-[#D4AF37]/40 px-4 text-sm font-bold text-[#E7C85D] disabled:opacity-50"
          />
        </form>
      </div>
      <form action={saveContentProgress} className="mt-5">
        <input type="hidden" name="contentItemId" value={contentItemId} />
        <div className="flex items-center gap-3">
          <input
            aria-label="אחוז התקדמות"
            name="progress"
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
            className="w-full accent-[#D4AF37]"
          />
          <strong className="w-14 text-left">{progress}%</strong>
        </div>
        <SubmitButton
          idle="שמירת התקדמות"
          pending="שומרים…"
          className="mt-4 min-h-11 rounded-xl bg-[#D4AF37] px-4 text-sm font-black text-black disabled:opacity-50"
        />
      </form>
    </section>
  );
}
