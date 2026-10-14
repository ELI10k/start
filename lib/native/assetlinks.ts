// Android App Links: which signing certificates may open LIFE FIT links.
//
// Android only trusts the link for an app signed with a certificate listed
// here. Google Play re-signs what it ships with its own app signing key (Play
// Console -> App integrity -> App signing); the upload key signs local and
// sideloaded builds. ANDROID_SHA256_CERT_FINGERPRINTS can add more without a
// code change. Fingerprints are public certificate hashes, not secrets.
export const PACKAGE_NAME = "co.il.startcoaching.app";
const PLAY_APP_SIGNING_SHA256 =
  "AD:07:58:EA:F7:B6:97:13:E9:1A:AB:AD:3A:00:98:38:8D:B0:1D:D2:90:27:5C:79:22:9A:66:36:17:D8:99:56";
const UPLOAD_KEY_SHA256 =
  "37:D8:01:4C:2E:1B:C3:77:49:97:9E:B9:96:B9:57:64:E0:E1:D6:0F:A5:D4:D5:AE:D3:B5:FB:C7:4E:BA:8E:55";
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function androidFingerprints(extra = process.env.ANDROID_SHA256_CERT_FINGERPRINTS): string[] {
  const configured = (extra ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => FINGERPRINT.test(value));
  return [...new Set([PLAY_APP_SIGNING_SHA256, UPLOAD_KEY_SHA256, ...configured])];
}

