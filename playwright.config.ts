import { defineConfig, devices } from "@playwright/test";

/**
 * Responsive e2e gate. Boots the app and drives real screens at mobile
 * viewports to catch layout regressions (overflow, off-screen/clipped UI) that
 * unit tests can't see. Supabase is network-mocked inside the specs, so the
 * placeholder env below just needs to be well-formed.
 */
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
