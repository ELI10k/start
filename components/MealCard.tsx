"use client";

import { useRef, useState } from "react";
import {
  Camera,
  Check,
  FileText,
  Mic,
  RefreshCw,
  Square,
  X,
} from "lucide-react";

export type MealStatus = "pending" | "eaten" | "skipped";

export type MealData = {
  id: number;
  title: string;
  time: string;
  description: string;
  calories: number;
  protein: number;
  status: MealStatus;
};

type MealCardProps = {
  meal: MealData;
  onStatusChange: (id: number, status: MealStatus) => void;
};

const replacementOptions = [
  "כריך חביתה וגבינה",
  "יוגורט חלבון עם פרי",
  "קוטג׳ עם לחם מלא",
  "שייק חלבון ובננה",
];

export default function MealCard({
  meal,
  onStatusChange,
}: MealCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [note, setNote] = useState("");
  const [selectedReplacement, setSelectedReplacement] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("לא ניתן להפעיל את המיקרופון.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#2B2B2B] bg-[#161616] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs text-[#D4AF37]">
              {meal.time}
            </p>

            <h2 className="text-xl font-bold text-white">
              {meal.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {selectedReplacement || meal.description}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-[#3A2E12] bg-[#0F0F0F] px-3 py-2 text-left">
            <p className="text-sm font-bold text-white">
              {meal.calories} קל׳
            </p>

            <p className="mt-1 text-xs text-[#D4AF37]">
              {meal.protein} גרם חלבון
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onStatusChange(meal.id, "eaten")}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-bold transition ${
              meal.status === "eaten"
                ? "border-[#D4AF37] bg-[#D4AF37] text-black"
                : "border-[#333333] bg-[#202020] text-white hover:border-[#D4AF37]"
            }`}
          >
            <Check size={18} />
            נאכל
          </button>

          <button
            type="button"
            onClick={() => onStatusChange(meal.id, "skipped")}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-bold transition ${
              meal.status === "skipped"
                ? "border-red-500 bg-red-500/15 text-red-400"
                : "border-[#333333] bg-[#202020] text-white hover:border-red-500"
            }`}
          >
            <X size={18} />
            דילגתי
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActionButton
            icon={<Camera size={18} />}
            label="תמונה"
            onClick={() => fileInputRef.current?.click()}
          />

          <ActionButton
            icon={<FileText size={18} />}
            label="כתיבה"
            onClick={() => setNoteOpen((current) => !current)}
          />

          <ActionButton
            icon={
              isRecording ? <Square size={18} /> : <Mic size={18} />
            }
            label={isRecording ? "עצור הקלטה" : "הקלטה"}
            onClick={isRecording ? stopRecording : startRecording}
          />

          <ActionButton
            icon={<RefreshCw size={18} />}
            label="החלפת ארוחה"
            onClick={() =>
              setReplacementOpen((current) => !current)
            }
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {imagePreview && (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#333333]">
            <img
              src={imagePreview}
              alt="תמונת הארוחה"
              className="h-52 w-full object-cover"
            />

            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute left-3 top-3 rounded-full bg-black/75 p-2 text-white"
              aria-label="הסר תמונה"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {noteOpen && (
          <div className="mt-4">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="לדוגמה: אכלתי רק חצי מהאורז..."
              className="min-h-28 w-full resize-none rounded-2xl border border-[#333333] bg-[#0F0F0F] p-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#D4AF37]"
            />

            <p className="mt-2 text-xs text-zinc-500">
              ההערה תישלח למאמן יחד עם דיווח הארוחה.
            </p>
          </div>
        )}

        {audioUrl && (
          <div className="mt-4 rounded-2xl border border-[#333333] bg-[#0F0F0F] p-3">
            <p className="mb-2 text-xs text-[#D4AF37]">
              ההקלטה שלך
            </p>

            <audio
              src={audioUrl}
              controls
              className="w-full"
            />
          </div>
        )}

        {replacementOpen && (
          <div className="mt-4 rounded-2xl border border-[#333333] bg-[#0F0F0F] p-4">
            <p className="mb-3 font-bold text-white">
              בחר ארוחה חלופית
            </p>

            <div className="space-y-2">
              {replacementOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setSelectedReplacement(option);
                    setReplacementOpen(false);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-right text-sm transition ${
                    selectedReplacement === option
                      ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#F3D27A]"
                      : "border-[#2B2B2B] bg-[#181818] text-zinc-300 hover:border-[#D4AF37]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function ActionButton({
  icon,
  label,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-2xl border border-[#333333] bg-[#101010] px-3 py-3 text-sm font-semibold text-zinc-300 transition hover:border-[#D4AF37] hover:text-[#F3D27A]"
    >
      {icon}
      {label}
    </button>
  );
}