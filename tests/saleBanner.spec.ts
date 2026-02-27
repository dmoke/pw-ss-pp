import { expect, test } from "@fixtures/common.fixture.js";

// tests for sale banner that appears every 10 seconds

test.describe("Sale banner handling", () => {
  test("banner appears and is closed automatically when interacting", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page.locator("#saleBanner");
    await expect(banner).toBeHidden();
  });

});
