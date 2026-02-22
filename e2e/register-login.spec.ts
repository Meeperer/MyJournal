/**
 * E2E: Register new user → Login with that user → See calendar.
 * Run with: npm run test:e2e
 * Requires dev server (or PLAYWRIGHT_BASE_URL). If you hit rate limit (429), wait a minute and retry.
 */
import { test, expect } from "@playwright/test";

test.describe("Register and login flow", () => {
  test("register new user, then login and see calendar", async ({ page }) => {
    const unique = `e2e-${Date.now()}@example.com`;
    const password = "e2e-password-123";

    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /create your journal account/i })).toBeVisible({ timeout: 10000 });

    await page.getByLabel(/^email$/i).fill(unique);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(
      page.getByText(/account created|too many requests/i)
    ).toBeVisible({ timeout: 15000 });
    if (await page.getByText(/too many requests/i).isVisible()) {
      test.skip(true, "Rate limit hit on register; wait ~1 min and re-run E2E");
    }
    await expect(page.getByText(/account created/i)).toBeVisible();

    await page.getByRole("link", { name: /log in/i }).first().click();

    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel(/email/i).fill(unique);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    await page.waitForLoadState("domcontentloaded");
    const calendar = page.locator("section").first();
    await expect(calendar).toBeVisible({ timeout: 10000 });
  });
});
