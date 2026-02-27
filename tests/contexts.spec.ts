import { expect, test } from "@fixtures/common.fixture.js";
import { devices } from "@playwright/test";

// basic lifecycle hooks used in tutorials
test.beforeEach(async () => {
  console.log("beforeEach hook");
});

test.afterEach(async () => {
  console.log("afterEach hook");
});

test.afterAll(async () => {
  console.log("afterAll hook");
});

test.describe("Playwright Context Examples", () => {
  test("browser context configuration", async ({ browser }) => {
    const customCtx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "playwright-example",
    });
    const page = await customCtx.newPage();
    await page.goto("https://example.com");
    await expect(page).toHaveTitle(/Example Domain/);
    await customCtx.close();
  });

  test("device emulation", async ({ browser }) => {
    const mobileCtx = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const page = await mobileCtx.newPage();
    await page.goto("https://example.com");
    await mobileCtx.close();
  });

  test("authentication headers", async ({ browser }) => {
    const authCtx = await browser.newContext({
      extraHTTPHeaders: { Cookie: "session=abc123" },
    });
    const page = await authCtx.newPage();
    await page.goto("https://example.com/dashboard");
    await authCtx.close();
  });

  test("context reuse across pages", async ({ browser }) => {
    const shared = await browser.newContext();
    const p1 = await shared.newPage();
    const p2 = await shared.newPage();
    await p1.goto("https://example.com");
    await p2.goto("https://example.org");
    await shared.close();
  });
});

// standalone examples showing a couple of typical page checks

// illustrate creating several contexts within a single test body
test("multiple contexts in one test", async ({ browser }) => {
  const ctx1 = await browser.newContext();
  const page1 = await ctx1.newPage();
  await page1.goto("/", { waitUntil: "domcontentloaded" });
  // await expect(page1).toHaveTitle(/Welcome to Playwright/);

  const ctx2 = await browser.newContext({
    viewport: { width: 320, height: 480 },
  });
  const page2 = await ctx2.newPage();
  await page2.goto("https://example.com");
  // await expect(page2).toHaveTitle(/Example Domain/);

  await ctx1.close();
  await ctx2.close();
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
