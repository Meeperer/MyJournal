/**
 * E2E: Login → Calendar → Click date → Type entry → Save → Toast & overview.
 * Run with: npx playwright test
 * Requires dev server (or set PLAYWRIGHT_BASE_URL) and test user (E2E_USER_EMAIL, E2E_USER_PASSWORD).
 */
import { test, expect } from "@playwright/test";

test.describe("Journal save flow", () => {
  test("login, open entry, save, see toast and loading state", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    test.skip(!email || !password, "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set");
    const emailVal = email ?? "";
    const passwordVal = password ?? "";

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(emailVal);
    await page.getByLabel(/password/i).fill(passwordVal);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page).not.toHaveURL(/\/login/);
    await page.waitForLoadState("domcontentloaded");

    const calendar = page.locator("section").first();
    await expect(calendar).toBeVisible({ timeout: 10000 });

    const firstDay = page.locator("button").filter({ hasText: /^1$/ }).first();
    await firstDay.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const textarea = page.getByPlaceholder(/what's on your mind|write your journal/i);
    await textarea.fill("E2E test entry for today.");
    const saveBtn = page.getByRole("button", { name: /save entry/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(saveBtn).toContainText(/processing/i, { timeout: 2000 });
    await expect(page.getByText("Entry saved successfully.")).toBeVisible({ timeout: 15000 });
  });
});
