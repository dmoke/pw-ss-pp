import { test as base, expect } from "@playwright/test";
import { Pages } from "@src/pages/index.js";

interface IFixture {
  calculator: (a: number, b: number) => number;
  guestPages: Pages;
}

export const test = base.extend<IFixture>({
  calculator: async ({}, use) => {
    const sum = (a: number, b: number): number => a + b;

    console.log("Running before fixture use()");
    await use(sum);
    console.log("Running after fixture use()");
  },

  guestPages: async ({ page }, use) => {
    await use(new Pages(page));
  },
});

export { expect };
