"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import styles from "./page.module.css";

export default function GuideVideo({
  src,
  title,
  number,
}: {
  src: string;
  title: string;
  number: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function startVideo() {
    setStarted(true);
    void videoRef.current?.play().catch(() => undefined);
  }

  return (
    <div className={styles.player}>
      <video
        ref={videoRef}
        controls={started}
        playsInline
        preload="metadata"
        aria-label={`סרטון: ${title}`}
      >
        <source src={src} type="video/mp4" />
      </video>
      {!started ? (
        <button
          type="button"
          className={styles.videoCover}
          onClick={startVideo}
          aria-label={`הפעלת הסרטון: ${title}`}
        >
          <span className={styles.coverNumber}>{number}</span>
          <span className={styles.coverMark}>LIFE FIT</span>
          <strong>{title}</strong>
          <span className={styles.coverPlay}>
            <Play size={25} fill="currentColor" aria-hidden="true" />
          </span>
          <small>לחצו לצפייה</small>
        </button>
      ) : null}
    </div>
  );
}
