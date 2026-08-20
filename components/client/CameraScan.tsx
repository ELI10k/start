"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

// BarcodeDetector is Chromium-only. On iOS Safari - and therefore on every
// iPhone - it does not exist, and the camera button used to be hidden behind it:
// the whole feature on an iPhone was a field to type thirteen digits into. ZXing
// decodes the same formats in JavaScript and is loaded only when the camera is
// actually opened, so nothing is added to the bundle for the browsers that have
// the native detector.
const hasNativeDetector = () => typeof window !== "undefined" && "BarcodeDetector" in window;
const hasCamera = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

/**
 * The camera half of scanning a barcode.
 *
 * Its own component because there are two places a barcode is scanned - adding a
 * product, and saying what was eaten instead - and asking a client to read
 * thirteen digits off a curved bottle and type them in is not a feature.
 */
export default function CameraScan({ onDetected }: { onDetected: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  // The callback is written inline at both call sites, so it is a new function
  // on every parent render. With it in the dependency array the whole camera
  // tore down and restarted each time - which is why it could sit open and
  // never resolve anything. The effect depends on `live` and nothing else.
  const handler = useRef(onDetected);
  // Assigned in an effect, never during render.
  useEffect(() => { handler.current = onDetected; }, [onDetected]);

  useEffect(() => {
    if (!live) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    let timer = 0;
    let controls: { stop: () => void } | null = null;

    const run = async () => {
      if (!hasCamera()) {
        // The usual cause on a phone is an in-app browser - a link opened inside
        // WhatsApp or Instagram, where the camera is simply not granted to the
        // page. Saying so beats "אין גישה למצלמה" with no way forward.
        setError("הדפדפן הזה לא מאפשר גישה למצלמה. אם פתחת את הקישור מתוך אפליקציה אחרת, פתח אותו ב-Safari או ב-Chrome. אפשר גם להקליד את הברקוד.");
        setLive(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) return;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
      } catch {
        setError("אין גישה למצלמה. יש לאשר את הרשאת המצלמה לאתר, או להקליד את הברקוד.");
        setLive(false);
        return;
      }

      const found = (value: string) => {
        handler.current(value);
        setLive(false);
      };

      if (hasNativeDetector()) {
        const Detector = (window as unknown as { BarcodeDetector: new (options: unknown) => { detect: (source: unknown) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        const tick = async () => {
          if (cancelled || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]?.rawValue) { found(codes[0].rawValue); return; }
          } catch {
            // A single failed frame is normal; keep looking.
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
        return;
      }

      // No native detector: decode in JavaScript. Imported here so the library
      // is fetched the first time a camera is opened and never before.
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !video.current) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoElement(video.current, (result) => {
          const value = result?.getText();
          if (value) { controls?.stop(); found(value); }
        });
      } catch {
        setError("לא ניתן להפעיל את קורא הברקוד בדפדפן הזה. אפשר להקליד את הברקוד.");
        setLive(false);
      }
    };
    run();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [live]);

  if (!live) {
    return (
      <>
        <button type="button" onClick={() => setLive(true)} className="premium-secondary-button">
          <Camera aria-hidden="true" size={17} />סריקה במצלמה
        </button>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
      </>
    );
  }

  return (
    <div className="grid gap-2">
      <video ref={video} muted playsInline className="w-full rounded-2xl border border-[#E5E7E5]" />
      {/* A barcode on a curved bottle needs to fill the frame to decode, and
          nothing on screen said so - the camera just sat there. */}
      <p className="text-xs text-[#5B5F5B]">להחזיק את הברקוד ישר וקרוב, שימלא את רוחב המסגרת. אם לא נקרא תוך כמה שניות — אפשר להקליד אותו.</p>
      <button type="button" onClick={() => setLive(false)} className="premium-secondary-button">עצירה</button>
    </div>
  );
}
