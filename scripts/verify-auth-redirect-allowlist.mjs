// Is a given URL on Supabase's redirect allow-list?
//
// Supabase does not expose the list without a management token, but it does not
// need to: send a deliberately invalid token to /auth/v1/verify with a redirect_to
// and watch where it sends you. An allow-listed target is honoured - you come back
// to it carrying an error. Anything else is silently replaced with the project's
// Site URL, which is exactly the symptom of a preview login landing on production.
//
// No email is sent and nothing is written. The token is invalid on purpose.
//
//   node scripts/verify-auth-redirect-allowlist.mjs <previewBaseUrl>
import { readFileSync } from "node:fs";

const previewBase = process.argv[2];
if (!previewBase) throw new Error("usage: verify-auth-redirect-allowlist.mjs <previewBaseUrl>");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.e2e", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
);
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const targets = [
  { label: "preview /auth/confirm-link", url: `${previewBase}/auth/confirm-link` },
  { label: "preview /auth/callback", url: `${previewBase}/auth/callback` },
  { label: "preview with a next path", url: `${previewBase}/auth/confirm-link?next=%2Fcoach%2Fworkouts` },
  { label: "production /auth/confirm-link", url: "https://start-snowy-eight.vercel.app/auth/confirm-link" },
  // Must never be honoured, whatever else changes.
  { label: "an unrelated site", url: "https://evil.example.com/steal" },
  { label: "another vercel.app project", url: "https://some-other-project.vercel.app/auth/callback" },
];

const rows = [];
for (const target of targets) {
  const probe = `${supabaseUrl}/auth/v1/verify?token=deliberately-invalid&type=magiclink&redirect_to=${encodeURIComponent(target.url)}`;
  const response = await fetch(probe, { redirect: "manual", headers: { apikey: anon } });
  const location = response.headers.get("location") ?? "";
  let landedOn = "";
  try { landedOn = new URL(location).origin; } catch { landedOn = location.slice(0, 60); }
  const wanted = new URL(target.url).origin;
  rows.push({
    target: target.label,
    honoured: landedOn === wanted,
    landedOn,
    keptTheNextPath: target.url.includes("next=") ? location.includes("next=") : null,
  });
}

const previewRows = rows.filter((row) => row.target.startsWith("preview"));
console.log(JSON.stringify({
  previewAllowListed: previewRows.every((row) => row.honoured),
  productionStillHonoured: rows.find((row) => row.target.startsWith("production"))?.honoured ?? null,
  unrelatedSitesStillRefused: rows.filter((row) => !row.target.startsWith("preview") && !row.target.startsWith("production")).every((row) => !row.honoured),
  rows,
}, null, 2));
