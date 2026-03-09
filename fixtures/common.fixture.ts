import { test as base, expect, Page, request } from "@playwright/test";
import { APIManager } from "@src/api/APIManager.js";
import { Pages } from "@src/pages/index.js";
import { MockService } from "@src/utils/mock-service.js";
import { setupLoaderHandlersHook } from "hooks/handlers.setup.js";

interface IFixture {
  calculator: (a: number, b: number) => number;
  guestPages: Pages;
  nohandlerpage: Page;
  disableHandlers: boolean;
  mockService: MockService;
  apiManager: APIManager;
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
    await use(page);
  },

  mockService: async ({ page, baseURL }, use) => {
    const mockingService = new MockService(page, baseURL);

    await use(mockingService);

    if (mockingService.getRules().length > 0) {
      await mockingService.generateAndAttachReport();
    }
  },

  apiManager: async ({ baseURL }, use) => {
    const cookies = [
      {
        name: "isAutomationTestRun",
        value: "true",
        url: process.env.WEB_API,
        domain: new URL(baseURL).hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 36000,
        httpOnly: false,
        secure: true,
        sameSite: "Lax" as const,
      },
    ];

    const context = await request.newContext({
      baseURL: process.env.WEB_API,
      storageState: { cookies, origins: [] },
    });

    await use(new APIManager(context));
  },
});

export { expect };
