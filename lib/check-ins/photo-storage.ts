export const CHECK_IN_PHOTO_BUCKET = "check-in-photos";
export const CHECK_IN_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const CHECK_IN_PHOTO_URL_TTL_SECONDS = 5 * 60;
export const CHECK_IN_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type CheckInPhotoFile = Pick<File, "size" | "type">;

export function validateCheckInPhoto(file: CheckInPhotoFile): string | null {
  if (!CHECK_IN_PHOTO_TYPES.has(file.type))
    return "התמונות חייבות להיות JPG, PNG או WebP.";
  if (file.size > CHECK_IN_PHOTO_MAX_BYTES)
    return "כל תמונה יכולה להיות בגודל של עד 5MB.";
  return null;
}

export function checkInPhotoPath(
  clientId: string,
  checkInId: string,
  view: string,
  id: string,
  mimeType: string,
) {
  const extension =
    mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  return `${clientId}/${checkInId}/${view}-${id}.${extension}`;
}

type PhotoStorage = {
  upload: (
    path: string,
    file: File,
    options: { contentType: string; upsert: false },
  ) => Promise<{ error: unknown }>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
};

type PhotoRows = {
  insert: (row: {
    check_in_id: string;
    client_id: string;
    view: string;
    storage_path: string;
  }) => PromiseLike<{ error: unknown }>;
};

export async function removeUploadedPhotos(
  storage: PhotoStorage,
  paths: string[],
) {
  if (!paths.length) return true;
  const first = await storage.remove(paths);
  if (!first.error) return true;
  const retry = await storage.remove(paths);
  return !retry.error;
}

export async function uploadCheckInPhotos({
  storage,
  rows,
  files,
  clientId,
  checkInId,
  randomId = () => crypto.randomUUID(),
}: {
  storage: PhotoStorage;
  rows: PhotoRows;
  files: readonly { view: string; file: File }[];
  clientId: string;
  checkInId: string;
  randomId?: () => string;
}) {
  const uploaded: string[] = [];
  for (const { view, file } of files) {
    const path = checkInPhotoPath(
      clientId,
      checkInId,
      view,
      randomId(),
      file.type,
    );
    const upload = await storage.upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upload.error) {
      return {
        ok: false as const,
        reason: "upload" as const,
        cleanupOk: await removeUploadedPhotos(storage, uploaded),
      };
    }
    uploaded.push(path);
    const saved = await rows.insert({
      check_in_id: checkInId,
      client_id: clientId,
      view,
      storage_path: path,
    });
    if (saved.error) {
      return {
        ok: false as const,
        reason: "record" as const,
        cleanupOk: await removeUploadedPhotos(storage, uploaded),
      };
    }
  }
  return { ok: true as const, uploaded };
}
