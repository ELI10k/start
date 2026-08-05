import type { BrowserContext } from "@playwright/test";

// Signing in through the form types the password into the page, and Playwright records
// the value of every fill() in its trace. That put the test-account password into
// reports/e2e in clear text on any failure.
//
// So the suite never types a password. It exchanges the credential for a session over
// Supabase's HTTP API inside the Node process, then writes the same cookie
// @supabase/ssr would have written. The password never reaches the browser, and
// therefore never reaches a trace, a snapshot or a video.

type Session = Readonly<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: unknown;
}>;

// @supabase/ssr splits a long cookie into `.0`, `.1`, … chunks at this size.
const CHUNK_SIZE = 3180;

function projectRef(supabaseUrl: string): string {
  return new URL(supabaseUrl).hostname.split(".")[0];
}

export async function passwordGrant(email: string, password: string): Promise<Session> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured for E2E.");

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: anonKey, authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    // Never echo the body: it can repeat the submitted credential.
    throw new Error(`Supabase rejected the E2E sign-in for ${email} (HTTP ${response.status}).`);
  }
  const session = (await response.json()) as Session;
  if (!session.access_token) throw new Error(`Supabase returned no access token for ${email}.`);
  return { ...session, expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in };
}

export async function applySession(context: BrowserContext, baseURL: string, session: Session): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const name = `sb-${projectRef(supabaseUrl)}-auth-token`;
  const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64")}`;
  const { hostname } = new URL(baseURL);

  const chunks: Array<{ name: string; value: string }> = [];
  if (encoded.length <= CHUNK_SIZE) {
    chunks.push({ name, value: encoded });
  } else {
    for (let index = 0; index * CHUNK_SIZE < encoded.length; index += 1) {
      chunks.push({ name: `${name}.${index}`, value: encoded.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE) });
    }
  }

  await context.addCookies(
    chunks.map((chunk) => ({
      name: chunk.name,
      value: chunk.value,
      domain: hostname,
      path: "/",
      httpOnly: false,
      secure: baseURL.startsWith("https://"),
      sameSite: "Lax" as const,
      expires: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    })),
  );
}
