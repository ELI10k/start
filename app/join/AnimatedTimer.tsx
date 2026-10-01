"use client";

import { useEffect, useState } from "react";

export default function AnimatedTimer() {
  const [seconds, setSeconds] = useState(47);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((current) => (current <= 41 ? 47 : current - 1));
    }, 850);

    return () => window.clearInterval(interval);
  }, []);

  return <span>{`00:${seconds}`}</span>;
}
