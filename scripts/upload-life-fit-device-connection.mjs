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
const folder = "life-fit-device-connection-v1";
const mediaRoot = new URL("../outputs/life-fit-device-connection-v1/", import.meta.url);
const files = [
  "life-fit-device-connection-ios-4k.mp4",
  "life-fit-device-connection-android-4k.mp4",
];

const { data: existing, error: initialListError } = await supabase.storage
  .from(bucket)
  .list(folder, { limit: files.length, sortBy: { column: "name", order: "asc" } });
if (initialListError) throw initialListError;

const existingByName = new Map((existing ?? []).map((item) => [item.name, item]));
const uploaded = [];
if (process.env.VERIFY_ONLY !== "1") {
  for (const filename of files) {
    const localPath = path.join(mediaRoot.pathname, filename);
    const expectedSize = fs.statSync(localPath).size;
    const currentSize = Number(existingByName.get(filename)?.metadata?.size ?? 0);
    if (currentSize === expectedSize) continue;
    if (currentSize !== 0) {
      throw new Error(`Refusing to overwrite ${filename}: expected ${expectedSize}, found ${currentSize}`);
    }

    const body = fs.readFileSync(localPath);
    const storagePath = `${folder}/${filename}`;
    console.log(`Uploading ${storagePath} (${body.byteLength} bytes)`);
    const { error } = await supabase.storage.from(bucket).upload(storagePath, body, {
      contentType: "video/mp4",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    uploaded.push({ storagePath, bytes: body.byteLength });
  }
}

const { data: stored, error: verificationError } = await supabase.storage
  .from(bucket)
  .list(folder, { limit: files.length, sortBy: { column: "name", order: "asc" } });
if (verificationError) throw verificationError;

const wrongSizes = files.flatMap((filename) => {
  const expected = fs.statSync(path.join(mediaRoot.pathname, filename)).size;
  const actual = Number((stored ?? []).find((item) => item.name === filename)?.metadata?.size);
  return actual === expected ? [] : [{ filename, expected, actual }];
});
if (wrongSizes.length) {
  throw new Error(`Upload verification failed: ${JSON.stringify(wrongSizes)}`);
}

console.log(JSON.stringify({ bucket, folder, uploaded, verified: files }, null, 2));
