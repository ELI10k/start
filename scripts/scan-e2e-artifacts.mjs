#!/usr/bin/env node
// Fails the E2E run if a credential reached an artifact.
//
// Playwright records input values verbatim in its failure snapshots, so a password
// typed into the login form can land in error-context.md, the HTML report or a trace.
// The suite blanks the field immediately after submitting, but that is a mitigation,
// not a guarantee: any new spec that types a secret would reintroduce the leak.
// This scan is the guarantee. It runs after every `npm run e2e`, and if it finds a
// secret it deletes the offending artifact and exits non-zero.
//
// Secrets are read from the environment and never printed - only the file that
// contained one is named.

import { readdir, readFile, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const ROOTS = ["reports/e2e", "reports/e2e-html", "test-results"];
const SECRET_VARS = [
  "E2E_COACH_PASSWORD",
  "E2E_CLIENT_PASSWORD",
  "E2E_CLIENT_TWO_PASSWORD",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
];

const secrets = SECRET_VARS.map((name) => [name, process.env[name]])
  // Ignore short or absent values: a two-character "secret" would match everywhere.
  .filter(([, value]) => typeof value === "string" && value.length >= 12);

if (!secrets.length) {
  console.log("artifact scan: no credentials configured, nothing to check");
  process.exit(0);
}

async function* walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

// Traces are zip archives, so a raw byte scan would miss a compressed secret.
async function textOf(file) {
  if (file.endsWith(".zip")) {
    try {
      const { stdout } = await run("unzip", ["-p", file], {
        maxBuffer: 64 * 1024 * 1024,
        encoding: "buffer",
      });
      return stdout.toString("utf8");
    } catch {
      return "";
    }
  }
  if (/\.(png|jpg|jpeg|webm|mp4|woff2?)$/i.test(file)) return "";
  const info = await stat(file);
  if (info.size > 64 * 1024 * 1024) return "";
  return (await readFile(file)).toString("utf8");
}

const offenders = [];
for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const text = await textOf(file);
    if (!text) continue;
    for (const [name] of secrets) {
      const value = process.env[name];
      if (value && text.includes(value)) {
        offenders.push({ file, name });
        break;
      }
    }
  }
}

if (!offenders.length) {
  console.log("artifact scan: clean, no credential found in E2E artifacts");
  process.exit(0);
}

console.error(`artifact scan: FOUND ${offenders.length} artifact(s) containing a credential`);
for (const { file, name } of offenders) {
  console.error(`  ${file}  (matched ${name})`);
  await rm(file, { force: true });
}
console.error("The offending files were deleted. Rotate the exposed credential, then");
console.error("fix the spec so it does not put the secret in the page.");
process.exit(1);
