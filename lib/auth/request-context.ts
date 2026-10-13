export const AUTH_CONTEXT_HEADERS = {
  id: "x-start-auth-id",
  role: "x-start-auth-role",
  name: "x-start-auth-name",
  status: "x-start-auth-status",
} as const;

export function encodeAuthContextHeader(value: string) {
  // Fetch Headers accept ByteString values only. Profile names are commonly
  // Hebrew, so forwarding the database value verbatim makes the Web Handler
  // throw before the authenticated page can render on iOS (or any browser).
  return encodeURIComponent(value);
}

export function decodeAuthContextHeader(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    // The proxy is the only trusted writer, but a malformed internal value must
    // not turn a signed-in request into a white screen.
    return "";
  }
}

export function clearAuthContextHeaders(headers: Headers) {
  Object.values(AUTH_CONTEXT_HEADERS).forEach((name) => headers.delete(name));
  return headers;
}
