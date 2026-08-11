// Points the iOS target at App/App.entitlements, and adds the file to the
// project navigator.
//
//   node scripts/register-ios-entitlements.mjs
//
// Without CODE_SIGN_ENTITLEMENTS the file on disk is inert: push registration
// then fails at runtime rather than at build time, and HealthKit returns no
// steps however the permission dialog is answered. Wiring it here means Xcode
// only needs the team selected, rather than the capabilities added by hand.
//
// Idempotent. If signing ever complains about the capabilities before the App ID
// has them, deleting the two CODE_SIGN_ENTITLEMENTS lines reverts this exactly.

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pbxprojPath = join(root, "ios/App/App.xcodeproj/project.pbxproj");
const ENTITLEMENTS = "App.entitlements";

let project = await readFile(pbxprojPath, "utf8");

// A file reference so the file is visible in Xcode. Entitlements are not
// compiled or copied, so it needs no build phase membership.
if (!project.includes(`/* ${ENTITLEMENTS} */`)) {
  const fileRef = createHash("sha1").update(`start:ref:${ENTITLEMENTS}`).digest("hex").slice(0, 24).toUpperCase();
  project = project.replace(
    /(\/\* Begin PBXFileReference section \*\/\n)/,
    `$1\t\t${fileRef} /* ${ENTITLEMENTS} */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = ${ENTITLEMENTS}; sourceTree = "<group>"; };\n`,
  );
  project = project.replace(
    /(504EC3131FED79650016851F \/\* Info\.plist \*\/,\n)/,
    `$1\t\t\t\t${fileRef} /* ${ENTITLEMENTS} */,\n`,
  );
}

// Both configurations - a Debug build that cannot register for push is just as
// broken as a Release one.
const before = project;
project = project.replaceAll(
  /(\n\t{4}CODE_SIGN_STYLE = Automatic;)/g,
  "\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;$1",
);
// Guard against a re-run doubling the setting.
project = project.replaceAll(
  /(CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;\n\t{4})+(CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;)/g,
  "$2",
);

if (project !== before || project !== await readFile(pbxprojPath, "utf8")) {
  await writeFile(pbxprojPath, project);
}

const wired = (project.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) ?? []).length;
const listed = project.includes(`/* ${ENTITLEMENTS} */`);
console.log(`entitlements referenced in project: ${listed}`);
console.log(`build configurations wired: ${wired}`);
process.exit(listed && wired === 2 ? 0 : 1);
