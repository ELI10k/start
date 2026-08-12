import { headers } from "next/headers";

// Where a sign-in should come back to.
//
// This used to be one environment variable, and on anything that was not
// production it fell through to VERCEL_PROJECT_PRODUCTION_URL - which is
// literally the production domain. So a coach who opened a preview, asked for a
// link and clicked it was handed to production, saw the old build, and reported
// the preview as broken.
//
// Production still answers with the address it was configured with: that is a
// stable, human-readable domain and there is no reason to derive it. Every other
// deployment answers on the origin the request actually arrived on, because a
// preview's hostname is generated per deployment and cannot be configured ahead
// of time.

const clean = (value?: string | null) => value?.trim().replace(/\/$/, "") ?? "";

// A host and nothing else: no scheme, no path, no credentials, no second host
// smuggled in behind a comma.
const HOST_ONLY = /^[a-z0-9.-]+(:\d{2,5})?$/i;
const LOCAL = /^(localhost|127\.0\.0\.1)(:|$)/;

/** The origin this request came in on, or "" if the headers do not give a usable one. */
export async function requestOrigin(): Promise<string> {
  const inbound = await headers();
  const host = (inbound.get("x-forwarded-host") ?? inbound.get("host") ?? "").split(",")[0].trim();
  if (!HOST_ONLY.test(host)) return "";
  const forwardedProtocol = (inbound.get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const protocol = forwardedProtocol || (LOCAL.test(host) ? "http" : "https");
  if (protocol !== "http" && protocol !== "https") return "";
  return `${protocol}://${host}`;
}

/**
 * The origin to build an auth redirect from.
 *
 * The host header is only trusted away from production, and only ever to build a
 * URL that Supabase has to match against its own allowlist before it will honour
 * it - so a forged host cannot turn this into a redirect anywhere new.
 */
export async function siteUrlForRedirect(): Promise<string> {
  const configured = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_ENV === "production") {
    const productionUrl = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
    return configured || (productionUrl ? `https://${productionUrl}` : "");
  }
  return (await requestOrigin()) || configured;
}

/** True only on a Vercel preview deployment. Drives the PREVIEW badge. */
export const isPreviewDeployment = () => process.env.VERCEL_ENV === "preview";
