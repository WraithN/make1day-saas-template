import { expect, test } from "@playwright/test";

test("buyout checkout posts a plan and navigates to the provider URL", async ({ page }) => {
  // Stub the checkout API so no real gateway is called; assert the request
  // body carries the plan, and that the UI follows the returned provider URL.
  let captured: Record<string, unknown> | null = null;
  await page.route("**/api/checkout", async (route) => {
    captured = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // A same-origin stand-in for the hosted provider page: the assertion
      // that matters is that the UI follows whatever URL the API returns.
      // NOTE: must be a PUBLIC route - /pricing is; /dashboard would bounce
      // through the auth middleware and land on /login?redirect=... instead.
      body: JSON.stringify({ url: "/pricing?paid-session=abc" }),
    });
  });

  await page.goto("/pricing");
  const buyout = page.locator('[data-cta="pricing-buyout"]');
  await expect(buyout).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/pricing\?paid-session=abc/),
    buyout.click(),
  ]);
  expect(captured).toMatchObject({ plan: "buyout" });
});
