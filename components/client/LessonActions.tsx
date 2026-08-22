"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { Check, Heart, Play } from "lucide-react";
import {
  recordContentView,
  saveContentProgress,
  setContentFavorite,
} from "@/app/actions/content";

/* Watching a lesson is a yes-or-no question, and it used to be asked with a
   percentage slider: the client had to decide whether they were 65% or 70% done
   and press Save. Two controls replace it - one that says this is watched, one
   that keeps it on a list - and both answer under the thumb, without a round
   trip to look at. The percentage column is still what the app stores; these
   write 100 and 0 into it, so every course's progress count keeps working. */
export default function LessonActions({
  contentItemId,
  watched,
  favorite,
  lastViewedLabel,
}: {
  contentItemId: string;
  watched: boolean;
  favorite: boolean;
  lastViewedLabel?: string;
}) {
  const [, startTransition] = useTransition();
  const [isWatched, setWatched] = useOptimistic(watched);
  const [isFavorite, setFavorite] = useOptimistic(favorite);

  useEffect(() => {
    startTransition(async () => {
      await recordContentView(contentItemId);
    });
  }, [contentItemId]);

  const toggleWatched = () => {
    startTransition(async () => {
      setWatched(!isWatched);
      const form = new FormData();
      form.set("contentItemId", contentItemId);
      form.set("progress", isWatched ? "0" : "100");
      await saveContentProgress(form);
    });
  };

  const toggleFavorite = () => {
    startTransition(async () => {
      setFavorite(!isFavorite);
      const form = new FormData();
      form.set("contentItemId", contentItemId);
      form.set("favorite", isFavorite ? "false" : "true");
      await setContentFavorite(form);
    });
  };

  return (
    <>
      <div className="cinema-actions">
        <button
          type="button"
          onClick={toggleWatched}
          className={`cinema-button ${isWatched ? "cinema-button--ghost" : "cinema-button--play"}`}
        >
          {isWatched ? (
            <Check aria-hidden="true" size={19} />
          ) : (
            <Play aria-hidden="true" size={19} fill="currentColor" />
          )}
          {isWatched ? "נצפה" : "סימון כנצפה"}
        </button>
        <button
          type="button"
          onClick={toggleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? "הסרה מהרשימה שלי" : "הוספה לרשימה שלי"}
          className="cinema-button cinema-button--ghost cinema-button--icon"
        >
          <Heart
            aria-hidden="true"
            size={19}
            fill={isFavorite ? "currentColor" : "none"}
            color={isFavorite ? "var(--cine-green)" : "currentColor"}
          />
        </button>
      </div>
      {lastViewedLabel ? (
        <p className="cinema-viewed">צפייה אחרונה: {lastViewedLabel}</p>
      ) : null}
    </>
  );
}
