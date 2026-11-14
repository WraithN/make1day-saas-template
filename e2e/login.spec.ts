import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

test("protected dashboard requires auth; demo login unlocks it", async ({ page }) => {
  // Unauthenticated: middleware redirects /dashboard to /login.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);

  // Demo login through the real affordance on /login.
  await demoLogin(page);
  await expect(page).toHaveURL(/\/account/);
  // The overview structure renders ("User ID" row label is language-neutral).
  // Dev-demo sessions have no email row server-side; asserting the URL + the
  // console table structure keeps the test honest about what's guaranteed.
  await expect(page.getByText("User ID")).toBeVisible();

  // Now the protected dashboard is reachable.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
});
