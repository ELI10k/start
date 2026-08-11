// Adds this project's own Swift files to the iOS target.
//
//   node scripts/register-ios-sources.mjs
//
// The Capacitor template's project.pbxproj lists every source file explicitly,
// and `npx cap sync` does not add app-local files to it. A Swift file sitting in
// ios/App/App that is not in the Sources build phase simply is not compiled -
// and for a Capacitor plugin that failure is silent and misleading: the plugin
// never registers, the web layer sees window.StartHealth missing, and the steps
// card reports "no health store on this device", which is indistinguishable from
// a phone with HealthKit switched off.
//
// Idempotent: a file already registered is left alone, so this is safe to re-run
// after `cap sync` or after adding another source file to the list.

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pbxprojPath = join(root, "ios/App/App.xcodeproj/project.pbxproj");

// Every Swift file this repository owns inside the App target.
const SOURCES = ["StartHealthPlugin.swift", "StartViewController.swift"];

// Xcode identifiers are 24 uppercase hex characters. Deriving them from the file
// name keeps a re-run stable and avoids colliding with the template's own ids,
// which all begin with digits from the original project.
const identifier = (seed) => createHash("sha1").update(`start:${seed}`).digest("hex").slice(0, 24).toUpperCase();

let project = await readFile(pbxprojPath, "utf8");
const added = [];
const skipped = [];

for (const name of SOURCES) {
  if (project.includes(`/* ${name} */`)) {
    skipped.push(name);
    continue;
  }

  const fileRef = identifier(`ref:${name}`);
  const buildFile = identifier(`build:${name}`);

  // 1. PBXBuildFile: the file as a member of a build phase.
  project = project.replace(
    /(\/\* Begin PBXBuildFile section \*\/\n)/,
    `$1\t\t${buildFile} /* ${name} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRef} /* ${name} */; };\n`,
  );

  // 2. PBXFileReference: the file on disk.
  project = project.replace(
    /(\/\* Begin PBXFileReference section \*\/\n)/,
    `$1\t\t${fileRef} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${name}; sourceTree = "<group>"; };\n`,
  );

  // 3. The App group, so it appears in the navigator next to AppDelegate.
  project = project.replace(
    /(504EC3071FED79650016851F \/\* AppDelegate\.swift \*\/,\n)/,
    `$1\t\t\t\t${fileRef} /* ${name} */,\n`,
  );

  // 4. The Sources build phase, which is what actually compiles it.
  project = project.replace(
    /(504EC3081FED79650016851F \/\* AppDelegate\.swift in Sources \*\/,\n)/,
    `$1\t\t\t\t${buildFile} /* ${name} in Sources */,\n`,
  );

  added.push(name);
}

if (added.length) await writeFile(pbxprojPath, project);

// Verify rather than trust the replacements: each source must end up in both the
// file reference list and the Sources phase.
let ok = true;
for (const name of SOURCES) {
  const declared = project.includes(`path = ${name};`);
  const compiled = project.includes(`/* ${name} in Sources */,`);
  if (!declared || !compiled) {
    ok = false;
    console.error(`${name}: declared=${declared} compiled=${compiled}`);
  } else {
    console.log(`${name}: registered`);
  }
}

if (added.length) console.log(`added ${added.length}`);
if (skipped.length) console.log(`already present: ${skipped.join(", ")}`);
process.exit(ok ? 0 : 1);
