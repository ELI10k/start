export const AUTH_CONTEXT_HEADERS = {
  id: "x-start-auth-id",
  role: "x-start-auth-role",
  name: "x-start-auth-name",
  status: "x-start-auth-status",
} as const;

export function clearAuthContextHeaders(headers: Headers) {
  Object.values(AUTH_CONTEXT_HEADERS).forEach((name) => headers.delete(name));
  return headers;
}
