import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Local E2E config: public Supabase values plus any credentials the operator exports.
loadEnv({ path: ".env.e2e", quiet: true });

// E2E runs against a local dev server by default. That avoids Vercel's preview SSO
// gate and keeps the run reproducible. Point E2E_BASE_URL at a Preview deployment to
// exercise a real deployment instead - never at Production, which specs assert.
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const usingLocalServer = baseURL.startsWith("http://127.0.0.1") || baseURL.startsWith("http://localhost");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./reports/e2e",
  // Serial by default: the suite shares one Supabase project with Production, so
  // parallel writes from several workers would interleave on the same test accounts.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "reports/e2e-html", open: "never" }]],
  use: {
    baseURL,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    // Everything needed to diagnose a failure without re-running it.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // The iPhone descriptor defaults to WebKit, which is not installed; only the
    // viewport, touch and user-agent parts matter here, so run it on Chromium.
    { name: "chromium-mobile", use: { ...devices["iPhone 13"], browserName: "chromium", defaultBrowserType: "chromium" } },
  ],
  webServer: usingLocalServer
    ? {
        command: "npm run dev -- --port 3100",
        env: { ...process.env } as Record<string, string>,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
    : undefined,
});
