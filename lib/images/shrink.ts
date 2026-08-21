/**
 * Downscales a photograph in the browser, before it is ever uploaded.
 *
 * Three photos straight off a phone are 3-15MB together, and the request body a
 * serverless function will accept is 4.5MB - so the platform rejected the whole
 * submission before any application code ran, and that reached the client as
 * "An unexpected response was received from the server". Downscaling to 1600px
 * on the long edge keeps every detail a progress photo is for and brings a set
 * of three to well under a megabyte.
 *
 * It also decides what the product costs to run. An uncompressed 3MB photo and a
 * 300KB one are the same picture to a coach and a factor of ten to the storage
 * bill; at a thousand clients that is the difference between filling a free
 * tier in three days and in a year.
 *
 * Shared rather than copied. This lived inside the check-in photo inputs, and
 * the food log - which accepts a photograph per meal, with no cadence limit at
 * all - uploaded whatever the camera produced.
 *
 * Never throws and never blocks a submission: any browser that cannot do this
 * gets its original file back, and the size checks around it still stand.
 */
export const MAX_EDGE = 1600;
export const COMPRESS_ABOVE_BYTES = 600 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function shrinkImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_ABOVE_BYTES) return file;
  try {
    // from-image so a portrait photo taken on a phone is not re-encoded on its
    // side: the EXIF orientation is baked into the pixels here and the tag is
    // dropped with the rest of the metadata.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    // If the re-encode did not actually help, the original is the better file.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/**
 * Puts a file back into the input that produced it.
 *
 * The form is submitted by the browser, so a shrunk file has to replace the one
 * the input is holding - React state alone would preview one file and send
 * another.
 */
export function replaceInputFile(input: HTMLInputElement, file: File): void {
  try {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  } catch {
    // A browser without DataTransfer keeps the original selection, which is
    // still a valid submission.
  }
}
