// Verifies that 202608100003_exercise_guidance.sql landed: the four guidance
// columns are readable, and save_exercise_guidance exists and refuses a client.
// Read-only - the one RPC call is made as a client, which the function rejects
// before it writes.
//
//   node scripts/check-exercise-guidance-migration.mjs

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.e2e") });
config({ path: join(root, ".env.local"), override: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { error: authError } = await supabase.auth.signInWithPassword({
  email: process.env.E2E_CLIENT_EMAIL,
  password: process.env.E2E_CLIENT_PASSWORD,
});
if (authError) {
  console.error(`sign-in failed: ${authError.message}`);
  process.exit(1);
}

let ok = true;

const { data: rows, error: columnError } = await supabase
  .from("workout_exercises")
  .select("id,image_url,how_to,cues,common_mistakes")
  .limit(3);
if (columnError) {
  ok = false;
  console.log(`guidance columns          MISSING  (${columnError.code ?? ""} ${columnError.message})`);
} else {
  const withGuidance = (rows ?? []).filter((row) => (row.cues ?? []).length || (row.common_mistakes ?? []).length).length;
  console.log(`guidance columns          present (${rows?.length ?? 0} sampled, ${withGuidance} already filled)`);
}

// A client must not be able to write guidance.
const { error: rpcError } = await supabase.rpc("save_exercise_guidance", {
  p_exercise_id: rows?.[0]?.id ?? "exercise-does-not-exist",
  p_image_url: "",
  p_how_to: "regression probe",
  p_cues: [],
  p_common_mistakes: [],
});
const message = rpcError?.message ?? "";
if (message.includes("not_authorized")) {
  console.log("save_exercise_guidance    present, refuses a client");
} else if (!rpcError) {
  ok = false;
  console.log("save_exercise_guidance    present but ACCEPTED a client write");
} else if (rpcError.code === "PGRST202") {
  ok = false;
  console.log(`save_exercise_guidance    MISSING  (${message})`);
} else {
  ok = false;
  console.log(`save_exercise_guidance    unexpected error: ${message}`);
}

await supabase.auth.signOut();
console.log(ok ? "\nmigration applied" : "\nmigration NOT fully applied");
process.exit(ok ? 0 : 1);
