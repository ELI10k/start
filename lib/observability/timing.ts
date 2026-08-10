import "server-only";

// Server-side timing for the routes that have been slow enough to complain about.
// Off in production unless START_TRACE_TIMING is set, so it costs nothing there but
// is available when a deployment needs to be measured rather than guessed at.
const enabled =
  process.env.START_TRACE_TIMING === "1" || process.env.NODE_ENV !== "production";

export async function traced<T>(label: string, run: () => Promise<T>): Promise<T> {
  if (!enabled) return run();
  const started = Date.now();
  try {
    return await run();
  } finally {
    console.log(`[timing] ${label} ${Date.now() - started}ms`);
  }
}
