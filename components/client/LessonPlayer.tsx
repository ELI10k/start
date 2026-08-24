"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { saveContentProgress } from "@/app/actions/content";

/* A player that does not announce where the video is stored.
 *
 * The lessons live on YouTube, but a client who paid for a course should not be
 * handed YouTube's furniture on the way in: the channel name across the top, the
 * logo in the corner, the grid of somebody else's videos at the end, the link
 * that takes them out of the app. So the frame runs with `controls: 0` - which
 * removes all of it - and the bar below is ours.
 *
 * Nothing is loaded until the client presses play. Until then the screen is the
 * course artwork, which also means eleven course pages do not each open a
 * connection to Google before anyone has asked to watch anything.
 */

type YouTubePlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// One script for the whole session, however many lessons are opened.
let apiPromise: Promise<YouTubeApi> | null = null;
function loadPlayerApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YouTubeApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("player api did not load"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("player api did not load"));
    document.head.appendChild(script);
  });
  return apiPromise;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}

export default function LessonPlayer({
  contentItemId,
  videoId,
  title,
  posterUrl,
  startSeconds = 0,
}: {
  contentItemId: string;
  videoId: string;
  title: string;
  posterUrl?: string | null;
  startSeconds?: number;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const completed = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [full, setFull] = useState(false);

  /* A lesson watched to the end is a lesson watched. Marking it here saves the
     client from having to confirm what they just did, and it is what keeps the
     "continue watching" row honest. */
  const markWatched = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    const form = new FormData();
    form.set("contentItemId", contentItemId);
    form.set("progress", "100");
    void saveContentProgress(form);
  }, [contentItemId]);

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Long enough to find the fullscreen button without hunting for it. The bar
    // is the only way in or out of fullscreen, so hiding it briskly - as a film
    // player does - left people stuck with a letterboxed strip.
    hideTimer.current = setTimeout(() => setChromeVisible(false), 5000);
  }, []);

  useEffect(() => {
    if (!started || !mount.current) return;
    let cancelled = false;
    loadPlayerApi()
      .then((api) => {
        if (cancelled || !mount.current) return;
        player.current = new api.Player(mount.current, {
          videoId,
          playerVars: {
            // The whole point: no YouTube controls, branding, keyboard
            // shortcuts, end screen or related grid inside the frame.
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            autoplay: 1,
            start: startSeconds,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              setDuration(player.current?.getDuration() ?? 0);
              revealChrome();
            },
            onStateChange: (event) => {
              if (cancelled) return;
              setPlaying(event.data === api.PlayerState.PLAYING);
              if (event.data === api.PlayerState.ENDED) markWatched();
              if (event.data === api.PlayerState.PLAYING) {
                setDuration(player.current?.getDuration() ?? 0);
                revealChrome();
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [started, videoId, startSeconds, markWatched, revealChrome]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const current = player.current?.getCurrentTime() ?? 0;
      setElapsed(current);
      const total = player.current?.getDuration() ?? 0;
      if (total > 0 && current / total >= 0.95) markWatched();
    }, 250);
    return () => clearInterval(timer);
  }, [playing, markWatched]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const toggle = () => {
    revealChrome();
    if (playing) player.current?.pauseVideo();
    else player.current?.playVideo();
  };

  const seek = (value: number) => {
    revealChrome();
    setElapsed(value);
    player.current?.seekTo(value, true);
  };

  const toggleMute = () => {
    revealChrome();
    const isMuted = player.current?.isMuted() ?? false;
    if (isMuted) player.current?.unMute();
    else player.current?.mute();
    setMuted(!isMuted);
  };

  /* Not the browser's fullscreen. iPhone Safari has no Element.requestFullscreen
     at all - only a <video> can go fullscreen there, and ours is inside a frame
     we do not own - so the button did nothing on the one device that matters
     most here. This pins the player over the whole viewport instead, which
     behaves the same on every browser, and on a portrait phone turns it on its
     side so a 16:9 lesson fills the screen without asking anyone to rotate. */
  /* Two ways to fill the screen, and the real one is tried first.
     Native fullscreen is what takes the browser's own furniture away - the
     address bar, the tab strip, the buttons down the side - and only it can.
     Android and every desktop browser support it. iOS Safari does not: there,
     fullscreen belongs to a <video> element alone, and ours lives inside a
     frame we do not own, so the call is refused. Only then does the CSS layer
     stand in, which fills the page but cannot move the browser's edges. */
  const toggleFull = () => {
    revealChrome();
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (to: string) => Promise<void>;
    };

    if (full) {
      setFull(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      orientation?.unlock?.();
      return;
    }

    setFull(true);
    const request = stage.current?.requestFullscreen?.();
    if (request) {
      void request
        // Landscape is worth asking for once we are actually fullscreen, and
        // is refused harmlessly everywhere it is not supported.
        .then(() => orientation?.lock?.("landscape").catch(() => undefined))
        .catch(() => undefined);
    }
  };

  /* Leaving fullscreen by the browser's own means - Escape, the swipe, the
     Android back gesture - never tells the page, so the fullscreen layout has
     to follow the browser rather than only our own button. */
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement && document.fullscreenEnabled) setFull(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll under the player while it is covering it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [full]);

  /* Whatever went wrong loading our own player, the lesson still has to be
     watchable - so the plain frame stands in rather than a dead rectangle. */
  if (failed) {
    return (
      <div className="cinema-stage">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&autoplay=1${startSeconds ? `&start=${startSeconds}` : ""}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      className="cinema-player"
      data-started={started}
      data-chrome={chromeVisible}
      data-full={full}
      ref={stage}
      onMouseMove={started ? revealChrome : undefined}
    >
      {started ? (
        <>
          <div className="cinema-player__frame" ref={mount} />
          {/* The frame is covered edge to edge: every tap belongs to this app,
              and nothing inside it can navigate the client to YouTube. */}
          <button
            type="button"
            className="cinema-player__surface"
            aria-label={playing ? "השהיה" : "ניגון"}
            onClick={toggle}
          />
          <div className="cinema-player__bar">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "השהיה" : "ניגון"}
            >
              {playing ? (
                <Pause aria-hidden="true" size={19} fill="currentColor" />
              ) : (
                <Play aria-hidden="true" size={19} fill="currentColor" />
              )}
            </button>
            <span className="cinema-player__time">{clock(elapsed)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={Math.min(elapsed, duration || 1)}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="מיקום בסרטון"
            />
            <span className="cinema-player__time">{clock(duration)}</span>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "ביטול השתקה" : "השתקה"}
            >
              {muted ? (
                <VolumeX aria-hidden="true" size={19} />
              ) : (
                <Volume2 aria-hidden="true" size={19} />
              )}
            </button>
            <button
              type="button"
              onClick={toggleFull}
              aria-label={full ? "יציאה ממסך מלא" : "מסך מלא"}
            >
              {full ? (
                <Minimize aria-hidden="true" size={19} />
              ) : (
                <Maximize aria-hidden="true" size={19} />
              )}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="cinema-player__poster"
          onClick={() => setStarted(true)}
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              width={1600}
              height={900}
              priority
              unoptimized
            />
          ) : null}
          <span className="cinema-player__start">
            <Play aria-hidden="true" size={30} fill="currentColor" />
          </span>
          <span className="sr-only">ניגון: {title}</span>
        </button>
      )}
    </div>
  );
}
