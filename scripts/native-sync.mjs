// The one command to run before opening Xcode.
//
//   START_NATIVE_SERVER_URL=https://<deployment> node scripts/native-sync.mjs
//
// `npx cap sync` on its own is not enough, twice over:
//
//   - It rewrites nothing in project.pbxproj, so this repo's own Swift files -
//     the health plugin and the view controller that registers it - stay out of
//     the target unless they are re-registered. A plugin missing from the build
//     phase fails silently: window.StartHealth never appears and the steps card
//     reports "no health store on this device", which looks exactly like a phone
//     with HealthKit switched off.
//   - The entitlements wiring is likewise project state that sync does not own.
//
// Both registration scripts are idempotent, so this is safe to run as often as
// you like. It also refuses to leave the shell pointed at nothing by accident.

import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const step = async (label, command, args) => {
  process.stdout.write(`${label}… `);
  try {
    const { stdout, stderr } = await run(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    const output = `${stdout}${stderr}`;
    if (/\[error\]/i.test(output)) {
      console.log("failed");
      console.error(output.trim());
      process.exit(1);
    }
    console.log("ok");
    return output;
  } catch (cause) {
    console.log("failed");
    console.error(cause.stdout ?? "");
    console.error(cause.stderr ?? cause.message);
    process.exit(1);
  }
};

const serverUrl = process.env.START_NATIVE_SERVER_URL;
console.log(serverUrl
  ? `shell will load ${serverUrl}`
  : "START_NATIVE_SERVER_URL is unset: the shell will fall back to the offline page in native/www");

await step("cap sync", "npx", ["cap", "sync"]);
await step("register swift sources", "node", ["scripts/register-ios-sources.mjs"]);
await step("register entitlements", "node", ["scripts/register-ios-entitlements.mjs"]);

// Report what the build is actually pinned to, because a TestFlight archive
// pointed at a Preview URL is the easiest mistake here to make and the hardest
// to notice afterwards.
const synced = JSON.parse(await readFile(join(root, "ios/App/App/capacitor.config.json"), "utf8"));
console.log(`\nios bundle id : ${synced.appId}`);
console.log(`ios app name  : ${synced.appName}`);
console.log(`server url    : ${synced.server?.url ?? "(none - offline fallback page)"}`);
