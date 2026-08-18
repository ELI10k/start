// Runs one .sql file against the linked Supabase project and records what came
// back, so a migration step leaves evidence rather than a scrollback.
//
//   node scripts/run-supabase-sql.mjs <path-to.sql> [path-to-output.json]
//
// The file is sent as a single request, which means a file that opens with
// begin; and closes with commit; or rollback; is one transaction on the server.
// Output goes to backups/coach-report-versions/<name>.out.json unless a second
// path is given. Nothing here decides what to run: the SQL file is the decision.

import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resolve = (path) => (isAbsolute(path) ? path : join(root, path));

const [sqlArg, outArg] = process.argv.slice(2);
if (!sqlArg) {
  console.error("usage: node scripts/run-supabase-sql.mjs <path-to.sql> [path-to-output.json]");
  process.exit(2);
}

const sqlPath = resolve(sqlArg);
const outPath = outArg
  ? resolve(outArg)
  : join(root, "backups/coach-report-versions", `${basename(sqlPath, ".sql")}.out.json`);

await access(sqlPath);

const run = () =>
  new Promise((done) => {
    // --file rather than the positional argument: a SQL file that opens with a
    // comment looks like a flag to the CLI's parser.
    const child = spawn(
      "npx",
      ["--yes", "supabase@latest", "db", "query", "--linked", "--workdir", root, "--file", sqlPath],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => done({ code, stdout, stderr }));
  });

const started = new Date().toISOString();
const result = await run();
const finished = new Date().toISOString();

const record = {
  sqlFile: sqlPath.slice(root.length + 1),
  startedAt: started,
  finishedAt: finished,
  exitCode: result.code,
  stdout: result.stdout.trim(),
  stderr: result.stderr.trim(),
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(record, null, 2)}\n`);

console.log(`sql:   ${record.sqlFile}`);
console.log(`exit:  ${record.exitCode}`);
if (record.stdout) console.log(`stdout:\n${record.stdout}`);
if (record.stderr) console.log(`stderr:\n${record.stderr}`);
console.log(`\nwrote ${outPath}`);

// A dry-run is expected to fail: it ends by raising, and that is the point.
// The caller reads the record, not the exit code.
