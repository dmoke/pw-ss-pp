import { expect, test } from "@fixtures/common.fixture.js";


test.describe("Sale banner handling", () => {
  test("banner appears and is auto-closed via locator handler", async ({
    page,
  }) => {
    await page.goto("/");
    const banner = page.locator("#saleBanner");
    await expect(banner).toBeHidden();
  });

  test.describe("with handlers disabled via flag", () => {
    test.use({ disableHandlers: true });
    test("banner stays visible when disableHandlers fixture flag is set", async ({
      page,
    }) => {
      await page.goto("/");
      const banner = page.locator("#saleBanner");
      await page.waitForSelector("#saleBanner", { timeout: 5000 });
      await expect(banner).toBeVisible();
      await page.click("body");
      await expect(banner).toBeVisible();
    });
  });
});
