// The gym is in a basement. Everything here answers one question - is the phone
// reachable right now - and does it without a library, a service worker or a
// background sync queue. Simplicity is the point: a wrong "you are offline" is
// worse than no banner at all.

export type ConnectionState = Readonly<{ online: boolean; changedAt: number }>;

// navigator.onLine is honest about "no network interface" and optimistic about
// everything else - a captive portal or a dead uplink still reads as online. So
// a failed request is allowed to mark the connection down, and only the
// browser's own online event, or a request that succeeds, marks it back up.
export function nextConnectionState(current: ConnectionState, event: "browser-online" | "browser-offline" | "request-failed" | "request-succeeded", now: number): ConnectionState {
  const online = event === "browser-online" || event === "request-succeeded" ? true : event === "browser-offline" || event === "request-failed" ? false : current.online;
  return online === current.online ? current : { online, changedAt: now };
}

// A request that failed because the app is offline reads differently from one
// the server rejected: the first is worth retrying untouched, the second is not.
export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /failed to fetch|networkerror|network request failed|load failed|err_internet_disconnected|fetch failed/i.test(message);
}

type Listener = () => void;

// A single store the whole client app subscribes to through useSyncExternalStore,
// so the banner, the workout screen and the provider all agree on one answer.
function createConnectionStore() {
  let state: ConnectionState = { online: true, changedAt: 0 };
  const listeners = new Set<Listener>();
  const emit = () => { for (const listener of listeners) listener(); };
  const apply = (event: Parameters<typeof nextConnectionState>[1]) => {
    const next = nextConnectionState(state, event, Date.now());
    if (next === state) return;
    state = next;
    emit();
  };
  return {
    getSnapshot: () => state,
    getServerSnapshot: (): ConnectionState => SERVER_STATE,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    start() {
      if (typeof window === "undefined") return () => {};
      state = { online: navigator.onLine !== false, changedAt: 0 };
      const online = () => apply("browser-online");
      const offline = () => apply("browser-offline");
      window.addEventListener("online", online);
      window.addEventListener("offline", offline);
      return () => {
        window.removeEventListener("online", online);
        window.removeEventListener("offline", offline);
      };
    },
    reportFailure: (error: unknown) => { if (isOfflineError(error)) apply("request-failed"); },
    reportSuccess: () => apply("request-succeeded"),
  };
}

// Rendered on the server before hydration, where there is no connection to
// report on. Assuming online avoids flashing an offline banner on first paint.
const SERVER_STATE: ConnectionState = { online: true, changedAt: 0 };

export const connectionStore = createConnectionStore();
