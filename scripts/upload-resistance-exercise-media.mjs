import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(process.env.ENV_FILE || ".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error("Missing Supabase environment variables");

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const bucket = "exercise-media";
const mediaRoot = new URL("../public/exercises/resistance/", import.meta.url);
const exercises = JSON.parse(fs.readFileSync(new URL("./data/resistance-new-exercises.json", import.meta.url), "utf8"));

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) throw bucketError;
if (!buckets.some(({ id }) => id === bucket)) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "video/mp4"],
  });
  if (error) throw error;
}

const files = exercises.flatMap(({ slug }) => [
  { slug, extension: "jpg", contentType: "image/jpeg" },
  { slug, extension: "mp4", contentType: "video/mp4" },
]);

const { data: existing, error: listError } = await supabase.storage.from(bucket).list("resistance", { limit: 1000 });
if (listError) throw listError;
const existingNames = new Set(existing.map(({ name }) => name));
const missing = files.filter(({ slug, extension }) => !existingNames.has(`${slug}.${extension}`));
const batch = missing.slice(0, Number(process.env.MAX_UPLOADS || 24));
let uploaded = 0;
for (let offset = 0; offset < batch.length; offset += 24) {
  await Promise.all(batch.slice(offset, offset + 24).map(async ({ slug, extension, contentType }) => {
    const filename = `${slug}.${extension}`;
    const localPath = path.join(mediaRoot.pathname, filename);
    const { error } = await supabase.storage.from(bucket).upload(`resistance/${filename}`, fs.readFileSync(localPath), {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error && !/already exists/i.test(error.message)) throw error;
    if (!error) uploaded += 1;
  }));
}

const publicOrigin = `${url}/storage/v1/object/public/${bucket}/resistance`;
console.log(JSON.stringify({ bucket, uploaded, remaining: missing.length - uploaded, publicOrigin }, null, 2));
