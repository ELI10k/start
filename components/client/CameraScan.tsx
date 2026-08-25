"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Flashlight, FlashlightOff } from "lucide-react";

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
  const [scanState, setScanState] = useState<"align" | "found">("align");
  // The torch, where the browser has one.
  //
  // A barcode in a dim kitchen or a supermarket aisle simply does not decode,
  // and the camera gave no way to help it. `torch` is a MediaTrack capability:
  // Android Chrome exposes it, iOS Safari does not expose it at all, so the
  // button appears only where pressing it would do something rather than
  // sitting there dead on half the phones that see it.
  const torchTrack = useRef<MediaStreamTrack | null>(null);
  const [torchable, setTorchable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
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
    let resolved = false;

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
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) return;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }
        const track = stream.getVideoTracks()[0] ?? null;
        torchTrack.current = track;
        setTorchable(Boolean((track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch));
      } catch {
        setError("אין גישה למצלמה. יש לאשר את הרשאת המצלמה לאתר, או להקליד את הברקוד.");
        setLive(false);
        return;
      }

      const found = (value: string) => {
        if (resolved) return;
        resolved = true;
        setScanState("found");
        // Leave the green confirmation visible briefly. Without it the camera
        // disappeared on the successful frame and felt like it had failed.
        timer = window.setTimeout(() => {
          handler.current(value);
          setLive(false);
        }, 550);
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
      // Stopping the track turns the torch off with it, but the state has to
      // follow or reopening the camera would show a lit button over a dark lamp.
      torchTrack.current = null;
      setTorchable(false);
      setTorchOn(false);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [live]);

  const toggleTorch = async () => {
    const track = torchTrack.current;
    if (!track) return;
    const next = !torchOn;
    try {
      // `torch` is real and shipping in Chromium, and absent from the DOM
      // typings, which describe the standardised set only.
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      // A lamp that refuses is not worth an error screen over; the field below
      // still takes the digits.
      setTorchable(false);
    }
  };

  if (!live) {
    return (
      <>
        <button type="button" onClick={() => { setScanState("align"); setError(""); setLive(true); }} className="premium-secondary-button">
          <Camera aria-hidden="true" size={17} />סריקה במצלמה
        </button>
        {error && <p role="alert" className="text-sm text-[#DC2626]">{error}</p>}
      </>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={video} muted playsInline className="block aspect-[4/3] w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10 p-8">
          <div
            role="status"
            aria-live="polite"
            className={`relative h-[52%] w-[78%] rounded-xl border-[4px] transition-colors ${scanState === "found" ? "border-[#16A34A] shadow-[0_0_0_999px_rgba(22,163,74,.08)]" : "border-[#DC2626] shadow-[0_0_0_999px_rgba(0,0,0,.18)]"}`}
          >
            <span className={`absolute -bottom-8 right-1/2 translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black text-white ${scanState === "found" ? "bg-[#16A34A]" : "bg-[#DC2626]"}`}>
              {scanState === "found" ? "הברקוד נקלט" : "מקמו את הברקוד במסגרת"}
            </span>
          </div>
        </div>
      </div>
      {/* A barcode on a curved bottle needs to fill the frame to decode, and
          nothing on screen said so - the camera just sat there. */}
      <p className="text-xs text-[#5B5F5B]">להחזיק את הברקוד ישר וקרוב, שימלא את רוחב המסגרת. אם לא נקרא תוך כמה שניות — אפשר להקליד אותו.</p>
      <div className="grid gap-2">
        {torchable ? (
          <button type="button" onClick={toggleTorch} aria-pressed={torchOn} className="premium-secondary-button">
            {torchOn ? <FlashlightOff aria-hidden="true" size={17} /> : <Flashlight aria-hidden="true" size={17} />}
            {torchOn ? "כיבוי הפנס" : "הדלקת הפנס"}
          </button>
        ) : null}
        <button type="button" onClick={() => setLive(false)} className="premium-secondary-button">עצירה</button>
      </div>
    </div>
  );
}
