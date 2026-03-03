import { test, expect } from "../fixtures/auth.fixture.js";

test.describe("Administrator login & navigation", () => {
  test("admin button should log in and allow browsing", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#admin-login-btn")).toBeVisible();
    await page.click("#admin-login-btn");

    await page.waitForSelector("#dashboard-page.active");

    const roleText = await page.textContent("#account-type");
    expect(roleText).toBe("ADMIN");

    const greeting = await page.textContent("#user-greeting h3");
    expect(greeting).toContain("Administrator");

    await page.click("#add-item-btn");
    await page.waitForTimeout(500);
    const cartTotal = await page.textContent("#cart-total");
    expect(cartTotal).not.toBe("Total: $0.00");

    await expect(page.locator("#admin-section")).toBeVisible();
  });
});
