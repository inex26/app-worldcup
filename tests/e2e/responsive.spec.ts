import { test, expect, type Page } from "@playwright/test";

/**
 * The mobile bar. Every key route/state must FIT A PHONE:
 *   1. no horizontal overflow (the page never scrolls sideways), and
 *   2. every button/link stays fully on-screen.
 *
 * Add each new user-facing route/overlay here as the app grows. This is the regression net for the
 * whole class of "cut off / not centered on mobile" bugs.
 */

/** Assert the document doesn't scroll sideways at the current viewport. */
async function expectNoHorizontalOverflow(page: Page, where: string) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    `${where} scrolls horizontally on mobile (content ${scrollWidth}px > viewport ${clientWidth}px). ` +
      "Common causes: a fixed/explicit width, a non-wrapping string (long URL, email, code), or a " +
      "content-sized grid/flex track. Fix with max-width:100%, min-width:0, overflow-wrap:anywhere, " +
      "or grid-template-columns:minmax(0,1fr) — never a magic pixel width.",
  ).toBeLessThanOrEqual(clientWidth + 1); // +1 absorbs sub-pixel rounding
}

/** Assert no button/link spills outside the viewport. */
async function expectControlsInViewport(page: Page, where: string) {
  const vw = page.viewportSize()!.width;
  const offenders = await page.evaluate((vw) => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll("button, a, [role='button']"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // skip hidden
      if (r.right > vw + 1 || r.left < -1) {
        bad.push((el.textContent || el.tagName).trim().slice(0, 40) || "<unlabeled>");
      }
    }
    return bad;
  }, vw);
  expect(offenders, `${where}: controls spilling outside the phone viewport: ${offenders.join(", ")}`).toEqual([]);
}

// Routes that render without a backend session (forms / landing). Drive backend-gated states in
// their own test (see the share modal below).
const ROUTES = ["/", "/create", "/join"];

for (const path of ROUTES) {
  test(`fits the phone: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(page, path);
    await expectControlsInViewport(page, path);
  });
}

/**
 * The post-creation SHARE state (the modal in the bug report). It only renders after a successful
 * `createLeague`, which talks to Supabase — so we mock Supabase at the browser network layer and drive
 * the create form. The invite URL is long and non-wrapping; if the card/centering isn't responsive it
 * overflows and clips off the right edge, exactly as reported. This test reproduces that and locks the fix.
 */
test("fits the phone: create → share invite modal", async ({ page }) => {
  const LONG_TOKEN = "Jw3kQ9bX2vL8mN4pR7sT1uV5wY0zA6cD2eF4gH8iJ0kL3mN6pQ9rS2tU5vW8xZ";
  const FAKE_USER = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: null,
    app_metadata: { provider: "anonymous", providers: ["anonymous"] },
    user_metadata: {},
    identities: [],
    is_anonymous: true,
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
  const FAKE_LEAGUE = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Vasco",
    invite_code: "ABC234",
    invite_token: LONG_TOKEN,
  };
  const json = (body: unknown) => ({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

  // Anonymous sign-in + getUser.
  await page.route("**/auth/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/signup") || url.includes("/token")) return route.fulfill(json(FAKE_SESSION));
    if (url.includes("/user")) return route.fulfill(json(FAKE_USER));
    return route.fulfill(json({}));
  });
  // Any other table read (membership lookup, members list) → empty. Registered first so the
  // specific create_league route below takes precedence (Playwright runs routes last-added-first).
  await page.route("**/rest/v1/**", (route) => route.fulfill(json([])));
  // create_league RPC returns the new league row (with the long invite token).
  await page.route("**/rest/v1/rpc/create_league*", (route) => route.fulfill(json(FAKE_LEAGUE)));

  await page.goto("/create", { waitUntil: "networkidle" });
  await page.getByLabel("League name").fill("Vasco");
  await page.getByLabel("Your display name").fill("Vasco");
  await page.getByRole("button", { name: "Create league" }).click();

  // Wait for the share state (the invite URL is what overflows).
  await expect(page.getByText(`/join/${LONG_TOKEN}`)).toBeVisible();

  await expectNoHorizontalOverflow(page, "create → share modal");
  await expectControlsInViewport(page, "create → share modal");
});
