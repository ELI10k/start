"use client";

import { useEffect, useState } from "react";

const slots = [
  { key: "front", label: "קדימה" },
  { key: "side", label: "צד" },
  { key: "back", label: "גב" },
] as const;

function Preview({
  file,
  label,
  onRemove,
}: {
  file: File;
  label: string;
  onRemove: () => void;
}) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);
  return (
    <div className="mt-3">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`תצוגה מקדימה ${label}`}
          src={url}
          className="h-28 w-full rounded-lg object-cover"
        />
      )}
      <button
        type="button"
        className="mt-2 text-xs text-red-300 underline"
        onClick={onRemove}
      >
        הסרת תמונה
      </button>
    </div>
  );
}

export default function CheckInPhotoInputs() {
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [error, setError] = useState("");
  const choose = (key: string, file?: File) => {
    if (!file) {
      setFiles((current) => ({ ...current, [key]: undefined }));
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("יש לבחור JPG, PNG או WebP עד 5MB.");
      return;
    }
    setError("");
    setFiles((current) => ({ ...current, [key]: file }));
  };
  return (
    <section className="rounded-[22px] border border-[#292929] bg-[#151515] p-5">
      <h2 className="font-black">תמונות התקדמות</h2>
      <p className="mt-1 text-xs text-zinc-500">
        אופציונלי · JPG, PNG או WebP עד 5MB.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {slots.map((slot) => {
          const file = files[slot.key];
          return (
            <label
              key={slot.key}
              className="rounded-xl border border-[#333] p-3 text-sm font-bold"
            >
              {slot.label}
              <input
                className="mt-2 block w-full text-xs"
                name={`photo_${slot.key}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => choose(slot.key, event.target.files?.[0])}
              />
              {file && (
                <Preview
                  key={`${file.name}-${file.lastModified}`}
                  file={file}
                  label={slot.label}
                  onRemove={() => choose(slot.key)}
                />
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
