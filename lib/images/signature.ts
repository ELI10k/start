/**
 * Is this file actually the picture it says it is?
 *
 * Both photo validators read `file.type`, which is the Content-Type the browser
 * attached to the part - a value the person uploading chooses. The storage
 * bucket enforces its own MIME allowlist and the upload is stored with an
 * explicit contentType, so an HTML file wearing an image/jpeg label was never
 * going to execute in anybody's browser. This closes the gap one layer earlier:
 * a file whose first bytes are not an image never reaches storage at all.
 *
 * Only the three formats the product accepts are recognised. Anything else -
 * including a file too short to carry a header - is refused, because "I could
 * not tell" and "this is not an image" have the same right answer here.
 */

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// WebP is a RIFF container: "RIFF" then four length bytes then "WEBP".
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

export type ImageFormat = "image/jpeg" | "image/png" | "image/webp";

/** The format the bytes actually are, or null when they are not one of the three. */
export function imageFormatFromBytes(bytes: Uint8Array): ImageFormat | null {
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (startsWith(bytes, PNG)) return "image/png";
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) return "image/webp";
  return null;
}

/**
 * Reads the first bytes of an upload and reports what it really is.
 *
 * Twelve bytes is all any of the three signatures needs, so this never pulls a
 * five-megabyte photograph into memory to answer the question.
 */
export async function detectImageFormat(file: Blob): Promise<ImageFormat | null> {
  try {
    const header = await file.slice(0, 12).arrayBuffer();
    return imageFormatFromBytes(new Uint8Array(header));
  } catch {
    return null;
  }
}
