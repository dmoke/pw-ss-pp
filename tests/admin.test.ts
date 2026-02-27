import { test, expect } from "../fixtures/auth.js";

// simple smoke test for admin login and browsing capabilities

test.describe("Administrator login & navigation", () => {
  test("admin button should log in and allow browsing", async ({ page }) => {
    await page.goto("/");

    // admin button should be present
    await expect(page.locator("#admin-login-btn")).toBeVisible();
    await page.click("#admin-login-btn");

    // after clicking we should arrive at dashboard
    await page.waitForSelector("#dashboard-page.active");

    const roleText = await page.textContent("#account-type");
    expect(roleText).toBe("ADMIN");

    const greeting = await page.textContent("#user-greeting h3");
    expect(greeting).toContain("Administrator");

    // admin should be able to interact with the site like other users
    await page.click("#add-item-btn");
    const cartTotal = await page.textContent("#cart-total");
    expect(cartTotal).not.toBe("Total: $0.00");

    // ensure admin panel section is visible
    await expect(page.locator("#admin-section")).toBeVisible();
  });
});
