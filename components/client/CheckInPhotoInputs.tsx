"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";

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

// Three photos straight off a phone are 3-15MB together, and the request body a
// serverless function will accept is 4.5MB - the whole check-in was rejected by
// the platform before any of this code ran, which reached the client as "An
// unexpected response was received from the server" on submit. Downscaling to
// 1600px on the long edge keeps every detail a progress photo is for and brings
// a set of three to well under a megabyte.
const MAX_EDGE = 1600;
const COMPRESS_ABOVE_BYTES = 600 * 1024;

async function shrink(file: File): Promise<File> {
  if (file.size <= COMPRESS_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    // If the re-encode did not actually help, the original is the better file.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Any browser that cannot do this keeps the original: the server still
    // accepts a single photo of this size, and the size check below stands.
    return file;
  }
}

export default function CheckInPhotoInputs({ required = false, first = false }: { required?: boolean; first?: boolean }) {
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const choose = async (key: string, input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) {
      setFiles((current) => ({ ...current, [key]: undefined }));
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("יש לבחור JPG, PNG או WebP.");
      input.value = "";
      return;
    }
    setError("");
    setWorking(true);
    const prepared = await shrink(file);
    setWorking(false);
    if (prepared.size > 5 * 1024 * 1024) {
      setError("התמונה גדולה מדי גם אחרי הקטנה. יש לבחור תמונה אחרת.");
      input.value = "";
      return;
    }
    // The form is submitted by the browser, so the shrunk file has to replace the
    // one the input is holding - state alone would preview one file and send
    // another.
    if (prepared !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(prepared);
      input.files = transfer.files;
    }
    setFiles((current) => ({ ...current, [key]: prepared }));
  };
  return (
    <div>
      {required ? (
        <p className="rounded-2xl border border-[#16A34A]/30 bg-[#ECFDF3] p-3 text-sm font-bold text-[#15803D]">
          {/* The first set is the baseline every later comparison is made against,
              so it says why it is being asked for rather than just that it is. */}
          {first
            ? "זה הצ׳ק־אין הראשון שלך — התמונות האלה הן נקודת ההשוואה לכל הבאות"
            : "הגיע הזמן לעדכן תמונות התקדמות"}
        </p>
      ) : (
        <p className="text-xs text-[#5B5F5B]">
          אופציונלי · JPG, PNG או WebP.
        </p>
      )}
      {working && <p role="status" className="mt-2 text-xs text-[#5B5F5B]">מכינים את התמונה…</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {slots.map((slot) => {
          const file = files[slot.key];
          const clear = () => {
            const input = document.querySelector<HTMLInputElement>(`input[name="photo_${slot.key}"]`);
            if (input) input.value = "";
            setFiles((current) => ({ ...current, [slot.key]: undefined }));
          };
          return (
            <label key={slot.key} className="photo-slot">
              {slot.label}
              <input
                name={`photo_${slot.key}`}
                type="file"
                required={required}
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => { void choose(slot.key, event.target); }}
              />
              {file ? (
                <Preview
                  key={`${file.name}-${file.lastModified}`}
                  file={file}
                  label={slot.label}
                  onRemove={clear}
                />
              ) : (
                <span className="photo-slot__hint">
                  <ImagePlus aria-hidden="true" size={20} />
                  בחירת תמונה
                </span>
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
