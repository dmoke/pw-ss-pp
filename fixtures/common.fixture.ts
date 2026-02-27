import { test as base, expect, Page } from "@playwright/test";
import { Pages } from "@src/pages/index.js";
import { setupLoaderHandlersHook } from "hooks/handlers.setup.js";

interface IFixture {
  calculator: (a: number, b: number) => number;
  guestPages: Pages;
  nohandlerpage: Page;
  disableHandlers: boolean;
}

export const test = base.extend<IFixture>({
  disableHandlers: [false, { option: true }],

  calculator: async ({}, use) => {
    const sum = (a: number, b: number): number => a + b;

    console.log("Running before fixture use()");
    await use(sum);
    console.log("Running after fixture use()");
  },

  guestPages: async ({ page }, use) => {
    await use(new Pages(page));
  },

  page: async ({ page, disableHandlers }, use) => {
    if (!disableHandlers) {
      await setupLoaderHandlersHook(page);
    }
    await use(page);
  },

  nohandlerpage: async ({ page }, use) => {
    // explicit alias for page without handlers; behaves same as page but handler setup is skipped
    await use(page);
  },
});

export { expect };
