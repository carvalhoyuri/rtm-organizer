import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, CURADOR_CODE, INVITE_CODE, PORT, SESSION_SECRET, TEST_DATABASE_URL } from "./e2e/env";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Single worker: tests share one SQLite file through the webServer, and this
  // is a small smoke suite — not worth the extra complexity of parallelizing it.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      INVITE_CODE,
      CURADOR_CODE,
      SESSION_SECRET,
    },
  },
});
