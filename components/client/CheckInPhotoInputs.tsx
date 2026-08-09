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
    <>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`תצוגה מקדימה ${label}`} src={url} />
      )}
      <button type="button" className="pill pill--red" onClick={onRemove}>
        הסרת תמונה
      </button>
    </>
  );
}

export default function CheckInPhotoInputs({ required = false }: { required?: boolean }) {
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
    <div>
      {required ? (
        <p className="rounded-2xl border border-[#16A34A]/30 bg-[#ECFDF3] p-3 text-sm font-bold text-[#15803D]">
          הגיע הזמן לעדכן תמונות התקדמות
        </p>
      ) : (
        <p className="text-xs text-[#5B5F5B]">
          אופציונלי · JPG, PNG או WebP עד 5MB.
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {slots.map((slot) => {
          const file = files[slot.key];
          return (
            <label key={slot.key} className="photo-slot">
              {slot.label}
              <input
                name={`photo_${slot.key}`}
                type="file"
                required={required}
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
        <p role="alert" className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm text-[#DC2626]">
          {error}
        </p>
      )}
    </div>
  );
}
