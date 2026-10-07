import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(process.env.ENV_FILE || ".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const bucket = "content-media";
const folder = "life-fit-training-series-v1";
const mediaRoot = new URL("../outputs/life-fit-training-series-v1/", import.meta.url);
const files = [
  ["01-login-home-navigation-v2.mp4", "01-login-home-navigation.mp4"],
  ["02-personal-menu-meals-v2.mp4", "02-personal-menu-meals.mp4"],
  ["03-outside-menu-shopping-v2.mp4", "03-outside-menu-shopping.mp4"],
  ["04-workout-program-session.mp4", "04-workout-program-session.mp4"],
  ["05-workout-management-progress.mp4", "05-workout-management-progress.mp4"],
  ["06-measurements-health-checkin-v2.mp4", "06-measurements-health-checkin.mp4"],
  ["07-messages-content-profile-support-v2.mp4", "07-messages-content-profile-support.mp4"],
];

const results = [];
if (process.env.VERIFY_ONLY !== "1") {
  for (const [sourceName, destinationName] of files) {
    const localPath = path.join(mediaRoot.pathname, sourceName);
    const storagePath = `${folder}/${destinationName}`;
    const body = fs.readFileSync(localPath);
    console.log(`Uploading ${storagePath} (${body.byteLength} bytes)`);
    const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
      contentType: "video/mp4",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw error;
    results.push({ storagePath, bytes: body.byteLength });
  }
}

const { data: uploaded, error: listError } = await supabase.storage
  .from(bucket)
  .list(folder, { limit: files.length, sortBy: { column: "name", order: "asc" } });
if (listError) throw listError;

const expectedNames = files.map(([, destinationName]) => destinationName);
const uploadedNames = new Set((uploaded ?? []).map(({ name }) => name));
const missing = expectedNames.filter((name) => !uploadedNames.has(name));
if (missing.length) {
  throw new Error(`Upload verification failed: ${missing.join(", ")}`);
}

const wrongSizes = files.flatMap(([sourceName, destinationName]) => {
  const expected = fs.statSync(path.join(mediaRoot.pathname, sourceName)).size;
  const actual = Number(
    (uploaded ?? []).find(({ name }) => name === destinationName)?.metadata?.size,
  );
  return actual === expected ? [] : [{ destinationName, expected, actual }];
});
if (wrongSizes.length) {
  throw new Error(`Upload size verification failed: ${JSON.stringify(wrongSizes)}`);
}

console.log(JSON.stringify({ bucket, folder, uploaded: results }, null, 2));
