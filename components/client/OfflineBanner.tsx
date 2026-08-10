"use client";
import { useEffect, useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";
import { connectionStore } from "@/lib/offline/connection";

// One line, only when it is true. It appears under the header rather than over
// the content so it never covers a set the client is in the middle of typing.
export default function OfflineBanner() {
  useEffect(() => connectionStore.start(), []);
  const { online } = useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot, connectionStore.getServerSnapshot);
  if (online) return null;
  return (
    <p role="status" className="offline-banner">
      <CloudOff aria-hidden="true" size={16} />
      אין חיבור לאינטרנט. האימון ממשיך והנתונים נשמרים במכשיר.
    </p>
  );
}
