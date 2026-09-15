import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type StorageReference = Readonly<{ bucket: string; path: string }>;

const uniqueReferences = (references: readonly StorageReference[]) => {
  const seen = new Set<string>();
  return references.filter(({ bucket, path }) => {
    const key = `${bucket}\0${path}`;
    if (!path || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function accountStorageReferences(admin: SupabaseClient, userId: string) {
  const [checkIns, foodLog, techniqueVideos] = await Promise.all([
    admin.from("check_in_photos").select("storage_path").eq("client_id", userId),
    admin.from("client_food_log").select("photo_path").eq("client_id", userId).not("photo_path", "is", null),
    admin.from("exercise_technique_videos").select("storage_path").eq("client_id", userId),
  ]);

  const queryError = checkIns.error ?? foodLog.error ?? techniqueVideos.error;
  if (queryError) throw new Error("account_storage_inventory_failed", { cause: queryError });

  return uniqueReferences([
    ...(checkIns.data ?? []).map((row) => ({ bucket: "check-in-photos", path: String(row.storage_path ?? "") })),
    ...(foodLog.data ?? []).map((row) => ({ bucket: "food-log-photos", path: String(row.photo_path ?? "") })),
    ...(techniqueVideos.data ?? []).map((row) => ({ bucket: "technique-videos", path: String(row.storage_path ?? "") })),
  ]);
}

async function removeStorageReferences(admin: SupabaseClient, references: readonly StorageReference[]) {
  const byBucket = new Map<string, string[]>();
  for (const { bucket, path } of references) {
    const paths = byBucket.get(bucket) ?? [];
    paths.push(path);
    byBucket.set(bucket, paths);
  }

  for (const [bucket, paths] of byBucket) {
    for (let offset = 0; offset < paths.length; offset += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(offset, offset + 100));
      if (error) throw new Error("account_storage_delete_failed", { cause: error });
    }
  }
}

/**
 * Deletes private blobs before deleting the Auth user. Deleting auth.users then
 * cascades through profiles and the client-owned relational rows. Storage is not
 * part of that cascade, so leaving it to the database would retain photographs
 * and videos after the user was told their account was gone.
 */
export async function permanentlyDeleteOwnAccount(admin: SupabaseClient, userId: string) {
  const references = await accountStorageReferences(admin, userId);
  await removeStorageReferences(admin, references);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error("account_auth_delete_failed", { cause: error });
  return { deletedFiles: references.length };
}
