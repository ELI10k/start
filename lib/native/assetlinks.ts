// Android App Links: which signing certificates may open LIFE FIT links.
//
// Android only trusts the link for an app signed with a certificate listed
// here. The upload key signs local and sideloaded builds; Google Play re-signs
// what it ships with its own app signing key, whose SHA-256 (Play Console ->
// Test and release -> App integrity) goes in ANDROID_SHA256_CERT_FINGERPRINTS.
// Fingerprints are public certificate hashes, not secrets.
export const PACKAGE_NAME = "co.il.startcoaching.app";
const UPLOAD_KEY_SHA256 =
  "37:D8:01:4C:2E:1B:C3:77:49:97:9E:B9:96:B9:57:64:E0:E1:D6:0F:A5:D4:D5:AE:D3:B5:FB:C7:4E:BA:8E:55";
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function androidFingerprints(extra = process.env.ANDROID_SHA256_CERT_FINGERPRINTS): string[] {
  const configured = (extra ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => FINGERPRINT.test(value));
  return [...new Set([UPLOAD_KEY_SHA256, ...configured])];
}

