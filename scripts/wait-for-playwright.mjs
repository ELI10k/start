// Blocks until no `playwright test` process remains, then prints how many
// failure artifact directories the run left behind.
//
//   node scripts/wait-for-playwright.mjs
//
// Exists so waiting for a long E2E run is one plain command rather than an
// inline shell loop.

import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = join(root, "reports/e2e");

const stillRunning = async () => {
  try {
    const { stdout } = await run("pgrep", ["-f", "playwright test"]);
    return stdout.trim().length > 0;
  } catch {
    // pgrep exits non-zero when nothing matches.
    return false;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deadline = Date.now() + 45 * 60 * 1000;
while (await stillRunning()) {
  if (Date.now() > deadline) {
    console.log("still running after 45 minutes; giving up on waiting");
    process.exit(2);
  }
  await sleep(15_000);
}

let failures = [];
try {
  failures = await readdir(artifacts);
} catch {
  failures = [];
}
console.log(`playwright finished; ${failures.length} failure artifact directories`);
for (const name of failures) console.log(`  ${name}`);
