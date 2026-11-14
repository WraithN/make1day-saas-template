import { expect, type Page } from "@playwright/test";

/** Enter through the real "demo" affordance on /login (locale-independent:
 *  the button's accessible name embeds the demo account email). */
export async function demoLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /demo@example\.com/ }).click();
  await page.waitForURL(/\/account/);
}
