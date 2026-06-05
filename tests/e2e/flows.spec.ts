import { test, expect, type Page } from "@playwright/test";

/**
 * Behavioral flow tests — exercise the real navigation paths (not just overflow), with Supabase
 * mocked at the network layer. These catch the "navigation after create" bug class and double as
 * responsive checks for the auth-gated routes (they run at the 375px project viewport).
 */

const FAKE_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "vasco@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { display_name: "Vasco" },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
const FAKE_SESSION = {
  access_token: "e2e-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "e2e-refresh-token",
  user: FAKE_USER,
};
const TOKEN = "Jw3kQ9bX2vL8mN4pR7sT1uV5wY0zA6cD2eF4gH8iJ0kL3mN6pQ9rS2tU5vW8xZ";
const LEAGUE = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Vasco",
  invite_code: "ABC234",
  invite_token: TOKEN,
};
const MEMBER = { user_id: FAKE_USER.id, display_name: "Vasco", joined_at: new Date().toISOString() };

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

/** PostgREST returns a single object (not an array) when the client asks via this Accept header. */
const wantsSingle = (route: { request(): { headers(): Record<string, string> } }) =>
  (route.request().headers()["accept"] || "").includes("vnd.pgrst.object");

/**
 * Mock Supabase so the app behaves as "signed in, member of one league, no predictions".
 * Routes are registered catch-all FIRST so the specific handlers (added after) win.
 */
async function mockSupabase(page: Page) {
  await page.route("**/rest/v1/**", (r) => r.fulfill(json([])));
  await page.route("**/rest/v1/predictions*", (r) => r.fulfill(json([])));
  await page.route("**/rest/v1/leagues*", (r) => r.fulfill(json(wantsSingle(r) ? LEAGUE : [LEAGUE])));
  await page.route("**/rest/v1/league_members*", (r) =>
    r.fulfill(json(wantsSingle(r) ? MEMBER : [MEMBER])),
  );
  await page.route("**/rest/v1/rpc/create_league*", (r) => r.fulfill(json(LEAGUE)));
  await page.route("**/rest/v1/rpc/join_league_by_token*", (r) => r.fulfill(json(LEAGUE)));
  await page.route("**/auth/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/signup") || url.includes("/token")) return route.fulfill(json(FAKE_SESSION));
    if (url.includes("/user")) return route.fulfill(json(FAKE_USER));
    return route.fulfill(json({})); // /recover and the rest
  });
}

async function expectNoHorizontalOverflow(page: Page, where: string) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw, `${where}: page scrolls horizontally (${sw}px > ${cw}px)`).toBeLessThanOrEqual(cw + 1);
}

// ── Signed-out guards: app routes bounce to the landing page ──────────────────
for (const path of ["/predictions", "/leaderboard", "/leagues"]) {
  test(`signed-out ${path} redirects to landing`, async ({ page }) => {
    await page.goto(path);
    await page.waitForURL((u) => new URL(u).pathname === "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("landing has no skip-to-content link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("a.skip-link")).toHaveCount(0);
});

test("sign in → forgot password → reset page", async ({ page }) => {
  await page.goto("/signin");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL(/\/reset$/);
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("password reset request shows confirmation", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/reset");
  await page.getByLabel("Email").fill("vasco@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

// ── The three product flows all land on /predictions ─────────────────────────
test("create a league → lands on predictions (no overflow)", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/create");
  await page.getByLabel("League name").fill("Vasco");
  await page.getByLabel("Username").fill("Vasco");
  await page.getByLabel("Email").fill("vasco@example.com");
  await page.getByLabel("Password").fill("hunter22xyz");
  await page.getByRole("button", { name: "Create league" }).click();
  await page.getByRole("link", { name: "Go to predictions" }).click();

  await expect(page).toHaveURL(/\/predictions$/);
  await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "predictions after create");
});

test("join via pasted invite link → lands on predictions", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/join");
  await page.getByLabel("Invite link").fill(`https://e2e.test/join/${TOKEN}`);
  await page.getByLabel("Username").fill("Vasco");
  await page.getByLabel("Email").fill("vasco@example.com");
  await page.getByLabel("Password").fill("hunter22xyz");
  await page.getByRole("button", { name: "Join league" }).click();

  await expect(page).toHaveURL(/\/predictions$/);
  await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();
});

test("sign in → lands on predictions", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/signin");
  await page.getByLabel("Email").fill("vasco@example.com");
  await page.getByLabel("Password").fill("hunter22xyz");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/predictions$/);
  await expect(page.getByRole("heading", { name: "Predictions" })).toBeVisible();
});
