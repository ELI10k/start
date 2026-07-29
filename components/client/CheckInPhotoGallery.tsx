"use client";

import { useState } from "react";

export type CheckInPhoto = Readonly<{
  id: string;
  view: string;
  signedUrl: string;
}>;

const labels: Record<string, string> = {
  front: "חזית",
  side: "צד",
  back: "גב",
};

function Photo({ photo }: { photo: CheckInPhoto }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <figure className="relative overflow-hidden rounded-xl border border-[#333] bg-black/30">
      {state === "loading" && (
        <div role="status" className="grid h-40 place-items-center text-xs text-zinc-500">
          טוענים תמונה…
        </div>
      )}
      {state === "error" ? (
        <div role="alert" className="grid h-40 place-items-center p-4 text-center text-xs text-red-300">
          לא ניתן לטעון את התמונה.
        </div>
      ) : (
        // Signed URLs are short-lived and cannot be known to Next's image optimizer at build time.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.signedUrl}
          alt={`תמונת התקדמות — ${labels[photo.view] ?? photo.view}`}
          className={`${state === "ready" ? "block" : "hidden"} h-40 w-full object-cover`}
          onLoad={() => setState("ready")}
          onError={() => setState("error")}
        />
      )}
      <figcaption className="p-2 text-center text-xs font-bold">
        {labels[photo.view] ?? photo.view}
      </figcaption>
    </figure>
  );
}

export default function CheckInPhotoGallery({
  photos,
  error,
}: {
  photos: readonly CheckInPhoto[];
  error?: boolean;
}) {
  if (error)
    return (
      <p role="alert" className="mt-4 rounded-xl border border-red-900/50 p-4 text-sm text-red-300">
        לא ניתן לטעון את תמונות הצ׳ק־אין כרגע.
      </p>
    );
  if (!photos.length)
    return (
      <p className="mt-4 rounded-xl border border-dashed border-[#333] p-4 text-center text-xs text-zinc-500">
        לא צורפו תמונות לצ׳ק־אין זה.
      </p>
    );
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <Photo key={photo.id} photo={photo} />
      ))}
    </div>
  );
}
