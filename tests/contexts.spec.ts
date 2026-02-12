import { expect, test } from "@fixtures/common.fixture.js";

await test.beforeEach(async ({}) => {
  console.log("Running before each...");
});

test.only("test calculator", async ({ calculator, context }) => {
  const context1 = await context.browser().newContext();
  const context2 = await context.browser().newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
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

test('Page title is correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Welcome to Playwright/);
});
