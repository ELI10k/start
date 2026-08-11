// Read-only probe: which programme is the coach looking at, and is it flagged
// `official`? WorkoutDayPreview renders sets/reps/rest as plain text - exactly the
// grey tiles in the screenshot - whenever program.official is true, because
// save_workout_program_tree refuses to rewrite a shared programme.
//
// Signs in over Supabase's HTTP API rather than through the form, so the password
// never reaches a browser. Same approach as e2e/support/session.ts.
import { readFileSync } from "node:fs";

const PROGRAM_ID = process.argv[2] ?? "workout-program-18nf8g8";
const DAY_ID = process.argv[3] ?? "workout-day-e1x8zr";

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

const rest = async (path) => {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: anon, authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
  return response.json();
};

const target = await rest(
  `workout_programs?id=eq.${PROGRAM_ID}&select=id,name,official,status,duplicated_from_id`,
);
console.log("=== programme from the screenshot ===");
console.log(target.length ? JSON.stringify(target[0], null, 2) : "(not visible to the E2E coach)");

const editable = await rest(
  `workout_programs?official=eq.false&status=eq.active&select=id,name,official&limit=5`,
);
console.log("=== editable (official=false) programmes visible to the E2E coach ===");
console.log(JSON.stringify(editable, null, 2));

const officialSample = await rest(`workout_programs?official=eq.true&select=id,name&limit=5`);
console.log("=== official programmes ===");
console.log(JSON.stringify(officialSample, null, 2));
