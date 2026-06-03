import { test, expect, type Page } from "@playwright/test";

/**
 * Responsive regression: the post-creation "share" view on /create.
 *
 * Regression — the share card overflowed horizontally on mobile: grid sized the
 * centering column to the non-wrapping invite URL's max-content, so the card was
 * wider than the screen and ran off the right edge (cut off, not centered).
 */

// A realistic, long invite token — this is what makes the share URL non-wrapping
// and wide enough to blow out the layout if the column isn't constrained.
const TOKEN = "b3f1c2a4d5e6f7081920aabbccddeeff00112233445566778899aabbccddeeff";
const LEAGUE = {
  id: "L1",
  name: "Office World Cup 2026",
  invite_code: "ABC123",
  invite_token: TOKEN,
};

/** Stub every Supabase call so we can reach the share screen without a backend. */
async function mockSupabase(page: Page) {
  await page.route("**/auth/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/user")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "u1", email: null, aud: "authenticated" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "a",
        refresh_token: "r",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 9999999999,
        user: { id: "u1", email: null, aud: "authenticated" },
      }),
    });
  });
  await page.route("**/rest/v1/rpc/create_league**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LEAGUE) }),
  );
  await page.route("**/rest/v1/league_members**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ user_id: "u1", display_name: "Sam", joined_at: "2026-01-01" }]),
    }),
  );
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
}

/** Create a league and land on the share view. */
async function gotoShareView(page: Page) {
  await mockSupabase(page);
  await page.goto("/create");

  const leagueName = page.getByLabel("League name");
  await leagueName.click();
  await leagueName.pressSequentially(LEAGUE.name);

  const displayName = page.getByLabel("Your display name");
  await displayName.click();
  await displayName.pressSequentially("Sam");

  await page.getByRole("button", { name: /create league/i }).click();
  await expect(page.locator(".invite-link")).toBeVisible();
}

const VIEWPORTS = [
  { name: "iPhone-ish 390x844", width: 390, height: 844 },
  { name: "small 320x568", width: 320, height: 568 },
];

for (const vp of VIEWPORTS) {
  test.describe(`share view @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("fits the viewport without horizontal overflow and stays centered", async ({ page }) => {
      await gotoShareView(page);
      await page.evaluate(() => window.scrollTo(0, 0));

      // No horizontal scroll: the page never grows wider than the viewport.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      // The card sits fully inside the viewport, with symmetric gutters (centered).
      const box = await page.locator(".card").boundingBox();
      expect(box).not.toBeNull();
      const { x, width } = box!;
      const leftGutter = x;
      const rightGutter = vp.width - (x + width);
      expect(leftGutter).toBeGreaterThanOrEqual(0);
      expect(rightGutter).toBeGreaterThanOrEqual(0);
      expect(Math.abs(leftGutter - rightGutter)).toBeLessThanOrEqual(1);
    });
  });
}
