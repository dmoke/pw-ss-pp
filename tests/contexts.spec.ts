import { expect, test } from "@fixtures/common.fixture.js";

await test.beforeEach(async ({}) => {
  console.log("Running before each...");
});


test.describe("Playwright Context Examples", () => {
  
  // 1. Browser Context Configuration
  test("example test with browser context", async ({ page, context }) => {
    // Configure browser context
    const browserContext = await context.global().launch({
      headless: false,
      slowMo: 1000
    });

    // Use the context in tests
    const page = await browserContext.newPage();
    await page.goto("https://example.com");
    await expect(page).toHaveTitle(/Example/);
  });

  // 2. Device Emulation
  test("test with mobile emulation", async ({ page, context }) => {
    // Configure mobile emulation
    const mobileEmulation = {
      deviceName: 'iPhone 13'
    };

    // Create context with emulation
    const mobileContext = await context.global().newContext({
      emulation: mobileEmulation
    });

    // Use the mobile context
    const page = await mobileContext.newPage();
    await page.goto("https://example.com");
  });

  // 3. Authentication
  test("test with authentication", async ({ page, context }) => {
    // Configure context with authentication
    const authContext = await context.global().newContext({
      extraHTTPHeaders: { Cookie: 'session=abc123' }
    });

    // Use the authenticated context
    const page = await authContext.newPage();
    await page.goto("https://example.com/dashboard");
  });

  // 4. Context Reuse
  test("test with context reuse", async ({ page, context }) => {
    // Create a shared context
    const sharedContext = await context.global().newContext();

    // Use the shared context across multiple pages
    const page1 = await sharedContext.newPage();
    const page2 = await sharedContext.newPage();

    // Perform actions with both pages
  });

})
  const context1 = await context.browser().newContext();
  const context2 = await context.browser().newContext();
  const page1 = await context1.newPage();
  
  // const page3 = context2.off();

  console.log("Running staff in test before using calc");

  const result = calculator(2, 3);
  expect(result).toBe(5);
});

test("test pages", async ({ guestPages: { loginPage }, page }) => {
  await loginPage.navigate();

  expect(page.url()).toBe("http://localhost:3000/");
});

await test.afterEach(async () => {
  console.log("Running after each...");
});

await test.afterAll(async () => {
  console.log("Running after all...");
});

test("Page title is correct", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Welcome to Playwright/);
});

test("User can log in", async ({ guestPages: { loginPage } }) => {
  await loginPage.navigate();
  await loginPage.login("testuser", "password123");
  await loginPage.waitForLoginSuccess();
  await loginPage.assertLoggedIn();
});
