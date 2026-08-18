"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

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

const label = (view: string) => labels[view] ?? view;

function Photo({ photo, onOpen }: { photo: CheckInPhoto; onOpen: () => void }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  return (
    <figure className="relative overflow-hidden rounded-xl border border-[#E5E7E5] bg-[#F7F8F7]">
      {state === "loading" && (
        <div role="status" className="grid min-h-40 place-items-center text-xs text-[#5B5F5B]">
          טוענים תמונה…
        </div>
      )}
      {state === "error" ? (
        <div role="alert" className="grid min-h-40 place-items-center p-4 text-center text-xs text-[#DC2626]">
          לא ניתן לטעון את התמונה.
        </div>
      ) : (
        // The whole photo, uncropped. It used to be cropped to a uniform 160px
        // band, which took the top and bottom of exactly the body the picture is
        // of - a coach comparing a waistline was shown everything except the
        // waistline. The column decides the width and the photo keeps its own
        // proportions; clicking still opens it over the page, larger again.
        <button
          type="button"
          onClick={onOpen}
          className={`${state === "ready" ? "block" : "hidden"} w-full cursor-zoom-in`}
          aria-label={`הגדלת התמונה — ${label(photo.view)}`}
        >
          {/* Signed URLs are short-lived and cannot be known to Next's image optimizer at build time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.signedUrl}
            alt={`תמונת התקדמות — ${label(photo.view)}`}
            className="block h-auto w-full"
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
          />
        </button>
      )}
      <figcaption className="p-2 text-center text-xs font-bold">{label(photo.view)}</figcaption>
    </figure>
  );
}

// Full size, over the page, with the arrows moving between the three so a coach
// can compare front to side without closing and reopening.
function Lightbox({
  photos,
  index,
  onClose,
  onMove,
}: {
  photos: readonly CheckInPhoto[];
  index: number;
  onClose: () => void;
  onMove: (next: number) => void;
}) {
  const photo = photos[index];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // The gallery is laid out right to left, so the arrows are swapped to match
      // what the eye expects rather than what the key is called.
      if (event.key === "ArrowLeft") onMove((index + 1) % photos.length);
      if (event.key === "ArrowRight") onMove((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, photos.length, onClose, onMove]);

  if (!photo) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`תמונת התקדמות — ${label(photo.view)}`}
      className="fixed inset-0 z-[70] grid grid-rows-[auto_1fr_auto] bg-[#0B0B0B]/95 p-3"
      onClick={onClose}
    >
      <div className="flex items-center justify-between text-[#FFFFFF]">
        <button type="button" onClick={onClose} aria-label="סגירה" className="grid size-11 place-items-center rounded-xl bg-[#FFFFFF]/10">
          <X aria-hidden="true" size={20} />
        </button>
        <span className="text-sm font-black">
          {label(photo.view)} · {index + 1}/{photos.length}
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.signedUrl}
        alt={`תמונת התקדמות — ${label(photo.view)}`}
        className="min-h-0 w-full self-center object-contain"
        style={{ maxHeight: "100%" }}
        onClick={(event) => event.stopPropagation()}
      />
      {photos.length > 1 && (
        <div className="flex justify-center gap-2 pb-[env(safe-area-inset-bottom)]" onClick={(event) => event.stopPropagation()}>
          {photos.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onMove(itemIndex)}
              aria-current={itemIndex === index}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold ${itemIndex === index ? "bg-[#16A34A] text-[#FFFFFF]" : "bg-[#FFFFFF]/10 text-[#FFFFFF]"}`}
            >
              {label(item.view)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CheckInPhotoGallery({
  photos,
  error,
}: {
  photos: readonly CheckInPhoto[];
  error?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (error)
    return (
      <p role="alert" className="mt-4 rounded-xl border border-[#DC2626]/30 p-4 text-sm text-[#DC2626]">
        לא ניתן לטעון את תמונות הצ׳ק־אין כרגע.
      </p>
    );
  if (!photos.length)
    return (
      <p className="mt-4 rounded-xl border border-dashed border-[#E5E7E5] p-4 text-center text-xs text-[#5B5F5B]">
        לא צורפו תמונות לצ׳ק־אין זה.
      </p>
    );
  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <Photo key={photo.id} photo={photo} onOpen={() => setOpen(index)} />
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-[#5B5F5B]">לחיצה על תמונה פותחת אותה על כל המסך</p>
      {open !== null && (
        <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onMove={setOpen} />
      )}
    </>
  );
}
