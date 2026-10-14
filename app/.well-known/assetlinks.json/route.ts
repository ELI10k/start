import { NextResponse } from "next/server";
import { PACKAGE_NAME, androidFingerprints } from "@/lib/native/assetlinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Android App Links - the Android half of what apple-app-site-association does.
//
// A magic-link email tapped on an Android phone opens in the browser, so the
// session would land in the browser's cookies and the app would stay signed
// out. With this file served and the autoVerify intent filter in the manifest,
// Android opens https://<domain>/auth/confirm-link in LIFE FIT instead, and the
// bridge exchanges the token inside the web view. Which certificates are
// trusted is in lib/native/assetlinks.ts.
export async function GET() {
  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: androidFingerprints(),
        },
      },
    ],
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=300",
      },
    },
  );
}
