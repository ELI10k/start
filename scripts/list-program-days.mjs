// Day ids for one programme, so the verifier can be pointed at a real day URL.
import { readFileSync } from "node:fs";

const programId = process.argv[2];
if (!programId) throw new Error("usage: list-program-days.mjs <programId>");

const env = Object.fromEntries(
  readFileSync(new URL("../.env.e2e", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const grant = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: anon, authorization: `Bearer ${anon}` },
  body: JSON.stringify({ email: env.E2E_COACH_EMAIL, password: env.E2E_COACH_PASSWORD }),
});
if (!grant.ok) throw new Error(`Supabase rejected the E2E coach sign-in (HTTP ${grant.status}).`);
const session = await grant.json();

const response = await fetch(
  `${url}/rest/v1/workout_program_days?program_id=eq.${programId}&select=id,name,sort_order&order=sort_order`,
  { headers: { apikey: anon, authorization: `Bearer ${session.access_token}` } },
);
if (!response.ok) throw new Error(`HTTP ${response.status}`);
console.log(JSON.stringify(await response.json(), null, 2));
