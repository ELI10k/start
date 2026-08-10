// Boots `next dev` with the E2E environment loaded, the same way the Playwright
// config does. Used for manual QA against real test accounts on a local server,
// because Preview deployments sit behind Vercel's SSO gate.
//
//   node scripts/dev-e2e.mjs [--port 3100]
//
// Resolves the project root from its own location, so it can be launched from
// any working directory. It never reads or prints a credential; dotenv puts them
// straight into the child process environment.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
loadEnv({ path: join(root, ".env.e2e"), quiet: true });

const portFlag = process.argv.indexOf("--port");
const port = portFlag >= 0 ? process.argv[portFlag + 1] : "3100";

const child = spawn("npx", ["next", "dev", "--port", port], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
