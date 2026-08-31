import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Does this request carry the scheduler's secret?
 *
 * The five routes that ask each compared the header to the secret with `!==`,
 * which returns as soon as two characters differ and so takes measurably longer
 * the more of the prefix is right. Over the open internet the jitter buries
 * that signal, which is why this was never urgent - but the constant-time
 * version is three lines and there is no reason to keep the other one.
 *
 * Both sides are hashed first so the comparison is always over two equal-length
 * buffers: timingSafeEqual throws when they differ, and a thrown length check
 * is itself the leak it was meant to prevent.
 */
export function isAuthorizedCronRequest(
  request: Request,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  const presented = request.headers.get("authorization");
  if (!presented) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(presented), digest(`Bearer ${secret}`));
}
