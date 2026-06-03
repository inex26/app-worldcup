import { defineConfig } from "@playwright/test";

/**
 * Responsive smoke tests — the mobile bar, enforced.
 *
 * Boots the app and exercises key routes at a real phone width, asserting no horizontal overflow and
 * that interactive elements stay on-screen. Runs in CI on every PR AND locally via `npm run test:e2e`,
 * so it's part of "done means green". This is the gate that catches "cut off / not centered on mobile"
 * bugs that a code-only review (or a coding agent that never renders the page) will always miss.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  // A small-phone viewport (375px) — the width where overflow / clipped-modal bugs surface.
  projects: [{ name: "mobile", use: { viewport: { width: 375, height: 812 } } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Supabase config so the browser client constructs (the share test mocks its network at the
    // browser level). The URL points at a dead local port so the SERVER-side middleware getUser()
    // — which Playwright can't intercept — fails instantly instead of hanging on DNS.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9999",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
    },
  },
});
