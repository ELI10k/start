"use client";

import { useRef } from "react";
import { saveContentProgress } from "@/app/actions/content";

export default function NativeLessonPlayer({
  contentItemId,
  src,
  title,
  posterUrl,
}: {
  contentItemId: string;
  src: string;
  title: string;
  posterUrl: string | null;
}) {
  const completed = useRef(false);

  function markComplete() {
    if (completed.current) return;
    completed.current = true;
    const form = new FormData();
    form.set("contentItemId", contentItemId);
    form.set("progress", "100");
    void saveContentProgress(form);
  }

  return (
    <div className="cinema-stage">
      <video
        controls
        playsInline
        preload="metadata"
        poster={posterUrl ?? undefined}
        aria-label={title}
        onEnded={markComplete}
        onTimeUpdate={(event) => {
          const player = event.currentTarget;
          if (player.duration > 0 && player.currentTime / player.duration >= 0.95) {
            markComplete();
          }
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
